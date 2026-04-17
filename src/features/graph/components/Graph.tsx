// @ts-nocheck — react-force-graph-2d's recursive LinkObject / NodeObject generics fight our domain `Link`/`Book` types; avoiding hundreds of assertions or brittle duplicates of upstream props.
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import {
  setupKeyboardHandlers,
  setupMouseDragHandlers,
  setupWheelZoomHandlers,
  startPanZoomLoop,
  syncedZoomToFit,
  animateCameraToNode,
  isNavigationActive,
} from '../cameraControls'
import { drawNode, getNodePointerHitRadius, getNodeRadius, clearHoverAnim } from '../nodeObject'
import {
  FORCE_CHARGE_DIST_MAX,
  FORCE_COLLIDE_PADDING,
  chargeStrengthForNode,
  linkDistanceForType,
  linkStrengthForType,
} from '../layoutEngine'
import { useFlashAnimation } from '../hooks/useFlashAnimation'
import { useGraphLayout } from '../hooks/useGraphLayout'

import type { GraphData, Link, Book, Author, AuthorId } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { useGraphDerivedLinkState } from '../hooks/useGraphDerivedLinkState'
import { useAdjacencyIndex } from '../hooks/useAdjacencyIndex'
import { isNodeVisibleForFilters } from '../domain/nodeVisibility'
import { useGraphLinkCallbacks } from '../hooks/useGraphLinkCallbacks'
import { Minimap } from './Minimap'

function graphInstanceRefresh(fg: ForceGraphMethods | null | undefined) {
  if (!fg) return
  const fn = Reflect.get(fg, 'refresh')
  if (typeof fn === 'function') fn.call(fg)
}

const LINK_CANVAS_OBJECT_MODE = () => 'after' as const

function isBookOrAuthor(node: object | null | undefined): node is Book | Author {
  if (node == null || typeof node !== 'object') return false
  const t = Reflect.get(node, 'type')
  return t === 'book' || t === 'author'
}

type GraphNode = Book & { citedBy?: number }
type GraphLink = Link

type GraphProps = {
  graphData: GraphData
  authors: Author[]
  selectedNode: GraphNode | null
  selectedAuthorId: AuthorId | null
  peekNodeId: string | null
  activeFilter: string | null
  activeHighlight: Highlight | null
  hoveredFilter: string | null
  onNodeClick: (node: Book | Author) => void
  onLinkClick: (link: GraphLink) => void
  viewMode: string
  flashNodeIds: Set<string> | null
}

export type GraphImperativeHandle = {
  centerCamera: () => void
}

const Graph = forwardRef<GraphImperativeHandle, GraphProps>(function Graph(
  {
    graphData,
    authors,
    selectedNode,
    selectedAuthorId,
    peekNodeId,
    activeFilter,
    activeHighlight,
    hoveredFilter,
    onNodeClick,
    onLinkClick,
    viewMode,
    flashNodeIds,
  }: GraphProps,
  ref,
) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const camRef = useRef({ x: 0, y: 0, zoom: 0.7 })
  const hoveredNodeRef = useRef<GraphNode | null>(null)
  const didInitialFitRef = useRef(false)

  useImperativeHandle(ref, () => ({
    centerCamera() {
      syncedZoomToFit(fgRef.current, camRef, 1200, 80)
    },
  }))

  const keysRef = useRef<Set<string>>(new Set())
  const velRef = useRef({ moveX: 0, moveY: 0, zoom: 0 })
  const animFrameRef = useRef<number | null>(null)
  const wakeRef = useRef<(() => void) | null>(null)
  const selectedNodeRef = useRef(selectedNode)
  const draggingRef = useRef(false)

  // Viewport world-space bounds, recomputed once par frame dans `onRenderFramePre`.
  // Permet de culler les nœuds hors écran dans `nodeCanvasObject` et `nodePointerAreaPaint`.
  // `margin` couvre la taille max d'un nœud + overflow de label (~200 units world).
  const viewportRef = useRef({ minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity })

  // NB : historiquement on a tenté un pointer-driven refresh loop + autoPauseRedraw=true
  // pour économiser le CPU au repos. Mais le hover freezait après N interactions
  // (cause non identifiée, probablement une saturation interne de react-force-graph
  // quand `refresh()` est appelé très fréquemment). On est revenu à autoPauseRedraw=false
  // — le viewport culling (ajouté en parallèle) rend le coût du render 60 fps bien
  // plus faible : ~20 nœuds visibles × drawNode caché → négligeable.

  const { flashNodeIdsRef, flashAlphaRef } = useFlashAnimation({ flashNodeIds, fgRef })

  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  const resetToOverview = useCallback(() => {
    const fg = fgRef.current
    if (!fg) return
    syncedZoomToFit(fg, camRef, 900, 80)
    setTimeout(() => {
      camRef.current = { x: 0, y: 0, zoom: camRef.current.zoom }
    }, 950)
  }, [])

  useEffect(() => {
    const { cleanup, wake } = startPanZoomLoop({ fgRef, keysRef, velRef, animFrameRef, camRef })
    wakeRef.current = wake
    return () => { wakeRef.current = null; cleanup() }
  }, [])
  useEffect(() => setupMouseDragHandlers({ containerRef, velRef, hoveredNodeRef, wake: () => wakeRef.current?.() }), [])
  useEffect(() => setupWheelZoomHandlers({ containerRef, fgRef, velRef, camRef }), [])
  useEffect(() => clearHoverAnim, [])

  const {
    anchorIds, connectedLinks, connectedNodes,
    citationsByNodeId, linkWeights, degreeByNodeId,
    topDegreeNodeIds,
    bookCountByAuthorId, externalCitationsByBookId,
  } = useGraphDerivedLinkState({
    graphData,
    selectedAuthorId,
    peekNodeId,
    selectedNode,
  })

  useGraphLayout({
    fgRef, graphData, viewMode,
    degreeByNodeId, citationsByNodeId,
    bookCountByAuthorId, externalCitationsByBookId,
  })

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const focusId = selectedNode?.id || peekNodeId
    if (!focusId) return
    const liveNode = graphData.nodes?.find((n) => n.id === focusId)
    if (!liveNode) return
    const px = liveNode.fx ?? liveNode.x
    const py = liveNode.fy ?? liveNode.y
    if (typeof px !== 'number' || typeof py !== 'number') return
    return animateCameraToNode(fg, camRef, velRef, px, py)
  }, [selectedNode, peekNodeId, viewMode, graphData.nodes])

  const linksByNodeId = useAdjacencyIndex(graphData.links)

  // Links and neighbor nodes connected to hovered node (refs for perf — no re-render)
  const hoveredLinksRef = useRef(new Set<string>())
  const hoveredNeighborIdsRef = useRef(new Set<string>())
  const hoverGenRef = useRef(0)
  const updateHoveredLinks = useCallback((node) => {
    hoverGenRef.current++
    hoveredLinksRef.current.clear()
    hoveredNeighborIdsRef.current.clear()
    if (!node) return
    hoveredNeighborIdsRef.current.add(node.id)
    const entry = linksByNodeId.get(node.id)
    if (!entry) return
    for (const k of entry.linkKeys) hoveredLinksRef.current.add(k)
    for (const id of entry.neighborIds) hoveredNeighborIdsRef.current.add(id)
  }, [linksByNodeId])

  useEffect(() => setupKeyboardHandlers({
    keysRef,
    onSpace: resetToOverview,
    wake: () => wakeRef.current?.(),
    onNavigate: () => {
      if (hoveredNodeRef.current) {
        hoveredNodeRef.current = null
        updateHoveredLinks(null)
        graphInstanceRefresh(fgRef.current)
      }
    },
  }), [resetToOverview, updateHoveredLinks])

  // Filet de sécurité anti-légende coincée : quand le pointeur quitte le canvas
  // ou quand le nœud survolé disparaît des données (filtre timeline, refetch,
  // suppression), react-force-graph n'envoie pas toujours onNodeHover(null).
  // Résultat : `hoveredNodeRef` garde une référence périmée → `onRenderFramePost`
  // continue à dessiner sa légende à des coordonnées figées.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onLeave = () => {
      if (!hoveredNodeRef.current) return
      hoveredNodeRef.current = null
      updateHoveredLinks(null)
      graphInstanceRefresh(fgRef.current)
    }
    el.addEventListener('pointerleave', onLeave)
    return () => el.removeEventListener('pointerleave', onLeave)
  }, [updateHoveredLinks])


  // Resynchronise `hoveredNodeRef` avec les données courantes : si le nœud a
  // disparu → on le libère ; si c'est un autre objet (nouveau refetch avec
  // mêmes IDs), on re-pointe sur la référence live pour garder les bonnes x/y.
  useEffect(() => {
    const hovered = hoveredNodeRef.current
    if (!hovered) return
    const live = graphData.nodes.find((n) => n.id === hovered.id)
    if (!live) {
      hoveredNodeRef.current = null
      updateHoveredLinks(null)
      graphInstanceRefresh(fgRef.current)
    } else if (live !== hovered) {
      hoveredNodeRef.current = live
      graphInstanceRefresh(fgRef.current)
    }
  }, [graphData.nodes, updateHoveredLinks])

  const handleInit = useCallback((fg) => {
    // Les auteurs ont une répulsion plus forte pour créer des "systèmes stellaires" distincts
    fg
      .d3Force('charge')
      .strength((node) => chargeStrengthForNode(node, degreeByNodeId, citationsByNodeId))
      .distanceMax(FORCE_CHARGE_DIST_MAX)
    // Citations (livre→livre) : ressort plus long pour aérer ; auteur→livre reste compact.
    // Strength par type : auteur-livre fort (ancre les galaxies), citation modéré (tire les ponts).
    fg.d3Force('link')
      .distance((link) => linkDistanceForType(link, bookCountByAuthorId, citationsByNodeId))
      .strength((link) => linkStrengthForType(link, externalCitationsByBookId, citationsByNodeId))
    // Collision : alignée sur le *rayon visuel* du nœud pour éviter tout chevauchement
    // (les livres très cités peuvent atteindre 46px de rayon — cf. getNodeRadius).
    fg.d3Force('collide', forceCollide((node) => {
      const cit = citationsByNodeId.get(node.id) || 0
      return getNodeRadius(node, cit) + FORCE_COLLIDE_PADDING
    }))
    fg.centerAt(0, 0, 0)
    fg.zoom(0.7, 0)
    // Early zoomToFit once nodes have initial positions (after a short simulation warmup)
    setTimeout(() => {
      if (!didInitialFitRef.current) {
        didInitialFitRef.current = true
        syncedZoomToFit(fg, camRef, 1200, 80)
      }
    }, 800)
  }, [degreeByNodeId, citationsByNodeId, bookCountByAuthorId, externalCitationsByBookId])

  const isNodeVisible = useCallback(
    (node) => isNodeVisibleForFilters(node, activeFilter, activeHighlight, linksByNodeId),
    [activeFilter, activeHighlight, linksByNodeId]
  )

  const orderedGraphData = useMemo(() => {
    const nodes = graphData.nodes || []
    const focusId = peekNodeId || selectedNode?.id
    if (!focusId) return graphData
    const idx = nodes.findIndex((n) => n?.id === focusId)
    if (idx === -1) return graphData
    if (idx === nodes.length - 1) return graphData
    const nextNodes = nodes.slice()
    const [picked] = nextNodes.splice(idx, 1)
    nextNodes.push(picked)
    return { ...graphData, nodes: nextNodes }
  }, [graphData, selectedNode, peekNodeId])

  // Recalcule les bounds visibles en world-space une fois par frame.
  // `ctx.getTransform()` donne la matrice pan+zoom appliquée par ForceGraph2D ;
  // on inverse pour retrouver les coords world des 4 coins du canvas.
  const onRenderFramePre = useCallback((ctx, globalScale) => {
    const canvas = ctx.canvas
    const t = ctx.getTransform()
    const invA = 1 / t.a
    const invD = 1 / t.d
    const worldLeft = -t.e * invA
    const worldTop = -t.f * invD
    const worldRight = (canvas.width - t.e) * invA
    const worldBottom = (canvas.height - t.f) * invD
    // Marge = rayon max d'un nœud (~46) + overflow de label. 200 world units =
    // assez pour éviter les pop-ins sur les bords pendant un pan rapide.
    const margin = 200 / Math.max(globalScale, 0.1)
    viewportRef.current = {
      minX: worldLeft - margin,
      minY: worldTop - margin,
      maxX: worldRight + margin,
      maxY: worldBottom + margin,
    }
  }, [])

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const vp = viewportRef.current
      const x = node?.x, y = node?.y
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      if (x < vp.minX || x > vp.maxX || y < vp.minY || y > vp.maxY) return
      drawNode(node, ctx, globalScale, {
        selectedNode,
        selectedAuthorId,
        peekNodeId,
        authors,
        hoveredNode: hoveredNodeRef.current,
        hoveredNeighborIds: hoveredNeighborIdsRef.current,
        connectedNodes,
        isNodeVisible,
        hoveredFilter,
        citationCount: citationsByNodeId.get(node.id) || 0,
        isIsolated: node.type !== 'author' && (degreeByNodeId.get(node.id) ?? 0) === 0,
        topDegreeNodeIds,
        skipLabel: hoveredNodeRef.current?.id === node.id,
      })
      // Flash ring for newly imported nodes
      if (flashNodeIdsRef.current.has(node.id) && Number.isFinite(node.x) && Number.isFinite(node.y)) {
        const alpha = flashAlphaRef.current
        const r = getNodeRadius(node, citationsByNodeId.get(node.id) || 0)
        const expansion = (1 - alpha) * 10
        ctx.save()
        ctx.beginPath()
        ctx.arc(node.x, node.y, r + 3 + expansion, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,255,135,${alpha * 0.85})`
        ctx.lineWidth = 1.5 / globalScale
        ctx.stroke()
        ctx.restore()
      }
    },
    [selectedNode, selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId, degreeByNodeId, topDegreeNodeIds]
  )

  const nodePointerAreaPaint = useCallback(
    (node, color, ctx, globalScale) => {
      const r = getNodePointerHitRadius(
        node,
        citationsByNodeId.get(node.id) || 0,
        globalScale,
      )
      if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y) || !Number.isFinite(r) || r <= 0) return
      // Cull : pas besoin de peindre la hit-zone des nœuds hors viewport —
      // la souris ne peut pas les atteindre de toute façon.
      const vp = viewportRef.current
      if (node.x < vp.minX || node.x > vp.maxX || node.y < vp.minY || node.y > vp.maxY) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
      ctx.fill()
    },
    [citationsByNodeId]
  )

  const hasSelection = Boolean(anchorIds)

  const {
    linkColor,
    linkWidth,
    linkCanvasObject,
    arrowColor,
    linkDirectionalArrowLength,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleColor,
  } = useGraphLinkCallbacks({
    hasSelection,
    activeFilter,
    activeHighlight,
    connectedLinks,
    linkWeights,
    hoveredNodeRef,
    hoveredLinksRef,
    hoverGenRef,
  })

  // Auto-recadrage supprimé : seul `handleInit` déclenche un fit initial à
  // 800ms post engine-init. Aucun fit automatique ne peut survenir ensuite,
  // même si la simulation se stabilise tardivement ou redémarre. L'utilisateur
  // peut toujours recadrer manuellement via Espace ou `centerCamera()`.

  const onRenderFramePost = useCallback(
    (ctx, globalScale) => {
      // Redraw hovered node label on top of everything
      // (selected/peek node body is already drawn last via orderedGraphData)
      const hovered = hoveredNodeRef.current
      if (hovered && Number.isFinite(hovered.x) && Number.isFinite(hovered.y)) {
        drawNode(hovered, ctx, globalScale, {
          selectedNode: selectedNodeRef.current,
          selectedAuthorId,
          peekNodeId,
          authors,
          hoveredNode: hoveredNodeRef.current,
          hoveredNeighborIds: hoveredNeighborIdsRef.current,
          connectedNodes,
          isNodeVisible,
          hoveredFilter,
          citationCount: citationsByNodeId.get(hovered.id) || 0,
          isIsolated: hovered.type !== 'author' && (degreeByNodeId.get(hovered.id) ?? 0) === 0,
          topDegreeNodeIds,
          labelOnly: true,
        })
      }
    },
    [selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId, degreeByNodeId, topDegreeNodeIds]
  )

  const graphA11yLabel = `Constellation interactive : ${graphData.nodes.length} œuvres reliées par ${graphData.links.length} citations. Une alternative tabulaire est disponible dans l'onglet Ouvrages.`

  const backgroundColor = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--color-bg-base').trim(),
    [],
  )

  // Stabilisé pour que <Minimap memo()> ne re-render pas à chaque parent render.
  const handleMinimapEnter = useCallback(() => {
    // When the pointer enters the minimap, release any hover state on
    // the main graph — otherwise the last hovered node keeps its label
    // and highlight because pointerleave on the container never fires
    // (the minimap is a child of containerRef).
    if (!hoveredNodeRef.current) return
    hoveredNodeRef.current = null
    updateHoveredLinks(null)
    graphInstanceRefresh(fgRef.current)
  }, [updateHoveredLinks])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={graphA11yLabel}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={orderedGraphData}
        enablePanInteraction={false}
        enableZoomInteraction={false}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeHover={(node) => {
          // Pendant un drag, on verrouille le highlight sur le nœud draggé :
          // le curseur peut déraper hors du nœud et déclencher onNodeHover(null),
          // ce qui éteindrait les liens — pas le comportement voulu.
          if (draggingRef.current) return
          // Suppress hover while navigating with keyboard — the cursor stays
          // in place and nodes drift under it, causing unwanted hover triggers
          const navigating = isNavigationActive(keysRef.current)
          const effective = !navigating && isBookOrAuthor(node) ? node : null
          hoveredNodeRef.current = effective
          updateHoveredLinks(effective)
          graphInstanceRefresh(fgRef.current)
        }}
        onNodeDrag={(node) => {
          if (!isBookOrAuthor(node)) return
          // Évite le travail répété : `onNodeDrag` est appelé à chaque frame.
          if (draggingRef.current && hoveredNodeRef.current?.id === node.id) return
          draggingRef.current = true
          hoveredNodeRef.current = node
          updateHoveredLinks(node)
          graphInstanceRefresh(fgRef.current)
        }}
        onNodeDragEnd={() => {
          draggingRef.current = false
        }}
        onNodeClick={(node) => {
          if (isBookOrAuthor(node)) onNodeClick(node)
        }}
        onLinkClick={onLinkClick}
        linkCanvasObjectMode={LINK_CANVAS_OBJECT_MODE}
        linkCanvasObject={linkCanvasObject}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkCurvature={0.15}
        linkDirectionalArrowLength={linkDirectionalArrowLength}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={linkDirectionalParticleColor}
        backgroundColor={backgroundColor}
        cooldownTime={3000}
        warmupTicks={30}
        d3AlphaMin={0.02}
        autoPauseRedraw={false}
        onEngineStop={() => { if (import.meta.env.DEV) console.debug('[graph] d3 engine stopped') }}
        onEngineInit={handleInit}
        onRenderFramePre={onRenderFramePre}
        onRenderFramePost={onRenderFramePost}
      />
      <Minimap
        graphData={graphData}
        fgRef={fgRef}
        camRef={camRef}
        containerRef={containerRef}
        onEnter={handleMinimapEnter}
      />
    </div>
  )
})


const MemoGraph = memo(Graph)
export { MemoGraph as Graph }

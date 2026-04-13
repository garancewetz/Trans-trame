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
import { normalizeEndpointId } from '../domain/graphDataModel'
import { useGraphDerivedLinkState } from '../hooks/useGraphDerivedLinkState'
import { linkKeyOf } from '../domain/linkStyle'
import { useGraphLinkCallbacks } from '../hooks/useGraphLinkCallbacks'

function graphInstanceRefresh(fg: ForceGraphMethods | null | undefined) {
  if (!fg) return
  const fn = Reflect.get(fg, 'refresh')
  if (typeof fn === 'function') fn.call(fg)
}

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

  const { anchorIds, connectedLinks, connectedNodes, citationsByNodeId, linkWeights, degreeByNodeId } = useGraphDerivedLinkState({
    graphData,
    selectedAuthorId,
    peekNodeId,
    selectedNode,
  })

  useGraphLayout({ fgRef, camRef, graphData, viewMode, degreeByNodeId, citationsByNodeId })

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

  // Pre-computed adjacency index: O(degree) hover lookups instead of O(links)
  const linksByNodeId = useMemo(() => {
    const map = new Map<string, { linkKeys: string[]; neighborIds: string[] }>()
    const ensure = (id: string) => {
      let entry = map.get(id)
      if (!entry) { entry = { linkKeys: [], neighborIds: [] }; map.set(id, entry) }
      return entry
    }
    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      const key = linkKeyOf(srcId, tgtId)
      ensure(srcId).linkKeys.push(key)
      ensure(srcId).neighborIds.push(tgtId)
      ensure(tgtId).linkKeys.push(key)
      ensure(tgtId).neighborIds.push(srcId)
    })
    return map
  }, [graphData.links])

  // Links and neighbor nodes connected to hovered node (refs for perf — no re-render)
  const hoveredLinksRef = useRef(new Set<string>())
  const hoveredNeighborIdsRef = useRef(new Set<string>())
  const updateHoveredLinks = useCallback((node) => {
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

  const handleInit = useCallback((fg) => {
    // Les auteurs ont une répulsion plus forte pour créer des "systèmes stellaires" distincts
    fg
      .d3Force('charge')
      .strength((node) => chargeStrengthForNode(node, degreeByNodeId))
      .distanceMax(FORCE_CHARGE_DIST_MAX)
    // Citations (livre→livre) : ressort plus long pour aérer ; auteur→livre reste compact.
    // Strength par type : auteur-livre fort (ancre les galaxies), citation modéré (tire les ponts).
    fg.d3Force('link')
      .distance(linkDistanceForType)
      .strength(linkStrengthForType)
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
  }, [degreeByNodeId, citationsByNodeId])

  const isNodeVisible = useCallback(
    (node) => {
      if (activeHighlight) {
        switch (activeHighlight.kind) {
          case 'decade': {
            if (node.type === 'author') return true
            const y = node.year
            return y != null && Math.floor(y / 10) * 10 === activeHighlight.decade
          }
          case 'book': {
            if (node.id === activeHighlight.bookId) return true
            const entry = linksByNodeId.get(activeHighlight.bookId)
            return entry?.neighborIds.includes(node.id) ?? false
          }
          case 'author': {
            if (node.type === 'author') return node.id === activeHighlight.authorId
            return (node.authorIds || []).includes(activeHighlight.authorId)
          }
        }
      }
      if (!activeFilter) return true
      if (node.type === 'author') return true
      return (node.axes || []).includes(activeFilter)
    },
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

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
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
    [selectedNode, selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId]
  )

  const nodePointerAreaPaint = useCallback(
    (node, color, ctx, globalScale) => {
      const r = getNodePointerHitRadius(
        node,
        citationsByNodeId.get(node.id) || 0,
        globalScale,
      )
      if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y) || !Number.isFinite(r) || r <= 0) return
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
  })

  // Auto recadrage (vue d'ensemble) : au chargement / changement de vue,
  // s'assurer que le graphe "tient" dans l'écran pour voir plus de connexions d'un coup d'œil.
  useEffect(() => {
    didInitialFitRef.current = false
  }, [viewMode, graphData.nodes.length, graphData.links.length])

  const maybeZoomToFitOverview = useCallback(
    (duration = 900) => {
      const fg = fgRef.current
      if (!fg) return
      if (hasSelection) return
      if (activeFilter) return
      if (didInitialFitRef.current) return
      didInitialFitRef.current = true
      syncedZoomToFit(fg, camRef, duration, 80)
    },
    [hasSelection, activeFilter],
  )

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
          labelOnly: true,
        })
      }
    },
    [selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId]
  )

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={orderedGraphData}
        enablePanInteraction={false}
        enableZoomInteraction={false}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeHover={(node) => {
          // Suppress hover while navigating with keyboard — the cursor stays
          // in place and nodes drift under it, causing unwanted hover triggers
          const navigating = isNavigationActive(keysRef.current)
          const effective = !navigating && isBookOrAuthor(node) ? node : null
          hoveredNodeRef.current = effective
          updateHoveredLinks(effective)
          graphInstanceRefresh(fgRef.current)
        }}
        onNodeClick={(node) => {
          if (isBookOrAuthor(node)) onNodeClick(node)
        }}
        onLinkClick={onLinkClick}
        linkCanvasObjectMode={() => 'after'}
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
        backgroundColor={getComputedStyle(document.documentElement).getPropertyValue('--color-bg-base').trim()}
        onEngineInit={handleInit}
        onEngineStop={() => {
          // Le recadrage est plus fiable une fois la simulation stabilisée.
          maybeZoomToFitOverview(900)
        }}
        onRenderFramePost={onRenderFramePost}
      />
    </div>
  )
})


const MemoGraph = memo(Graph)
export { MemoGraph as Graph }

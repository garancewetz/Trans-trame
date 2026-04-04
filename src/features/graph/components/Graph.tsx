// @ts-nocheck — react-force-graph-2d's recursive LinkObject / NodeObject generics fight our domain `Link`/`Book` types; avoiding hundreds of assertions or brittle duplicates of upstream props.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import { drawStarField } from '../scene'
import {
  setupKeyboardHandlers,
  setupMouseDragHandlers,
  setupWheelZoomHandlers,
  startPanZoomLoop,
  syncedZoomToFit,
  animateCameraToNode,
} from '../cameraControls'
import { drawNode, getNodePointerHitRadius, getNodeRadius, clearHoverAnim } from '../nodeObject'
import { drawGenealogyOverlay } from '../axisLabels'
import {
  FORCE_CHARGE_DIST_MAX,
  FORCE_LINK_DIST_AUTHOR_BOOK,
  FORCE_LINK_DIST_CITATION,
  FORCE_COLLIDE_RADIUS,
  chargeStrengthForNode,
} from '../layoutEngine'
import { useFlashAnimation } from '../hooks/useFlashAnimation'
import { useGraphLayout } from '../hooks/useGraphLayout'

import type { GraphData, Link, Book, Author, AuthorId } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'
import { useGraphDerivedLinkState } from '../hooks/useGraphDerivedLinkState'
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

const SHOW_STARFIELD = false

type GraphNode = Book & { citedBy?: number }
type GraphLink = Link

type GraphProps = {
  graphData: GraphData
  authors: Author[]
  selectedNode: GraphNode | null
  selectedAuthorId: AuthorId | null
  peekNodeId: string | null
  activeFilter: string | null
  hoveredFilter: string | null
  onNodeClick: (node: Book | Author) => void
  onLinkClick: (link: GraphLink) => void
  layoutPositions: Map<string, { fx: number; fy: number }> | null | undefined
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
    hoveredFilter,
    onNodeClick,
    onLinkClick,
    layoutPositions,
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

  useEffect(() => setupKeyboardHandlers({ keysRef, onSpace: resetToOverview }), [resetToOverview])
  useEffect(() => setupMouseDragHandlers({ containerRef, velRef, hoveredNodeRef }), [])
  useEffect(() => setupWheelZoomHandlers({ containerRef, fgRef, velRef, camRef }), [])
  useEffect(() => startPanZoomLoop({ fgRef, keysRef, velRef, animFrameRef, camRef }), [])
  useEffect(() => clearHoverAnim, [])

  const { anchorIds, connectedLinks, connectedNodes, citationsByNodeId, linkWeights, degreeByNodeId } = useGraphDerivedLinkState({
    graphData,
    selectedAuthorId,
    peekNodeId,
    selectedNode,
  })

  useGraphLayout({ fgRef, camRef, graphData, layoutPositions, viewMode, degreeByNodeId })

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

  // Links and neighbor nodes connected to hovered node (refs for perf — no re-render)
  const hoveredLinksRef = useRef(new Set<string>())
  const hoveredNeighborIdsRef = useRef(new Set<string>())
  const updateHoveredLinks = useCallback((node) => {
    hoveredLinksRef.current.clear()
    hoveredNeighborIdsRef.current.clear()
    if (!node) return
    hoveredNeighborIdsRef.current.add(node.id)
    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      if (srcId === node.id || tgtId === node.id) {
        hoveredLinksRef.current.add(`${srcId}-${tgtId}`)
        hoveredNeighborIdsRef.current.add(srcId === node.id ? tgtId : srcId)
      }
    })
  }, [graphData.links])

  const handleInit = useCallback((fg) => {
    // Les auteurs ont une répulsion plus forte pour créer des "systèmes stellaires" distincts
    fg
      .d3Force('charge')
      .strength((node) => chargeStrengthForNode(node, degreeByNodeId))
      .distanceMax(FORCE_CHARGE_DIST_MAX)
    // Citations (livre→livre) : ressort plus long pour aérer ; auteur→livre reste compact
    fg.d3Force('link').distance((link) =>
      link.type === 'author-book' ? FORCE_LINK_DIST_AUTHOR_BOOK : FORCE_LINK_DIST_CITATION
    )
    // Collision force — prevent node overlap
    fg.d3Force('collide', forceCollide((node) => {
      const degree = degreeByNodeId.get(node.id) || 0
      return FORCE_COLLIDE_RADIUS + Math.sqrt(degree) * 4
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
  }, [degreeByNodeId])

  const isNodeVisible = useCallback(
    (node) => {
      if (!activeFilter) return true
      return (node.axes || []).includes(activeFilter)
    },
    [activeFilter]
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
        degree: degreeByNodeId.get(node.id) || 0,
        skipLabel: hoveredNodeRef.current?.id === node.id,
      })
      // Flash ring for newly imported nodes
      if (flashNodeIdsRef.current.has(node.id) && Number.isFinite(node.x) && Number.isFinite(node.y)) {
        const alpha = flashAlphaRef.current
        const r = getNodeRadius(node, citationsByNodeId.get(node.id) || 0, degreeByNodeId.get(node.id) || 0)
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
    [selectedNode, selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId, degreeByNodeId]
  )

  const nodePointerAreaPaint = useCallback(
    (node, color, ctx, globalScale) => {
      const r = getNodePointerHitRadius(
        node,
        citationsByNodeId.get(node.id) || 0,
        degreeByNodeId.get(node.id) || 0,
        globalScale,
      )
      if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y) || !Number.isFinite(r) || r <= 0) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
      ctx.fill()
    },
    [citationsByNodeId, degreeByNodeId]
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
    viewMode,
    anchorIds,
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

  const onRenderFramePre = useCallback(
    (ctx, globalScale) => {
      if (SHOW_STARFIELD) drawStarField(ctx, globalScale)
    },
    []
  )

  const onRenderFramePost = useCallback(
    (ctx, globalScale) => {
      const baseOpts = {
        selectedNode: selectedNodeRef.current,
        selectedAuthorId,
        peekNodeId,
        authors,
        hoveredNode: hoveredNodeRef.current,
        hoveredNeighborIds: hoveredNeighborIdsRef.current,
        connectedNodes,
        isNodeVisible,
        hoveredFilter,
      }
      // Redraw selected/peek node on top — always resolve from graphData.nodes
      // to use the live force-graph object (with current x/y), not a stale selectedNode copy.
      const topId = selectedNodeRef.current?.id || peekNodeId
      const topNode = topId ? graphData.nodes?.find((n) => n.id === topId) : null
      if (topNode) {
        drawNode(topNode, ctx, globalScale, { ...baseOpts, citationCount: citationsByNodeId.get(topNode.id) || 0, degree: degreeByNodeId.get(topNode.id) || 0 })
      }
      // Redraw hovered node label on top of everything
      const hovered = hoveredNodeRef.current
      if (hovered && Number.isFinite(hovered.x) && Number.isFinite(hovered.y)) {
        drawNode(hovered, ctx, globalScale, { ...baseOpts, citationCount: citationsByNodeId.get(hovered.id) || 0, degree: degreeByNodeId.get(hovered.id) || 0, labelOnly: true })
      }
    },
    [selectedAuthorId, peekNodeId, authors, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId, degreeByNodeId, graphData.nodes]
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
          hoveredNodeRef.current = isBookOrAuthor(node) ? node : null
          updateHoveredLinks(isBookOrAuthor(node) ? node : null)
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
        onRenderFramePre={onRenderFramePre}
        onRenderFramePost={onRenderFramePost}
      />
    </div>
  )
})


export { Graph }

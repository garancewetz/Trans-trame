// @ts-nocheck — react-force-graph-2d’s recursive LinkObject / NodeObject generics fight our domain `Link`/`Book` types; avoiding hundreds of assertions or brittle duplicates of upstream props.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import { KeyboardHints } from '@/common/components/ui/KeyboardHints'
import { drawStarField } from '../scene'
import {
  setupKeyboardHandlers,
  setupMouseDragHandlers,
  setupWheelZoomHandlers,
  startPanZoomLoop,
} from '../cameraControls'
import { drawNode, getNodeRadius } from '../nodeObject'
import { drawGenealogyOverlay } from '../axisLabels'

import type { GraphData, Link, Book, Author, AuthorId } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'
import { useGraphDerivedLinkState } from '../hooks/useGraphDerivedLinkState'
import { useGraphLinkCallbacks } from '../hooks/useGraphLinkCallbacks'

function graphInstanceRefresh(fg: ForceGraphMethods | null | undefined) {
  if (!fg) return
  const fn = Reflect.get(fg, 'refresh')
  if (typeof fn === 'function') fn.call(fg)
}

/** zoomToFit wrapper that syncs camRef after the animation completes. */
function syncedZoomToFit(
  fg: ForceGraphMethods | null | undefined,
  camRef: React.MutableRefObject<{ x: number; y: number; zoom: number }>,
  duration: number,
  padding: number,
) {
  if (!fg?.zoomToFit) return
  fg.zoomToFit(duration, padding)
  // After the animation finishes, read the real zoom/center back into camRef
  setTimeout(() => {
    const z = Reflect.get(fg, 'zoom') as (() => number) | undefined
    const zoom = typeof z === 'function' ? z.call(fg) : undefined
    if (typeof zoom === 'number' && Number.isFinite(zoom)) camRef.current.zoom = zoom
  }, duration + 50)
}

function isBookOrAuthor(node: object | null | undefined): node is Book | Author {
  if (node == null || typeof node !== 'object') return false
  const t = Reflect.get(node, 'type')
  return t === 'book' || t === 'author'
}

const SHOW_STARFIELD = false
/** Zoom appliqué au centrage sur un nœud sélectionné (plus bas = moins rapproché). */
const NODE_FOCUS_ZOOM = 1.9

/** Paramètres force-directed (vue constellation) : aéré pour éviter l’effet spaghetti. */
const FORCE_CHARGE_AUTHOR = -1800
const FORCE_CHARGE_BOOK = -1200
const FORCE_CHARGE_DIST_MAX = 1400
const FORCE_LINK_DIST_AUTHOR_BOOK = 100
const FORCE_LINK_DIST_CITATION = 280
const FORCE_GENEALOGY_LINK_AUTHOR_BOOK = 52
const FORCE_GENEALOGY_LINK_CITATION = 128
const FORCE_X_YEAR_SPREAD = 980
const FORCE_Y_CENTER_STRENGTH = 0.095
const FORCE_COLLIDE_RADIUS = 25

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

  // Flash animation for newly imported nodes
  const flashNodeIdsRef = useRef(new Set<string>())
  const flashAlphaRef = useRef(0)
  const flashRafRef = useRef<number | null>(null)

  useEffect(() => {
    flashNodeIdsRef.current = new Set(flashNodeIds || [])
    if (!flashNodeIds?.size) return

    const startTime = Date.now()
    const DURATION = 3500

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      flashAlphaRef.current = 1 - progress
      graphInstanceRefresh(fgRef.current)
      if (progress < 1) {
        flashRafRef.current = requestAnimationFrame(tick)
      } else {
        flashNodeIdsRef.current = new Set()
      }
    }
    if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current)
    flashRafRef.current = requestAnimationFrame(tick)
    return () => { if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current) }
  }, [flashNodeIds])

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

  const { anchorIds, connectedLinks, connectedNodes, citationsByNodeId, linkWeights, degreeByNodeId } = useGraphDerivedLinkState({
    graphData,
    selectedAuthorId,
    peekNodeId,
    selectedNode,
  })

  // Apply layout positions when view mode changes
  const prevViewRef = useRef(viewMode)
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    const timer = setTimeout(() => {
      if (layoutPositions) {
        graphData.nodes.forEach((node) => {
          const pos = layoutPositions.get(node.id)
          if (pos) {
            node.fx = pos.fx
            node.fy = pos.fy
          }
        })
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-30)
        const link = fg.d3Force('link')
        if (link) {
          link.distance((l) =>
            l.type === 'author-book' ? FORCE_GENEALOGY_LINK_AUTHOR_BOOK : FORCE_GENEALOGY_LINK_CITATION
          )
        }

        // Fit all nodes in view after layout positions are applied
        syncedZoomToFit(fg, camRef, 1200, 80)
      } else {
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
        })
        const charge = fg.d3Force('charge')
        if (charge) {
          charge
            .strength((node) => (node.type === 'author' ? FORCE_CHARGE_AUTHOR : FORCE_CHARGE_BOOK))
            .distanceMax(FORCE_CHARGE_DIST_MAX)
        }
        const link = fg.d3Force('link')
        if (link) {
          link.distance((l) =>
            l.type === 'author-book' ? FORCE_LINK_DIST_AUTHOR_BOOK : FORCE_LINK_DIST_CITATION
          )
        }

        // Constellation "horizontale" : compresser Y et étaler X (chronologie approximative)
        // sans figer les positions (on garde la dynamique d3-force).
        const years = graphData.nodes.map((n) => n.year).filter((y): y is number => typeof y === 'number')
        const minYear = years.length ? Math.min(...years) : 1800
        const maxYear = years.length ? Math.max(...years) : 2025
        const midYear = (minYear + maxYear) / 2
        const span = Math.max(1, maxYear - minYear)

        const forceX = fg.d3Force('x')
        if (forceX) {
          const strengthFn = Reflect.get(forceX, 'strength')
          if (typeof strengthFn === 'function') {
            // Isolated nodes (no edges) get a strong X pull so they don't drift far
            strengthFn.call(forceX, (node: GraphNode) => {
              const deg = degreeByNodeId.get(node.id) || 0
              return deg === 0 ? 0.35 : 0.06
            })
          }
          const xFn = Reflect.get(forceX, 'x')
          if (typeof xFn === 'function') {
            xFn.call(forceX, (node: GraphNode) => {
              const y = typeof node?.year === 'number' ? node.year : null
              if (!y) return 0
              const t = (y - midYear) / span
              return t * FORCE_X_YEAR_SPREAD
            })
          }
        }

        const forceY = fg.d3Force('y')
        if (forceY) {
          const strengthFn = Reflect.get(forceY, 'strength')
          if (typeof strengthFn === 'function') {
            // Isolated nodes get a stronger Y pull toward center
            strengthFn.call(forceY, (node: GraphNode) => {
              const deg = degreeByNodeId.get(node.id) || 0
              return deg === 0 ? 0.4 : FORCE_Y_CENTER_STRENGTH
            })
          }
          const yFn = Reflect.get(forceY, 'y')
          if (typeof yFn === 'function') yFn.call(forceY, 0)
        }

        fg.d3ReheatSimulation()
        // Fit to view after simulation settles a bit
        setTimeout(() => { syncedZoomToFit(fg, camRef, 1200, 80) }, 800)
      }
      prevViewRef.current = viewMode
    }, 100)

    return () => clearTimeout(timer)
  }, [layoutPositions, viewMode, graphData.nodes, degreeByNodeId])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const focusId = selectedNode?.id || peekNodeId
    if (!focusId) return
    // Always resolve the live force-graph node object (has up-to-date x/y from d3)
    const liveNode = graphData.nodes?.find((n) => n.id === focusId)
    if (!liveNode) return
    const px = liveNode.fx ?? liveNode.x
    const py = liveNode.fy ?? liveNode.y
    if (typeof px !== 'number' || typeof py !== 'number') return
    // Kill any residual pan/zoom velocity so the loop doesn't fight the centering
    velRef.current = { moveX: 0, moveY: 0, zoom: 0 }
    // Animate centering via RAF + instant centerAt(0) to stay in sync with the
    // custom camera system (d3 transitions can conflict with the panZoomLoop).
    const targetX = px
    const targetY = py
    const startX = camRef.current.x
    const startY = camRef.current.y
    const startZoom = camRef.current.zoom
    const fgRef_ = fg
    const t0 = performance.now()
    const DURATION = 800
    let rafId: number
    function step(now: number) {
      const t = Math.min((now - t0) / DURATION, 1)
      const ease = t < 1 ? t * (2 - t) : 1 // ease-out quad
      camRef.current.x = startX + (targetX - startX) * ease
      camRef.current.y = startY + (targetY - startY) * ease
      camRef.current.zoom = startZoom + (NODE_FOCUS_ZOOM - startZoom) * ease
      fgRef_.centerAt(camRef.current.x, camRef.current.y, 0)
      fgRef_.zoom(camRef.current.zoom, 0)
      if (t < 1) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
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
      .strength((node) => (node.type === 'author' ? FORCE_CHARGE_AUTHOR : FORCE_CHARGE_BOOK))
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
    (node, color, ctx) => {
      const r = getNodeRadius(node, citationsByNodeId.get(node.id) || 0, degreeByNodeId.get(node.id) || 0)
      if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y) || !Number.isFinite(r) || r <= 0) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2)
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
      if (viewMode === 'genealogy') {
        drawGenealogyOverlay(ctx, globalScale)
      }
    },
    [viewMode]
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
        linkCurvature={(link) => {
          if (viewMode !== 'genealogy') return 0.15
          const sx = link.source?.fx ?? link.source?.x ?? 0
          const tx = link.target?.fx ?? link.target?.x ?? 0
          const dist = Math.abs(tx - sx)
          return Math.min(0.55 + dist / 700, 1.4)
        }}
        linkDirectionalArrowLength={linkDirectionalArrowLength}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={linkDirectionalParticleColor}
        backgroundColor="#06030f"
        onEngineInit={handleInit}
        onEngineStop={() => {
          // Le recadrage est plus fiable une fois la simulation stabilisée.
          maybeZoomToFitOverview(900)
        }}
        onRenderFramePre={onRenderFramePre}
        onRenderFramePost={onRenderFramePost}
      />
      <KeyboardHints />
    </div>
  )
})


export { Graph }

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import KeyboardHints from '../ui/KeyboardHints'
import { drawStarField } from './scene'
import {
  setupKeyboardHandlers,
  setupMouseDragHandlers,
  setupWheelZoomHandlers,
  startPanZoomLoop,
} from './cameraControls'
import { drawNode, getNodeRadius } from './nodeObject'
import { drawGenealogyOverlay } from './axisLabels'

const SHOW_STARFIELD = false

const Graph = forwardRef(function Graph({
  graphData,
  selectedNode,
  activeFilter,
  hoveredFilter,
  onNodeClick,
  onLinkClick,
  layoutPositions,
  viewMode,
}, ref) {
  const fgRef = useRef()
  const containerRef = useRef(null)
  const camRef = useRef({ x: 0, y: 0, zoom: 0.7 })
  const hoveredNodeRef = useRef(null)

  useImperativeHandle(ref, () => ({
    centerCamera() {
      const fg = fgRef.current
      if (!fg) return
      camRef.current = { x: 0, y: 0, zoom: 0.7 }
      fg.centerAt(0, 0, 1200)
      fg.zoom(0.7, 1200)
    },
  }))

  const keysRef = useRef(new Set())
  const velRef = useRef({ moveX: 0, moveY: 0, zoom: 0 })
  const animFrameRef = useRef()
  const selectedNodeRef = useRef(selectedNode)

  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  useEffect(() => setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef }), [])
  useEffect(() => setupMouseDragHandlers({ containerRef, velRef }), [])
  useEffect(() => setupWheelZoomHandlers({ containerRef, fgRef, velRef, camRef }), [])
  useEffect(() => startPanZoomLoop({ fgRef, keysRef, velRef, animFrameRef, camRef }), [])

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
        if (link) link.distance(80)

        const radiusSource = [...layoutPositions.values()]
        const maxR = Math.max(...radiusSource.map((p) => Math.hypot(p.fx ?? 0, p.fy ?? 0)), 300)
        const zoom = 400 / maxR
        camRef.current = { x: 0, y: 0, zoom }
        fg.centerAt(0, 0, 1200)
        fg.zoom(zoom, 1200)
      } else {
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
        })
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-250).distanceMax(500)
        const link = fg.d3Force('link')
        if (link) link.distance(100)

        fg.d3ReheatSimulation()
        camRef.current = { x: 0, y: 0, zoom: 0.7 }
        fg.centerAt(0, 0, 1200)
        fg.zoom(0.7, 1200)
      }
      prevViewRef.current = viewMode
    }, 100)

    return () => clearTimeout(timer)
  }, [layoutPositions, viewMode, graphData.nodes])

  useEffect(() => {
    if (!selectedNode || !fgRef.current) return
    const fx = selectedNode.fx ?? selectedNode.x
    const fy = selectedNode.fy ?? selectedNode.y
    if (fx == null) return
    camRef.current = { x: fx, y: fy, zoom: 2.8 }
    fgRef.current.centerAt(fx, fy, 1200)
    fgRef.current.zoom(2.8, 1200)
  }, [selectedNode, viewMode])

  const connectedLinks = useMemo(() => {
    if (!selectedNode) return new Set()
    const set = new Set()
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (srcId === selectedNode.id || tgtId === selectedNode.id) set.add(`${srcId}-${tgtId}`)
    })
    return set
  }, [selectedNode, graphData.links])

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return new Set()
    const set = new Set([selectedNode.id])
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (srcId === selectedNode.id) set.add(tgtId)
      if (tgtId === selectedNode.id) set.add(srcId)
    })
    return set
  }, [selectedNode, graphData.links])

  const citationsByNodeId = useMemo(() => {
    const counts = new Map()
    graphData.links.forEach((link) => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      if (!targetId) return
      counts.set(targetId, (counts.get(targetId) || 0) + 1)
    })
    return counts
  }, [graphData.links])

  const handleInit = useCallback((fg) => {
    fg.d3Force('charge').strength(-250).distanceMax(500)
    fg.d3Force('link').distance(100)
    fg.centerAt(0, 0, 0)
    fg.zoom(0.7, 0)
  }, [])

  const isNodeVisible = useCallback(
    (node) => {
      if (!activeFilter) return true
      return (node.axes || []).includes(activeFilter)
    },
    [activeFilter]
  )

  const orderedGraphData = useMemo(() => {
    const nodes = graphData.nodes || []
    if (!selectedNode?.id) return graphData
    const idx = nodes.findIndex((n) => n?.id === selectedNode.id)
    if (idx === -1) return graphData
    if (idx === nodes.length - 1) return graphData
    const nextNodes = nodes.slice()
    const [picked] = nextNodes.splice(idx, 1)
    nextNodes.push(picked)
    return { ...graphData, nodes: nextNodes }
  }, [graphData, selectedNode])

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      drawNode(node, ctx, globalScale, {
        selectedNode,
        hoveredNode: hoveredNodeRef.current,
        connectedNodes,
        isNodeVisible,
        hoveredFilter,
        citationCount: citationsByNodeId.get(node.id) || 0,
      })
    },
    [selectedNode, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId]
  )

  const nodePointerAreaPaint = useCallback(
    (node, color, ctx) => {
      const r = getNodeRadius(node, citationsByNodeId.get(node.id) || 0)
      if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y) || !Number.isFinite(r) || r <= 0) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2)
      ctx.fill()
    },
    [citationsByNodeId]
  )

  const isLinkActive = useCallback(
    (link) => {
      if (!selectedNode) return false
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      return connectedLinks.has(`${srcId}-${tgtId}`)
    },
    [selectedNode, connectedLinks]
  )

  const linkColor = useCallback(
    (link) => {
      if (viewMode === 'genealogy') {
        if (!selectedNode) return 'rgba(190, 210, 255, 0.6)'
        if (isLinkActive(link)) return 'rgba(220, 238, 255, 0.95)'
        return 'rgba(160, 185, 235, 0.35)'
      }
      if (!selectedNode && !activeFilter) return 'rgba(140, 220, 255, 0.35)'
      if (isLinkActive(link)) return 'rgba(190, 240, 255, 0.85)'
      return 'rgba(140, 220, 255, 0.14)'
    },
    [selectedNode, activeFilter, isLinkActive, viewMode]
  )

  const linkWidth = useCallback(
    (link) => {
      if (viewMode === 'genealogy') {
        if (!selectedNode) return 1.4
        return isLinkActive(link) ? 2.6 : 1
      }
      if (!selectedNode) return 0.9
      return isLinkActive(link) ? 2.2 : 0.5
    },
    [selectedNode, isLinkActive, viewMode]
  )

  const arrowColor = useCallback(
    (link) => {
      if (!selectedNode) return 'rgba(140, 220, 255, 0.5)'
      return isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
    },
    [selectedNode, isLinkActive]
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
          hoveredNodeRef.current = node || null
          fgRef.current?.refresh?.()
        }}
        onNodeClick={onNodeClick}
        onLinkClick={onLinkClick}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkCurvature={(link) => {
          if (viewMode !== 'genealogy') return 0.15
          const sx = link.source?.fx ?? link.source?.x ?? 0
          const tx = link.target?.fx ?? link.target?.x ?? 0
          const dist = Math.abs(tx - sx)
          return Math.min(0.55 + dist / 700, 1.4)
        }}
        linkDirectionalArrowLength={(link) => {
          return !selectedNode ? 4 : isLinkActive(link) ? 7 : 3
        }}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={(link) => {
          if (viewMode === 'genealogy') {
            if (!selectedNode) return 2
            return isLinkActive(link) ? 6 : 2
          }
          return !selectedNode ? 2 : isLinkActive(link) ? 5 : 0
        }}
        linkDirectionalParticleWidth={(link) => {
          if (viewMode === 'genealogy') {
            if (!selectedNode) return 1
            return isLinkActive(link) ? 2 : 1
          }
          return !selectedNode ? 1 : isLinkActive(link) ? 2 : 0
        }}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link) =>
          viewMode === 'genealogy'
            ? !selectedNode
              ? 'rgba(140, 220, 255, 0.6)'
              : isLinkActive(link)
                ? '#b4e6ff'
                : 'rgba(140, 220, 255, 0.22)'
            : !selectedNode
              ? 'rgba(140, 220, 255, 0.6)'
              : isLinkActive(link)
                ? '#b4e6ff'
                : 'rgba(255,255,255,0.05)'
        }
        backgroundColor="#06030f"
        onEngineInit={handleInit}
        onRenderFramePre={onRenderFramePre}
      />
      <KeyboardHints />
    </div>
  )
})

export default Graph

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import KeyboardHints from '../../components/ui/KeyboardHints'
import { drawStarField } from './scene'
import {
  setupKeyboardHandlers,
  setupMouseDragHandlers,
  setupWheelZoomHandlers,
  startPanZoomLoop,
} from './cameraControls'
import { drawNode, getNodeRadius } from './nodeObject'
import { drawGenealogyOverlay } from './axisLabels'
import { blendAxesColors } from '../../categories'

const SHOW_STARFIELD = false
/** Zoom appliqué au centrage sur un nœud sélectionné (plus bas = moins rapproché). */
const NODE_FOCUS_ZOOM = 1.9

const Graph = forwardRef(function Graph({
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

  // Flash animation for newly imported nodes
  const flashNodeIdsRef = useRef(new Set())
  const flashAlphaRef = useRef(0)
  const flashRafRef = useRef(null)

  useEffect(() => {
    flashNodeIdsRef.current = new Set(flashNodeIds || [])
    if (!flashNodeIds?.size) return

    const startTime = Date.now()
    const DURATION = 3500

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      flashAlphaRef.current = 1 - progress
      fgRef.current?.refresh()
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

    if (layoutPositions) {
      const radiusSource = [...layoutPositions.values()]
      const maxR = Math.max(...radiusSource.map((p) => Math.hypot(p.fx ?? 0, p.fy ?? 0)), 300)
      const zoom = 400 / maxR
      camRef.current = { x: 0, y: 0, zoom }
      fg.centerAt(0, 0, 900)
      fg.zoom(zoom, 900)
      return
    }

    camRef.current = { x: 0, y: 0, zoom: 0.7 }
    fg.centerAt(0, 0, 900)
    fg.zoom(0.7, 900)
  }, [layoutPositions])

  useEffect(() => setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef, onSpace: resetToOverview }), [resetToOverview])
  useEffect(() => setupMouseDragHandlers({ containerRef, velRef, hoveredNodeRef }), [])
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
        if (link) link.distance((l) => l.type === 'author-book' ? 45 : 102)

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
        if (charge) charge.strength((node) => node.type === 'author' ? -900 : -520).distanceMax(700)
        const link = fg.d3Force('link')
        if (link) link.distance((l) => l.type === 'author-book' ? 60 : 130)

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
    const fg = fgRef.current
    if (!fg) return
    const focusNode =
      selectedNode ||
      (peekNodeId ? graphData.nodes?.find((n) => n.id === peekNodeId) : null)
    if (!focusNode) return
    const fx = focusNode.fx ?? focusNode.x
    const fy = focusNode.fy ?? focusNode.y
    if (fx == null) return
    camRef.current = { x: fx, y: fy, zoom: NODE_FOCUS_ZOOM }
    fg.centerAt(fx, fy, 1200)
    fg.zoom(NODE_FOCUS_ZOOM, 1200)
  }, [selectedNode, peekNodeId, viewMode, graphData.nodes])

  // IDs of all book nodes belonging to selectedAuthorId
  const authorNodeIds = useMemo(() => {
    if (!selectedAuthorId) return new Set()
    const ids = new Set()
    // Include the author node itself if present
    graphData.nodes.forEach((n) => {
      if (n.type === 'author' && n.id === selectedAuthorId) ids.add(n.id)
      if (n.authorIds?.includes(selectedAuthorId)) ids.add(n.id)
    })
    return ids
  }, [selectedAuthorId, graphData.nodes])

  const anchorIds = useMemo(() => {
    if (peekNodeId) return new Set([peekNodeId])
    if (selectedNode) return new Set([selectedNode.id])
    if (authorNodeIds.size) return authorNodeIds
    return null
  }, [peekNodeId, selectedNode, authorNodeIds])

  const connectedLinks = useMemo(() => {
    if (!anchorIds) return new Set()
    const set = new Set()
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (anchorIds.has(srcId) || anchorIds.has(tgtId)) set.add(`${srcId}-${tgtId}`)
    })
    return set
  }, [anchorIds, graphData.links])

  const connectedNodes = useMemo(() => {
    if (!anchorIds) return new Set()
    const set = new Set(anchorIds)
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (anchorIds.has(srcId)) set.add(tgtId)
      if (anchorIds.has(tgtId)) set.add(srcId)
    })
    return set
  }, [anchorIds, graphData.links])

  const citationsByNodeId = useMemo(() => {
    const counts = new Map()
    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return  // ne pas compter les liens auteur→livre
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      if (!targetId) return
      counts.set(targetId, (counts.get(targetId) || 0) + 1)
    })
    return counts
  }, [graphData.links])

  // Count links between same source-target pair for "strong" link detection
  const linkWeights = useMemo(() => {
    const counts = new Map()
    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      const key = [srcId, tgtId].sort().join('-')
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [graphData.links])

  // Links connected to hovered node
  const hoveredLinksRef = useRef(new Set())
  const updateHoveredLinks = useCallback((node) => {
    hoveredLinksRef.current.clear()
    if (!node) return
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (srcId === node.id || tgtId === node.id) {
        hoveredLinksRef.current.add(`${srcId}-${tgtId}`)
      }
    })
  }, [graphData.links])

  const handleInit = useCallback((fg) => {
    // Les auteurs ont une répulsion plus forte pour créer des "systèmes stellaires" distincts
    fg.d3Force('charge').strength((node) => node.type === 'author' ? -900 : -520).distanceMax(700)
    // Les liens auteur→livre sont plus courts (les livres orbitent près de l'auteur)
    fg.d3Force('link').distance((link) => link.type === 'author-book' ? 60 : 130)
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
    [selectedNode, selectedAuthorId, peekNodeId, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId]
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
      if (!anchorIds) return false
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      return connectedLinks.has(`${srcId}-${tgtId}`)
    },
    [anchorIds, connectedLinks]
  )

  const isLinkHovered = useCallback(
    (link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      return hoveredLinksRef.current.has(`${srcId}-${tgtId}`)
    },
    []
  )

  const getLinkWeight = useCallback(
    (link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      const key = [srcId, tgtId].sort().join('-')
      return linkWeights.get(key) || 1
    },
    [linkWeights]
  )

  const hasSelection = Boolean(anchorIds)

  const linkColor = useCallback(
    (link) => {
      // Hovered links are drawn by linkCanvasObject — return transparent to avoid double-draw
      if (hoveredNodeRef.current && isLinkHovered(link)) return 'rgba(0,0,0,0)'

      // Liens auteur→livre : fin et discret (lien structurel, pas une citation)
      if (link.type === 'author-book') {
        if (isLinkActive(link)) return 'rgba(180, 220, 255, 0.45)'
        return 'rgba(140, 200, 255, 0.14)'
      }

      if (viewMode === 'genealogy') {
        if (!hasSelection) return 'rgba(190, 210, 255, 0.6)'
        if (isLinkActive(link)) return 'rgba(220, 238, 255, 0.95)'
        return 'rgba(160, 185, 235, 0.35)'
      }
      if (!hasSelection && !activeFilter) return 'rgba(140, 220, 255, 0.35)'
      if (isLinkActive(link)) return 'rgba(190, 240, 255, 0.85)'
      return 'rgba(140, 220, 255, 0.14)'
    },
    [hasSelection, activeFilter, isLinkActive, isLinkHovered, viewMode]
  )

  const linkWidth = useCallback(
    (link) => {
      // Liens auteur→livre : toujours fins
      if (link.type === 'author-book') {
        return isLinkActive(link) ? 1.2 : 0.5
      }

      const weight = getLinkWeight(link)
      const isStrong = weight > 1

      if (viewMode === 'genealogy') {
        if (!hasSelection) return isStrong ? 1.8 : 1.4
        return isLinkActive(link) ? (isStrong ? 3.0 : 2.6) : 1
      }
      if (!hasSelection && !hoveredNodeRef.current) return isStrong ? 1.0 : 0.5
      if (isLinkActive(link)) return isStrong ? 2.8 : 2.2
      if (hoveredNodeRef.current && isLinkHovered(link)) return isStrong ? 1.5 : 1.0
      return 0.5
    },
    [hasSelection, isLinkActive, isLinkHovered, getLinkWeight, viewMode]
  )

  // Custom canvas drawing for hovered links — gradient from source to target color
  const linkCanvasObject = useCallback(
    (link, ctx, globalScale) => {
      // Only draw gradient for links connected to hovered node (and not selected, to not conflict)
      if (!hoveredNodeRef.current || hasSelection) return
      if (!isLinkHovered(link)) return

      const src = link.source
      const tgt = link.target
      if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return

      const srcColor = blendAxesColors(src.axes || [])
      const tgtColor = blendAxesColors(tgt.axes || [])

      const weight = getLinkWeight(link)
      const isStrong = weight > 1
      const lineWidth = (isStrong ? 2.2 : 1.4) / globalScale

      // Build the path (respecting curvature via __controlPoints)
      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      const cp = link.__controlPoints
      if (!cp) {
        ctx.lineTo(tgt.x, tgt.y)
      } else if (cp.length === 2) {
        ctx.quadraticCurveTo(cp[0], cp[1], tgt.x, tgt.y)
      } else {
        ctx.bezierCurveTo(cp[0], cp[1], cp[2], cp[3], tgt.x, tgt.y)
      }

      // Create gradient along the link direction
      // Source (the book that cites) is bright and opaque, fading toward target
      const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y)
      grad.addColorStop(0, withAlpha(srcColor, isStrong ? 1.0 : 0.9))
      grad.addColorStop(0.25, withAlpha(srcColor, 0.7))
      grad.addColorStop(0.6, withAlpha(tgtColor, 0.35))
      grad.addColorStop(1, withAlpha(tgtColor, isStrong ? 0.45 : 0.2))

      ctx.strokeStyle = grad
      ctx.lineWidth = lineWidth
      ctx.stroke()
    },
    [hasSelection, isLinkHovered, getLinkWeight]
  )

  const arrowColor = useCallback(
    (link) => {
      // Liens auteur→livre : pas de flèche directionnelle
      if (link.type === 'author-book') return 'rgba(0,0,0,0)'
      // When hovering a node, color arrows by source node color
      if (hoveredNodeRef.current && !hasSelection && isLinkHovered(link)) {
        const src = typeof link.source === 'object' ? link.source : null
        if (src) return withAlpha(blendAxesColors(src.axes || []), 0.8)
      }
      if (!hasSelection) return 'rgba(140, 220, 255, 0.5)'
      return isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered]
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
        connectedNodes,
        isNodeVisible,
        hoveredFilter,
      }
      // Redraw selected/peek node on top
      const topNode = selectedNodeRef.current || (peekNodeId && graphData.nodes?.find((n) => n.id === peekNodeId))
      if (topNode) {
        drawNode(topNode, ctx, globalScale, { ...baseOpts, citationCount: citationsByNodeId.get(topNode.id) || 0 })
      }
      // Redraw hovered node label on top of everything
      const hovered = hoveredNodeRef.current
      if (hovered && Number.isFinite(hovered.x) && Number.isFinite(hovered.y)) {
        drawNode(hovered, ctx, globalScale, { ...baseOpts, citationCount: citationsByNodeId.get(hovered.id) || 0, labelOnly: true })
      }
    },
    [selectedAuthorId, peekNodeId, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId, graphData.nodes]
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
          updateHoveredLinks(node || null)
          fgRef.current?.refresh?.()
        }}
        onNodeClick={onNodeClick}
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
        linkDirectionalArrowLength={(link) => {
          return !hasSelection ? 4 : isLinkActive(link) ? 7 : 3
        }}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={(link) => {
          if (viewMode === 'genealogy') {
            if (!hasSelection) return 2
            return isLinkActive(link) ? 6 : 2
          }
          return !hasSelection ? 2 : isLinkActive(link) ? 5 : 0
        }}
        linkDirectionalParticleWidth={(link) => {
          if (viewMode === 'genealogy') {
            if (!hasSelection) return 1
            return isLinkActive(link) ? 2 : 1
          }
          return !hasSelection ? 1 : isLinkActive(link) ? 2 : 0
        }}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link) => {
          // Hovered links: particles take the source node color
          if (hoveredNodeRef.current && !hasSelection && isLinkHovered(link)) {
            const src = typeof link.source === 'object' ? link.source : null
            if (src) return withAlpha(blendAxesColors(src.axes || []), 0.9)
          }
          return viewMode === 'genealogy'
            ? !hasSelection
              ? 'rgba(140, 220, 255, 0.6)'
              : isLinkActive(link)
                ? '#b4e6ff'
                : 'rgba(140, 220, 255, 0.22)'
            : !hasSelection
              ? 'rgba(140, 220, 255, 0.6)'
              : isLinkActive(link)
                ? '#b4e6ff'
                : 'rgba(255,255,255,0.05)'
        }}
        backgroundColor="#06030f"
        onEngineInit={handleInit}
        onRenderFramePre={onRenderFramePre}
        onRenderFramePost={onRenderFramePost}
      />
      <KeyboardHints />
    </div>
  )
})

function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default Graph

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import KeyboardHints from '../ui/KeyboardHints'
import { createStarField } from './scene'
import { restoreCamera, setupKeyboardHandlers, startTankLoop } from './cameraControls'
import { createNodeThreeObject } from './nodeObject'
import { createGenealogyOverlay } from './axisLabels'

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

  useImperativeHandle(ref, () => ({
    centerCamera() {
      const fg = fgRef.current
      if (!fg) return
      const z = viewMode === 'constellation' ? 600 : 900
      fg.cameraPosition({ x: 0, y: 0, z }, { x: 0, y: 0, z: 0 }, 1200)
    },
  }))
  const keysRef = useRef(new Set())
  const velRef = useRef({ forward: 0, yaw: 0 })
  const animFrameRef = useRef()
  const selectedNodeRef = useRef(selectedNode)
  const lastCameraStateRef = useRef(null)

  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  useEffect(() => setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef }), [])

  useEffect(
    () => startTankLoop({ fgRef, keysRef, velRef, animFrameRef, lastCameraStateRef }),
    []
  )

  useEffect(() => {
    restoreCamera({ fgRef, lastCameraStateRef })
  }, [graphData.nodes.length, graphData.links.length])

  // Apply layout positions when view mode changes
  const prevViewRef = useRef(viewMode)
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Use a small delay to ensure the force simulation is ready
    const timer = setTimeout(() => {
      if (layoutPositions) {
        // 2D mode: fix node positions and flatten Z
        graphData.nodes.forEach((node) => {
          const pos = layoutPositions.get(node.id)
          if (pos) {
            node.fx = pos.fx
            node.fy = pos.fy
            node.fz = pos.fz
          }
        })
        // Weaken forces for fixed layouts
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-30)
        const link = fg.d3Force('link')
        if (link) link.distance(80)

        // Move camera to 2D viewing angle
        const maxR = Math.max(...[...layoutPositions.values()].map((p) => Math.hypot(p.fx, p.fy)), 300)
        fg.cameraPosition({ x: 0, y: 0, z: maxR * 1.8 }, { x: 0, y: 0, z: 0 }, 1200)
      } else {
        // Constellation mode: release fixed positions
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
          node.fz = undefined
        })
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-250).distanceMax(500)
        const link = fg.d3Force('link')
        if (link) link.distance(100)

        if (prevViewRef.current !== 'constellation') {
          fg.cameraPosition({ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 0 }, 1200)
        }
      }
      prevViewRef.current = viewMode
    }, 100)

    return () => clearTimeout(timer)
  }, [layoutPositions, viewMode, graphData.nodes])

  useEffect(() => {
    if (!selectedNode || !fgRef.current) return
    const distance = viewMode === 'constellation' ? 120 : 200
    const { x, y, z } = selectedNode
    if (x == null) return
    if (viewMode === 'constellation') {
      fgRef.current.cameraPosition({ x: x + distance, y: y + distance / 3, z: z + distance }, { x, y, z }, 1200)
    } else {
      // For 2D views, keep camera above the plane
      const fx = selectedNode.fx ?? x
      const fy = selectedNode.fy ?? y
      fgRef.current.cameraPosition({ x: fx, y: fy, z: distance }, { x: fx, y: fy, z: 0 }, 1200)
    }
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

  const handleInit = useCallback((fg) => {
    fg.scene().add(createStarField())
    fg.d3Force('charge').strength(-250).distanceMax(500)
    fg.d3Force('link').distance(100)
    const ctrl = fg.controls()
    if (ctrl) ctrl.enabled = false
    const cam = fg.camera()
    if (cam) cam.rotation.order = 'YXZ'
  }, [])

  const isNodeVisible = useCallback(
    (node) => {
      if (!activeFilter) return true
      return (node.axes || []).includes(activeFilter)
    },
    [activeFilter]
  )

  const nodeThreeObject = useCallback(
    (node) => createNodeThreeObject({ node, selectedNode, connectedNodes, isNodeVisible, hoveredFilter }),
    [selectedNode, connectedNodes, isNodeVisible, hoveredFilter]
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
      if (!selectedNode && !activeFilter) return 'rgba(120, 200, 255, 0.22)'
      if (isLinkActive(link)) return 'rgba(180, 230, 255, 0.7)'
      return 'rgba(120, 200, 255, 0.04)'
    },
    [selectedNode, activeFilter, isLinkActive]
  )

  const linkWidth = useCallback(
    (link) => {
      if (!selectedNode) return 0.4
      return isLinkActive(link) ? 1.8 : 0.1
    },
    [selectedNode, isLinkActive]
  )

  const arrowColor = useCallback(
    (link) => {
      if (!selectedNode) return 'rgba(140, 220, 255, 0.5)'
      return isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
    },
    [selectedNode, isLinkActive]
  )

  // Manage view-mode overlays (axis labels, guide lines)
  const overlayRef = useRef(null)
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Remove previous overlay
    if (overlayRef.current) {
      fg.scene().remove(overlayRef.current)
      overlayRef.current = null
    }

    // Add new overlay based on view mode
    if (viewMode === 'genealogy') {
      overlayRef.current = createGenealogyOverlay()
      fg.scene().add(overlayRef.current)
    }

    return () => {
      if (overlayRef.current && fg) {
        fg.scene().remove(overlayRef.current)
        overlayRef.current = null
      }
    }
  }, [viewMode])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        onNodeClick={onNodeClick}
        onLinkClick={onLinkClick}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={1}
        linkCurvature={(link) => {
          if (viewMode !== 'genealogy') return 0.15
          // Arc height proportional to horizontal distance between nodes
          const sx = link.source?.fx ?? link.source?.x ?? 0
          const tx = link.target?.fx ?? link.target?.x ?? 0
          const dist = Math.abs(tx - sx)
          return Math.min(0.4 + dist / 1200, 1.2)
        }}
        linkCurveRotation={(link) => {
          if (viewMode !== 'genealogy') return 0
          // Always arc upward (negative Y in screen = above the baseline)
          const sx = link.source?.fx ?? link.source?.x ?? 0
          const tx = link.target?.fx ?? link.target?.x ?? 0
          return sx < tx ? Math.PI / 2 : -Math.PI / 2
        }}
        linkDirectionalArrowLength={(link) => (!selectedNode ? 4 : isLinkActive(link) ? 7 : 3)}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={(link) => (!selectedNode ? 2 : isLinkActive(link) ? 5 : 0)}
        linkDirectionalParticleWidth={(link) => (!selectedNode ? 1 : isLinkActive(link) ? 2 : 0)}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link) =>
          !selectedNode ? 'rgba(140, 220, 255, 0.6)' : isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
        }
        backgroundColor="#06030f"
        onInit={handleInit}
        showNavInfo={false}
      />
      <KeyboardHints />
    </div>
  )
})

export default Graph

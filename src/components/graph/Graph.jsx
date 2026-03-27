import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import ForceGraph3D from 'react-force-graph-3d'
import KeyboardHints from '../ui/KeyboardHints'
import { createStarField } from './scene'
import {
  restoreCamera,
  setupKeyboardHandlers,
  setupMousePanHandlers,
  setupWheelZoomHandlers,
  startTankLoop,
} from './cameraControls'
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
  is2D,
}, ref) {
  const isFlatMode = true
  const fgRef = useRef()
  const containerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    centerCamera() {
      const fg = fgRef.current
      if (!fg) return
      const z = isFlatMode ? 900 : viewMode === 'constellation' ? 600 : 900
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

  useEffect(() => setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef, isFlatMode }), [])
  useEffect(() => setupMousePanHandlers({ containerRef, velRef }), [])
  useEffect(() => setupWheelZoomHandlers({ containerRef, fgRef, velRef, lastCameraStateRef }), [])

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
        // Fixed layout (genealogy): apply positions and weaken forces
        graphData.nodes.forEach((node) => {
          const pos = layoutPositions.get(node.id)
          if (pos) {
            node.fx = pos.fx
            node.fy = pos.fy
            node.fz = pos.fz
          }
        })
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-30)
        const link = fg.d3Force('link')
        if (link) link.distance(80)

        const radiusSource = [...layoutPositions.values()]
        const maxR = Math.max(...radiusSource.map((p) => Math.hypot(p.fx ?? 0, p.fy ?? 0)), 300)
        fg.cameraPosition({ x: 0, y: 0, z: maxR * 1.8 }, { x: 0, y: 0, z: 0 }, 1200)
      } else {
        // Free layout (constellation): release fixed positions
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
          node.fz = isFlatMode ? 0 : undefined
        })
        const charge = fg.d3Force('charge')
        if (charge) charge.strength(-250).distanceMax(500)
        const link = fg.d3Force('link')
        if (link) link.distance(100)

        fg.d3ReheatSimulation()
        fg.cameraPosition({ x: 0, y: 0, z: isFlatMode ? 900 : 600 }, { x: 0, y: 0, z: 0 }, 1200)
      }
      prevViewRef.current = viewMode
    }, 100)

    return () => clearTimeout(timer)
  }, [layoutPositions, viewMode, graphData.nodes, isFlatMode])

  useEffect(() => {
    if (!selectedNode || !fgRef.current) return
    const distance = isFlatMode ? 240 : viewMode === 'constellation' ? 120 : 200
    const { x, y, z } = selectedNode
    if (x == null) return
    if (viewMode === 'constellation' && !isFlatMode) {
      fgRef.current.cameraPosition({ x: x + distance, y: y + distance / 3, z: z + distance }, { x, y, z }, 1200)
    } else {
      // For 2D views, keep camera above the plane
      const fx = selectedNode.fx ?? x
      const fy = selectedNode.fy ?? y
      fgRef.current.cameraPosition({ x: fx, y: fy, z: distance }, { x: fx, y: fy, z: 0 }, 1200)
    }
  }, [selectedNode, viewMode, isFlatMode])

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
    fg.scene().add(createStarField())
    fg.d3Force('charge').strength(-250).distanceMax(500)
    fg.d3Force('link').distance(100)
    const ctrl = fg.controls()
    if (ctrl) {
      ctrl.enabled = true
      ctrl.enableRotate = false
      ctrl.enablePan = false
      ctrl.enableZoom = false
      ctrl.mouseButtons = {
        LEFT: THREE.MOUSE.NONE,
        MIDDLE: THREE.MOUSE.NONE,
        RIGHT: THREE.MOUSE.NONE,
      }
      ctrl.touches = {
        ONE: THREE.TOUCH.NONE,
        TWO: THREE.TOUCH.NONE,
      }
    }
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
    (node) =>
      createNodeThreeObject({
        node,
        selectedNode,
        connectedNodes,
        isNodeVisible,
        hoveredFilter,
        citationCount: citationsByNodeId.get(node.id) || 0,
      }),
    [selectedNode, connectedNodes, isNodeVisible, hoveredFilter, citationsByNodeId]
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
        if (!selectedNode) return 'rgba(180, 198, 255, 0.34)'
        if (isLinkActive(link)) return 'rgba(205, 224, 255, 0.84)'
        return 'rgba(140, 160, 220, 0.18)'
      }
      if (!selectedNode && !activeFilter) return 'rgba(120, 200, 255, 0.22)'
      if (isLinkActive(link)) return 'rgba(180, 230, 255, 0.7)'
      return 'rgba(120, 200, 255, 0.04)'
    },
    [selectedNode, activeFilter, isLinkActive, viewMode]
  )

  const linkWidth = useCallback(
    (link) => {
      if (viewMode === 'genealogy') {
        if (!selectedNode) return 1
        return isLinkActive(link) ? 2.2 : 0.6
      }
      if (!selectedNode) return 0.4
      return isLinkActive(link) ? 1.8 : 0.1
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        enableNavigationControls={false}
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
          return Math.min(0.55 + dist / 700, 1.4)
        }}
        linkCurveRotation={() => {
          if (viewMode !== 'genealogy') return 0
          // Draw arcs upward (in the y-direction) so they are visible from the camera.
          return 0
        }}
        linkDirectionalArrowLength={(link) => {
          if (viewMode === 'genealogy') return 0
          return !selectedNode ? 4 : isLinkActive(link) ? 7 : 3
        }}
        linkDirectionalArrowRelPos={0.88}
        linkDirectionalArrowColor={arrowColor}
        linkDirectionalParticles={(link) => {
          if (viewMode === 'genealogy') return 0
          return !selectedNode ? 2 : isLinkActive(link) ? 5 : 0
        }}
        linkDirectionalParticleWidth={(link) => {
          if (viewMode === 'genealogy') return 0
          return !selectedNode ? 1 : isLinkActive(link) ? 2 : 0
        }}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link) =>
          !selectedNode ? 'rgba(140, 220, 255, 0.6)' : isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
        }
        backgroundColor="#06030f"
        onInit={handleInit}
        showNavInfo={false}
        numDimensions={2}
      />
      <KeyboardHints />
    </div>
  )
})

export default Graph

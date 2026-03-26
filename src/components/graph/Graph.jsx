import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import KeyboardHints from '../ui/KeyboardHints'
import { createStarField } from './scene'
import { restoreCamera, setupKeyboardHandlers, startTankLoop } from './cameraControls'
import { createNodeThreeObject } from './nodeObject'

const Graph = forwardRef(function Graph({
  graphData,
  selectedNode,
  activeFilter,
  hoveredFilter,
  onNodeClick,
  onLinkClick,
}, ref) {
  const fgRef = useRef()

  useImperativeHandle(ref, () => ({
    centerCamera() {
      const fg = fgRef.current
      if (!fg) return
      fg.cameraPosition({ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 0 }, 1200)
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

  useEffect(() => {
    if (!selectedNode || !fgRef.current) return
    const distance = 120
    const { x, y, z } = selectedNode
    if (x == null) return
    fgRef.current.cameraPosition({ x: x + distance, y: y + distance / 3, z: z + distance }, { x, y, z }, 1200)
  }, [selectedNode])

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
        linkCurvature={0.15}
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

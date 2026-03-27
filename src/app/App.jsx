import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AnalysisPanel from '../components/AnalysisPanel'
import Graph from '../components/Graph'
import Legend from '../components/Legend'
import Navbar from '../components/Navbar'
import SidePanel from '../components/SidePanel'
import Timeline from '../components/Timeline'
import TextsPanel from '../components/texts-panel/TextsPanel'
import ViewSelector from '../components/ViewSelector'
import defaultData from '../data.json'
import { AXES_COLORS, axesGradient } from '../categories'
import { exportJSON } from '../api/graphStorage'
import useGlobalSearch from '../hooks/useGlobalSearch'
import useGraphData from '../hooks/useGraphData'
import { computeSameAuthorBooks, getIncomingRefs, getLinkNodes, getOutgoingRefs } from './graphRelations'
import { constellationLayout, genealogyLayout } from '../layouts/layoutEngine'

export default function App() {
  const {
    graphData,
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleMergeBooks,
    resetToDefault,
  } = useGraphData({
    defaultData,
    axesColors: AXES_COLORS,
  })

  const graphRef = useRef(null)

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedLink, setSelectedLink] = useState(null)
  const [linkContextNode, setLinkContextNode] = useState(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [prefilledSourceId, setPrefilledSourceId] = useState(null)
  const [prefilledTargetId, setPrefilledTargetId] = useState(null)
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)

  const [activeFilter, setActiveFilter] = useState(null)
  const [hoveredFilter, setHoveredFilter] = useState(null)

  // View mode: 'constellation' | 'genealogy'
  const [viewMode, setViewMode] = useState('constellation')

  // Timeline state — default to full range so all books are visible initially
  const allYears = useMemo(() => graphData.nodes.map((n) => n.year).filter(Boolean), [graphData.nodes])
  const maxYear = useMemo(() => Math.max(...allYears, 2025), [allYears])
  const minYear = useMemo(() => Math.min(...allYears, 1800), [allYears])
  const [timelineRange, setTimelineRange] = useState(() => ({ start: minYear, end: maxYear }))

  const clampedTimelineRange = useMemo(() => {
    const start = timelineRange?.start ?? minYear
    const end = timelineRange?.end ?? maxYear
    const safeStart = Math.max(minYear, Math.min(start, end, maxYear))
    const safeEnd = Math.min(maxYear, Math.max(end, start, minYear))
    return { start: safeStart, end: safeEnd }
  }, [timelineRange, minYear, maxYear])

  // Filtered graph data based on timeline range
  const filteredGraphData = useMemo(() => {
    const start = clampedTimelineRange.start
    const end = clampedTimelineRange.end
    const visibleNodeIds = new Set(
      graphData.nodes.filter((n) => !n.year || (n.year >= start && n.year <= end)).map((n) => n.id)
    )
    return {
      nodes: graphData.nodes.filter((n) => visibleNodeIds.has(n.id)),
      links: graphData.links.filter((l) => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target
        return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId)
      }),
    }
  }, [graphData, clampedTimelineRange])

  // Compute layout positions based on view mode
  const layoutPositions = useMemo(() => {
    switch (viewMode) {
      case 'genealogy':
        return genealogyLayout(filteredGraphData)
      default:
        return constellationLayout()
    }
  }, [viewMode, filteredGraphData])

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode)
  }, [])

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, selectedNode), [graphData, selectedNode])

  const hasSelection = selectedNode || selectedLink
  const isAdminTab = panelTab === 'book' || panelTab === 'link' || panelTab === 'edit'
  const panelOpen = hasSelection || isAdminTab

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
    setPrefilledSourceId(null)
    setPrefilledTargetId(null)
  }, [])

  const handleNodeClick = useCallback((node) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setPanelTab('details')
  }, [])

  const handleSelectTextFromPanel = useCallback((node) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedNode(node)
    setPanelTab('details')
    setTextsPanelOpen(false)
  }, [])

  const handleLinkClick = useCallback((link) => {
    setSelectedNode(null)
    setSelectedLink(link)
    setLinkContextNode(null)
    setPanelTab('details')
  }, [])

  const toggleFilter = useCallback((axis) => setActiveFilter((prev) => (prev === axis ? null : axis)), [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (panelOpen) handleClosePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelOpen, handleClosePanel])

  const { searchRef, globalSearch, setGlobalSearch, searchFocused, setSearchFocused, searchResults, handleSearchSelect } =
    useGlobalSearch({
      nodes: graphData.nodes,
      onSelect: (node) => {
        setLinkContextNode(null)
        setSelectedLink(null)
        setSelectedNode(node)
        setPanelTab('details')
      },
    })

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Graph
          ref={graphRef}
          graphData={filteredGraphData}
          selectedNode={selectedNode}
          activeFilter={activeFilter}
          hoveredFilter={hoveredFilter}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          layoutPositions={layoutPositions}
          viewMode={viewMode}
        />
      </div>

      <Navbar
        searchRef={searchRef}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
        searchResults={searchResults}
        handleSearchSelect={handleSearchSelect}
        axesGradient={axesGradient}
        panelTab={panelTab}
        setPanelTab={setPanelTab}
        handleClosePanel={handleClosePanel}
        setPreviousPanelTab={setPreviousPanelTab}
        setSelectedNode={setSelectedNode}
        setSelectedLink={setSelectedLink}
        onOpenTextsPanel={() => setTextsPanelOpen(true)}
        exportJSON={exportJSON}
        graphData={graphData}
        resetToDefault={resetToDefault}
      />

      <Legend
        axesColors={AXES_COLORS}
        activeFilter={activeFilter}
        hoveredFilter={hoveredFilter}
        toggleFilter={toggleFilter}
        setHoveredFilter={setHoveredFilter}
        clearFilter={() => setActiveFilter(null)}
      />

      <SidePanel
        panelOpen={panelOpen}
        panelTab={panelTab}
        selectedNode={selectedNode}
        selectedLink={selectedLink}
        linkContextNode={linkContextNode}
        sameAuthorBooks={sameAuthorBooks}
        prefilledSourceId={prefilledSourceId}
        prefilledTargetId={prefilledTargetId}
        previousPanelTab={previousPanelTab}
        graphData={graphData}
        AXES_COLORS={AXES_COLORS}
        getOutgoingRefs={(node) => getOutgoingRefs(graphData, node)}
        getIncomingRefs={(node) => getIncomingRefs(graphData, node)}
        getLinkNodes={(link) => getLinkNodes(graphData, link)}
        handleClosePanel={handleClosePanel}
        handleAddBook={handleAddBook}
        handleAddLink={(link) => {
          handleAddLink(link)
          handleClosePanel()
          graphRef.current?.centerCamera()
        }}
        handleUpdateBook={(n) => {
          handleUpdateBook(n)
          setSelectedNode((prevSel) => (prevSel?.id === n.id ? { ...prevSel, ...n } : n))
          setPanelTab('details')
        }}
        handleDeleteBook={(nodeId) => {
          const deleted = handleDeleteBook(nodeId)
          if (!deleted) return
          setSelectedNode(null)
          setSelectedLink(null)
          setLinkContextNode(null)
          setPanelTab('details')
        }}
        handleMergeBooks={(fromNodeId, intoNodeId) => {
          const merged = handleMergeBooks(fromNodeId, intoNodeId)
          if (!merged) return
          const intoNode = graphData.nodes.find((n) => n.id === intoNodeId)
          setSelectedLink(null)
          setLinkContextNode(null)
          setSelectedNode(intoNode || null)
          setPanelTab('details')
        }}
        setPrefilledSourceId={setPrefilledSourceId}
        setPrefilledTargetId={setPrefilledTargetId}
        setPreviousPanelTab={setPreviousPanelTab}
        setPanelTab={setPanelTab}
        setSelectedNode={setSelectedNode}
        setSelectedLink={setSelectedLink}
        setLinkContextNode={setLinkContextNode}
      />

      <Timeline graphData={graphData} timelineRange={clampedTimelineRange} onRangeChange={setTimelineRange} />

      <ViewSelector currentView={viewMode} onViewChange={handleViewChange} />

      <AnalysisPanel
        graphData={filteredGraphData}
        activeFilter={activeFilter}
        onFilterChange={toggleFilter}
        onAddLink={handleAddLink}
      />

      <TextsPanel
        open={textsPanelOpen}
        onClose={() => setTextsPanelOpen(false)}
        nodes={graphData.nodes}
        onSelectNode={handleSelectTextFromPanel}
      />
    </div>
  )
}


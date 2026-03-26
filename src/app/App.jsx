import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AnalysisPanel from '../components/AnalysisPanel'
import Graph from '../components/Graph'
import Legend from '../components/Legend'
import Navbar from '../components/Navbar'
import SidePanel from '../components/SidePanel'
import defaultData from '../data.json'
import { AXES_COLORS, axesGradient } from '../categories'
import { exportJSON } from '../api/graphStorage'
import useGlobalSearch from '../hooks/useGlobalSearch'
import useGraphData from '../hooks/useGraphData'
import { computeSameAuthorBooks, getIncomingRefs, getLinkNodes, getOutgoingRefs } from './graphRelations'

export default function App() {
  const { graphData, handleAddBook, handleAddLink, handleUpdateBook, resetToDefault } = useGraphData({
    defaultData,
    axesColors: AXES_COLORS,
  })

  const graphRef = useRef(null)

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedLink, setSelectedLink] = useState(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [prefilledSourceId, setPrefilledSourceId] = useState(null)
  const [prefilledTargetId, setPrefilledTargetId] = useState(null)

  const [activeFilter, setActiveFilter] = useState(null)
  const [hoveredFilter, setHoveredFilter] = useState(null)

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, selectedNode), [graphData, selectedNode])

  const hasSelection = selectedNode || selectedLink
  const isAdminTab = panelTab === 'book' || panelTab === 'link' || panelTab === 'edit'
  const panelOpen = hasSelection || isAdminTab

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setPanelTab('details')
    setPrefilledSourceId(null)
    setPrefilledTargetId(null)
  }, [])

  const handleNodeClick = useCallback((node) => {
    setSelectedLink(null)
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setPanelTab('details')
  }, [])

  const handleLinkClick = useCallback((link) => {
    setSelectedNode(null)
    setSelectedLink(link)
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
          graphData={graphData}
          selectedNode={selectedNode}
          activeFilter={activeFilter}
          hoveredFilter={hoveredFilter}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
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
        setPrefilledSourceId={setPrefilledSourceId}
        setPrefilledTargetId={setPrefilledTargetId}
        setPreviousPanelTab={setPreviousPanelTab}
        setPanelTab={setPanelTab}
        setSelectedNode={setSelectedNode}
        setSelectedLink={setSelectedLink}
      />

      <AnalysisPanel graphData={graphData} activeFilter={activeFilter} onFilterChange={toggleFilter} onAddLink={handleAddLink} />
    </div>
  )
}


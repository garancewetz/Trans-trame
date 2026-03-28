import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AnalysisPanel from '../features/analysis-panel/AnalysisPanel'
import Graph from '../features/graph/Graph'
import Legend from '../features/graph/Legend'
import Navbar from '../features/shell/Navbar'
import SidePanel from '../features/side-panel/SidePanel'
import TableView from '../features/table/TableView'
import Timeline from '../features/timeline/Timeline'
import TextsPanel from '../features/texts-panel/TextsPanel'
import AuthorsPanel from '../features/authors-panel/AuthorsPanel'
import { AXES_COLORS, axesGradient } from '../categories'
import { authorName } from '../authorUtils'
import useGlobalSearch from '../features/shell/hooks/useGlobalSearch'
import useGraphData from '../features/graph/hooks/useGraphData'
import { computeSameAuthorBooks, getIncomingRefs, getLinkNodes, getOutgoingRefs } from '../features/graph/graphRelations'
import { constellationLayout, genealogyLayout } from '../features/graph/layoutEngine'
export default function App() {
  const {
    graphData,
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleDeleteLink,
    handleUpdateLink,
    handleMergeBooks,
  } = useGraphData({
    axesColors: AXES_COLORS,
  })

  const graphRef = useRef(null)
  const analysisPanelRef = useRef(null)

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedLink, setSelectedLink] = useState(null)
  const [linkContextNode, setLinkContextNode] = useState(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)
  const [peekNodeId, setPeekNodeId] = useState(null)

  const [activeFilter, setActiveFilter] = useState(null)
  const [hoveredFilter, setHoveredFilter] = useState(null)
  const [selectedAuthor, setSelectedAuthor] = useState(null)

  // View mode: 'constellation' | 'genealogy'
  const [viewMode, setViewMode] = useState('constellation')

  // Table mode
  const [tableMode, setTableMode] = useState(false)
  const [tableInitialTab, setTableInitialTab] = useState('books')
  const [tableLinkSourceId, setTableLinkSourceId] = useState(null)
  const [lastEditedNodeId, setLastEditedNodeId] = useState(null)
  const [flashNodeIds, setFlashNodeIds] = useState(null)

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

  const authorCount = useMemo(() => {
    const names = new Set()
    graphData.nodes.forEach((n) => {
      const name = authorName(n)
      if (name) names.add(name)
    })
    return names.size
  }, [graphData.nodes])

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, selectedNode), [graphData, selectedNode])

  const isAdminTab = panelTab === 'edit'
  const hasSelection = selectedNode || selectedLink
  const panelOpen = hasSelection || isAdminTab

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
    setPeekNodeId(null)
  }, [])

  const handleOpenTable = useCallback((tab = 'books', linkSourceId = null) => {
    setTableInitialTab(tab)
    setTableLinkSourceId(linkSourceId)
    setTableMode(true)
  }, [])

  const handleNodeClick = useCallback((node) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setPanelTab('details')
  }, [])

  const handleSelectAuthorFromPanel = useCallback((author) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setPeekNodeId(null)
    setSelectedNode(null)
    setPanelTab('details')
    setSelectedAuthor((prev) => (prev === author ? null : author))
  }, [])

  const handleSelectTextFromPanel = useCallback((node) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode(node)
    setPanelTab('details')
    setTextsPanelOpen(false)
  }, [])

  const handlePeekTextOnGraph = useCallback((node) => {
    setPeekNodeId(node.id)
    setSelectedAuthor(null)
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }, [])

  const handleLinkClick = useCallback(() => {
    // Ne pas ouvrir le panneau "lien" au clic sur une arête du graphe.
  }, [])

  const toggleFilter = useCallback((axis) => setActiveFilter((prev) => (prev === axis ? null : axis)), [])
  const clearActiveFilter = useCallback(() => setActiveFilter(null), [])
  const hasTimelineFilter = clampedTimelineRange.start !== minYear || clampedTimelineRange.end !== maxYear
  const clearTimelineFilter = useCallback(() => {
    setTimelineRange({ start: minYear, end: maxYear })
  }, [minYear, maxYear])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (panelOpen) handleClosePanel()
      else setPeekNodeId((prev) => (prev ? null : prev))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelOpen, handleClosePanel])

  const { searchRef, globalSearch, setGlobalSearch, searchFocused, setSearchFocused, searchResults, handleSearchSelect } =
    useGlobalSearch({
      nodes: graphData.nodes,
      onSelectNode: (node) => {
        setLinkContextNode(null)
        setSelectedLink(null)
        setSelectedAuthor(null)
        setPeekNodeId(null)
        setSelectedNode(node)
        setPanelTab('details')
      },
      onSelectAuthor: (author) => {
        setLinkContextNode(null)
        setSelectedLink(null)
        setPeekNodeId(null)
        setSelectedNode(null)
        setPanelTab('details')
        setSelectedAuthor((prev) => (prev === author ? null : author))
      },
    })

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Graph
          ref={graphRef}
          graphData={filteredGraphData}
          selectedNode={selectedNode}
          selectedAuthor={selectedAuthor}
          peekNodeId={peekNodeId}
          activeFilter={activeFilter}
          hoveredFilter={hoveredFilter}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          layoutPositions={layoutPositions}
          viewMode={viewMode}
          flashNodeIds={flashNodeIds}
        />
      </div>

      <Navbar
        search={{
          ref: searchRef,
          query: globalSearch,
          setQuery: setGlobalSearch,
          focused: searchFocused,
          setFocused: setSearchFocused,
          results: searchResults,
          onSelect: handleSearchSelect,
          axesGradient,
          onOpenTable: handleOpenTable,
        }}
        filters={{
          category: activeFilter,
          clearCategory: clearActiveFilter,
          timelineRange: clampedTimelineRange,
          hasTimelineFilter,
          clearTimelineFilter,
          selectedAuthor,
          clearSelectedAuthor: () => setSelectedAuthor(null),
        }}
        view={{
          mode: viewMode,
          onChange: handleViewChange,
          tableMode,
          onToggleTable: () => setTableMode((v) => !v),
        }}
        catalogue={{
          onOpenTexts: () => {
            setAuthorsPanelOpen(false)
            setTextsPanelOpen(true)
          },
          onOpenAuthors: () => {
            setTextsPanelOpen(false)
            setAuthorsPanelOpen(true)
          },
          onOpenAnalysis: () => analysisPanelRef.current?.openPanel(),
          graphData,
          authorCount,
        }}
      />

      <Legend
        axesColors={AXES_COLORS}
        activeFilter={activeFilter}
        hoveredFilter={hoveredFilter}
        toggleFilter={toggleFilter}
        setHoveredFilter={setHoveredFilter}
        clearFilter={clearActiveFilter}
      />

      <SidePanel
        panelOpen={panelOpen}
        panelTab={panelTab}
        selectedNode={selectedNode}
        selectedLink={selectedLink}
        linkContextNode={linkContextNode}
        sameAuthorBooks={sameAuthorBooks}
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
        setPreviousPanelTab={setPreviousPanelTab}
        setPanelTab={setPanelTab}
        setSelectedNode={setSelectedNode}
        setSelectedLink={setSelectedLink}
        setLinkContextNode={setLinkContextNode}
        onOpenTable={handleOpenTable}
      />

      <Timeline graphData={graphData} timelineRange={clampedTimelineRange} onRangeChange={setTimelineRange} />

      <AnalysisPanel
        ref={analysisPanelRef}
        graphData={filteredGraphData}
        activeFilter={activeFilter}
        onFilterChange={toggleFilter}
        onAddLink={handleAddLink}
        showTrigger={false}
      />

      <TextsPanel
        open={textsPanelOpen}
        onClose={() => setTextsPanelOpen(false)}
        nodes={graphData.nodes}
        onSelectNode={handleSelectTextFromPanel}
        onPeekNode={handlePeekTextOnGraph}
        peekNodeId={peekNodeId}
      />

      <AuthorsPanel
        open={authorsPanelOpen}
        onClose={() => setAuthorsPanelOpen(false)}
        nodes={graphData.nodes}
        selectedAuthor={selectedAuthor}
        onSelectAuthor={handleSelectAuthorFromPanel}
        onAddWorkForAuthor={() => {
          handleOpenTable('books')
          setAuthorsPanelOpen(false)
        }}
        onOpenAddBookFromSearch={() => {
          handleOpenTable('books')
          setAuthorsPanelOpen(false)
        }}
      />

      {tableMode && (
        <TableView
          nodes={graphData.nodes}
          links={graphData.links}
          onAddBook={handleAddBook}
          onAddLink={handleAddLink}
          onUpdateBook={(n) => {
            handleUpdateBook(n)
            setLastEditedNodeId(n.id)
          }}
          onDeleteBook={(nodeId) => {
            handleDeleteBook(nodeId)
            if (selectedNode?.id === nodeId) setSelectedNode(null)
          }}
          onUpdateLink={handleUpdateLink}
          onDeleteLink={handleDeleteLink}
          onMergeBooks={(fromNodeId, intoNodeId) => {
            const merged = handleMergeBooks(fromNodeId, intoNodeId)
            if (!merged) return
            const intoNode = graphData.nodes.find((n) => n.id === intoNodeId)
            setSelectedNode(intoNode || null)
            setPanelTab('details')
          }}
          onClose={() => {
            setTableMode(false)
            setTableInitialTab('books')
            setTableLinkSourceId(null)
            if (lastEditedNodeId) {
              const node = graphData.nodes.find((n) => n.id === lastEditedNodeId)
              if (node) {
                setSelectedNode(node)
                setPanelTab('details')
              }
              setLastEditedNodeId(null)
            }
          }}
          onLastEdited={(nodeId) => setLastEditedNodeId(nodeId)}
          onImportComplete={(nodeIds) => {
            const ids = new Set(nodeIds)
            setFlashNodeIds(ids)
            setTimeout(() => setFlashNodeIds(null), 4000)
          }}
          initialTab={tableInitialTab}
          initialLinkSourceId={tableLinkSourceId}
        />
      )}
    </div>
  )
}

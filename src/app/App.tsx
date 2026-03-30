import { useMemo, useRef } from 'react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import AnalysisPanel, { type AnalysisPanelImperativeHandle } from '@/features/analysis-panel/AnalysisPanel'
import Graph, { type GraphImperativeHandle } from '@/features/graph/Graph'
import Legend from '@/features/graph/Legend'
import Navbar from '@/features/shell/Navbar'
import SidePanel from '@/features/side-panel/SidePanel'
import TableView from '@/features/table/TableView'
import Timeline from '@/features/timeline/Timeline'
import TextsPanel from '@/features/texts-panel/TextsPanel'
import AuthorsPanel from '@/features/authors-panel/AuthorsPanel'
import { AXES_COLORS, axesGradient } from '@/lib/categories'
import { authorName, bookAuthorDisplay, buildAuthorsMap } from '@/lib/authorUtils'
import { computeSameAuthorBooks, getIncomingRefs, getLinkNodes, getOutgoingRefs } from '@/features/graph/graphRelations'
import { useAppTimelineAndLayout } from './useAppTimelineAndLayout'
import { useAppUiState } from './useAppUiState'
import { computeAxisStats } from '@/features/analysis-panel/analysisMetrics'
import { useAppData } from './AppDataContext'

// Pendant la migration, Graph/AnalysisPanel sont encore en `.jsx`.
// TS ne peut pas toujours inférer correctement leurs props via `forwardRef`.
// On cast temporairement pour garder `typecheck` OK jusqu'à leur renommage en `.tsx`.
type AnyProps = Record<string, unknown>
const GraphAny = Graph as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>
const AnalysisPanelAny =
  AnalysisPanel as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>

export default function App() {
  const {
    graphData,
    books,
    authors,
    links,
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleDeleteLink,
    handleUpdateLink,
    handleMergeBooks,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleMigrateData,
  } = useAppData()

  const graphRef = useRef<GraphImperativeHandle | null>(null)
  const analysisPanelRef = useRef<AnalysisPanelImperativeHandle | null>(null)

  const {
    selectedNode,
    setSelectedNode,
    selectedLink,
    setSelectedLink,
    linkContextNode,
    setLinkContextNode,
    panelTab,
    setPanelTab,
    previousPanelTab,
    setPreviousPanelTab,
    textsPanelOpen,
    setTextsPanelOpen,
    authorsPanelOpen,
    setAuthorsPanelOpen,
    openTextsPanel,
    openAuthorsPanel,
    peekNodeId,
    activeFilter,
    hoveredFilter,
    setHoveredFilter,
    selectedAuthor,
    setSelectedAuthor,
    tableMode,
    setTableMode,
    tableInitialTab,
    setTableInitialTab,
    tableLinkSourceId,
    setTableLinkSourceId,
    lastEditedNodeId,
    setLastEditedNodeId,
    flashNodeIds,
    setFlashNodeIds,
    panelOpen,
    handleClosePanel,
    handleOpenTable,
    handleNodeClick,
    handleSelectAuthorFromPanel,
    handleSelectTextFromPanel,
    handlePeekTextOnGraph,
    handleLinkClick,
    toggleFilter,
    clearActiveFilter,
    searchRef,
    globalSearch,
    setGlobalSearch,
    searchFocused,
    setSearchFocused,
    searchResults,
    handleSearchSelect,
  } = useAppUiState(graphData, authors)

  const {
    viewMode,
    handleViewChange,
    setTimelineRange,
    clampedTimelineRange,
    filteredGraphData,
    layoutPositions,
    hasTimelineFilter,
    clearTimelineFilter,
  } = useAppTimelineAndLayout(graphData)

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const authorCount = useMemo(() => {
    if (authors.length > 0) return authors.length
    // Fallback legacy : compter les noms uniques sur les livres
    const names = new Set()
    books.forEach((n) => {
      // Comptage basé sur le nouveau modèle (authorIds + authorsMap)
      // `bookAuthorDisplay` garde un fallback legacy si nécessaire.
      const name = bookAuthorDisplay(n, authorsMap)
      if (name) names.add(name)
    })
    return names.size
  }, [authors, books, authorsMap])

  const sameAuthorBooks = useMemo(
    () => computeSameAuthorBooks(graphData, selectedNode),
    [graphData, selectedNode],
  )

  const axisCountsByAxis = useMemo(() => {
    const stats = computeAxisStats(books)
    return Object.fromEntries(stats.map((s) => [s.axis, s.count]))
  }, [books])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GraphAny
          ref={graphRef}
          graphData={filteredGraphData}
          authors={authors}
          selectedNode={selectedNode}
          selectedAuthorId={selectedAuthor}
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
          authorsMap,
          onOpenTable: handleOpenTable,
        }}
        filters={{
          category: activeFilter,
          clearCategory: clearActiveFilter,
          timelineRange: clampedTimelineRange,
          hasTimelineFilter,
          clearTimelineFilter,
          selectedAuthorId: selectedAuthor,
          selectedAuthorName: selectedAuthor ? authorName(authorsMap.get(selectedAuthor) || {}) : null,
          clearSelectedAuthor: () => setSelectedAuthor(null),
        }}
        view={{
          mode: viewMode,
          onChange: handleViewChange,
          tableMode,
          onToggleTable: () => setTableMode((v) => !v),
        }}
        catalogue={{
          onOpenTexts: openTextsPanel,
          onOpenAuthors: openAuthorsPanel,
          onOpenAnalysis: () => analysisPanelRef.current?.openPanel(),
          graphData,
          authorCount,
        }}
      />

      <Legend
        axisCountsByAxis={axisCountsByAxis}
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
        authors={authors}
        authorsMap={authorsMap}
        AXES_COLORS={AXES_COLORS}
        getOutgoingRefs={(node) => getOutgoingRefs(graphData, node)}
        getIncomingRefs={(node) => getIncomingRefs(graphData, node)}
        getLinkNodes={(link) => getLinkNodes(graphData, link)}
        handleClosePanel={handleClosePanel}
        onUpdateLink={handleUpdateLink}
        onDeleteLink={handleDeleteLink}
        handleAddBook={handleAddBook}
        handleAddAuthor={handleAddAuthor}
        handleAddLink={(link) => {
          handleAddLink(link)
          handleClosePanel()
          graphRef.current?.centerCamera()
        }}
        handleUpdateBook={(n) => {
          handleUpdateBook(n)
          // handleUpdateBook mutates the node in books[] in place (Object.assign).
          // Look up the live node reference from graphData.nodes so selectedNode
          // stays the same object as force-graph's, preventing position divergence
          // (stale x/y copy would cause the node to appear twice on canvas).
          const live = graphData.nodes.find((node) => node.id === n.id)
          if (live) setSelectedNode({ ...live })
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

      <Timeline
        graphData={graphData}
        timelineRange={clampedTimelineRange}
        onRangeChange={setTimelineRange}
      />

      <AnalysisPanelAny
        ref={analysisPanelRef}
        graphData={filteredGraphData}
        activeFilter={activeFilter}
        onFilterChange={toggleFilter}
        onAddLink={handleAddLink}
        showTrigger={false}
        authorsMap={authorsMap}
      />

      <TextsPanel
        open={textsPanelOpen}
        onClose={() => setTextsPanelOpen(false)}
        nodes={graphData.nodes}
        authors={authors}
        onSelectNode={handleSelectTextFromPanel}
        onPeekNode={handlePeekTextOnGraph}
        peekNodeId={peekNodeId}
      />

      <AuthorsPanel
        open={authorsPanelOpen}
        onClose={() => setAuthorsPanelOpen(false)}
        authors={authors}
        books={books}
        selectedAuthorId={selectedAuthor}
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
          nodes={books}
          links={links}
          authors={authors}
          onAddBook={handleAddBook}
          onAddLink={handleAddLink}
          onAddAuthor={handleAddAuthor}
          onUpdateAuthor={handleUpdateAuthor}
          onDeleteAuthor={handleDeleteAuthor}
          onMigrateData={handleMigrateData}
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
            const intoNode = books.find((n) => n.id === intoNodeId)
            setSelectedNode(intoNode || null)
            setPanelTab('details')
          }}
          onClose={() => {
            setTableMode(false)
            setTableInitialTab('books')
            setTableLinkSourceId(null)
            if (lastEditedNodeId) {
              const node = books.find((n) => n.id === lastEditedNodeId)
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
          initialTab={tableInitialTab as 'books' | 'authors' | 'links'}
          initialLinkSourceId={tableLinkSourceId}
        />
      )}
    </div>
  )
}


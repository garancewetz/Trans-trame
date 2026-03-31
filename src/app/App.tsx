import { useRef } from 'react'
import { AnalysisPanel, type AnalysisPanelImperativeHandle } from '@/features/analysis-panel/AnalysisPanel'
import { Graph, type GraphImperativeHandle } from '@/features/graph/Graph'
import { Legend } from '@/features/graph/Legend'
import { Navbar } from '@/features/shell/Navbar'
import { SidePanel } from '@/features/side-panel/SidePanel'
import { TableView } from '@/features/table/TableView'
import { Timeline } from '@/features/timeline/Timeline'
import { TextsPanel } from '@/features/texts-panel/TextsPanel'
import { AuthorsPanel } from '@/features/authors-panel/AuthorsPanel'
import { AXES_COLORS } from '@/lib/categories'
import { useAppData } from './AppDataContext'
import { useAppDerivedData } from './hooks/useAppDerivedData'
import { useAppNavbarProps } from './hooks/useAppNavbarProps'
import { useAppSidePanelProps } from './hooks/useAppSidePanelProps'
import { useAppTableViewProps } from './hooks/useAppTableViewProps'
import { useAppTimelineAndLayout } from './hooks/useAppTimelineAndLayout'
import { useAppUiState } from './hooks/useAppUiState'

export function App() {
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

  const ui = useAppUiState(graphData, authors)
  const timeline = useAppTimelineAndLayout(graphData)
  const derived = useAppDerivedData(graphData, books, authors, ui.selectedNode)

  const navbarProps = useAppNavbarProps({
    searchRef: ui.searchRef,
    globalSearch: ui.globalSearch,
    setGlobalSearch: ui.setGlobalSearch,
    searchFocused: ui.searchFocused,
    setSearchFocused: ui.setSearchFocused,
    searchResults: ui.searchResults,
    handleSearchSelect: ui.handleSearchSelect,
    authorsMap: derived.authorsMap,
    handleOpenTable: ui.handleOpenTable,
    activeFilter: ui.activeFilter,
    clearActiveFilter: ui.clearActiveFilter,
    clampedTimelineRange: timeline.clampedTimelineRange,
    hasTimelineFilter: timeline.hasTimelineFilter,
    clearTimelineFilter: timeline.clearTimelineFilter,
    selectedAuthor: ui.selectedAuthor,
    setSelectedAuthor: ui.setSelectedAuthor,
    viewMode: timeline.viewMode,
    handleViewChange: timeline.handleViewChange,
    tableMode: ui.tableMode,
    setTableMode: ui.setTableMode,
    openTextsPanel: ui.openTextsPanel,
    openAuthorsPanel: ui.openAuthorsPanel,
    analysisPanelRef,
    graphData,
    authorCount: derived.authorCount,
  })

  const sidePanelProps = useAppSidePanelProps({
    graphRef,
    graphData,
    authors,
    authorsMap: derived.authorsMap,
    sameAuthorBooks: derived.sameAuthorBooks,
    panelOpen: ui.panelOpen,
    panelTab: ui.panelTab,
    selectedNode: ui.selectedNode,
    selectedLink: ui.selectedLink,
    linkContextNode: ui.linkContextNode,
    previousPanelTab: ui.previousPanelTab,
    setPreviousPanelTab: ui.setPreviousPanelTab,
    setPanelTab: ui.setPanelTab,
    setSelectedNode: ui.setSelectedNode,
    setSelectedLink: ui.setSelectedLink,
    setLinkContextNode: ui.setLinkContextNode,
    handleClosePanel: ui.handleClosePanel,
    handleOpenTable: ui.handleOpenTable,
    handleAddBook,
    handleAddAuthor,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleMergeBooks,
    handleUpdateLink,
    handleDeleteLink,
  })

  const tableViewProps = useAppTableViewProps({
    books,
    links,
    authors,
    selectedNode: ui.selectedNode,
    tableInitialTab: ui.tableInitialTab,
    tableLinkSourceId: ui.tableLinkSourceId,
    lastEditedNodeId: ui.lastEditedNodeId,
    setLastEditedNodeId: ui.setLastEditedNodeId,
    setSelectedNode: ui.setSelectedNode,
    setPanelTab: ui.setPanelTab,
    setTableMode: ui.setTableMode,
    setTableInitialTab: ui.setTableInitialTab,
    setTableLinkSourceId: ui.setTableLinkSourceId,
    setFlashNodeIds: ui.setFlashNodeIds,
    handleAddBook,
    handleAddLink,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleMigrateData,
    handleUpdateBook,
    handleDeleteBook,
    handleUpdateLink,
    handleDeleteLink,
    handleMergeBooks,
  })

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Graph
          ref={graphRef}
          graphData={timeline.filteredGraphData}
          authors={authors}
          selectedNode={ui.selectedNode}
          selectedAuthorId={ui.selectedAuthor}
          peekNodeId={ui.peekNodeId}
          activeFilter={ui.activeFilter}
          hoveredFilter={ui.hoveredFilter}
          onNodeClick={ui.handleNodeClick}
          onLinkClick={ui.handleLinkClick}
          layoutPositions={timeline.layoutPositions}
          viewMode={timeline.viewMode}
          flashNodeIds={ui.flashNodeIds}
        />
      </div>

      <Navbar {...navbarProps} />

      <Legend
        axisCountsByAxis={derived.axisCountsByAxis}
        axesColors={AXES_COLORS}
        activeFilter={ui.activeFilter}
        hoveredFilter={ui.hoveredFilter}
        toggleFilter={ui.toggleFilter}
        setHoveredFilter={ui.setHoveredFilter}
        clearFilter={ui.clearActiveFilter}
      />

      <SidePanel {...sidePanelProps} />

      <Timeline
        graphData={graphData}
        timelineRange={timeline.clampedTimelineRange}
        onRangeChange={timeline.setTimelineRange}
      />

      <AnalysisPanel
        ref={analysisPanelRef}
        graphData={timeline.filteredGraphData}
        activeFilter={ui.activeFilter}
        onFilterChange={(axis) => {
          if (axis === null) ui.clearActiveFilter()
          else ui.toggleFilter(axis)
        }}
        showTrigger={false}
        authorsMap={derived.authorsMap}
      />

      <TextsPanel
        open={ui.textsPanelOpen}
        onClose={() => ui.setTextsPanelOpen(false)}
        nodes={graphData.nodes}
        authors={authors}
        onSelectNode={ui.handleSelectTextFromPanel}
        onPeekNode={ui.handlePeekTextOnGraph}
        peekNodeId={ui.peekNodeId}
      />

      <AuthorsPanel
        open={ui.authorsPanelOpen}
        onClose={() => ui.setAuthorsPanelOpen(false)}
        authors={authors}
        books={books}
        selectedAuthorId={ui.selectedAuthor}
        onSelectAuthor={ui.handleSelectAuthorFromPanel}
        onAddWorkForAuthor={() => {
          ui.handleOpenTable('books')
          ui.setAuthorsPanelOpen(false)
        }}
        onOpenAddBookFromSearch={() => {
          ui.handleOpenTable('books')
          ui.setAuthorsPanelOpen(false)
        }}
      />

      {ui.tableMode && <TableView {...tableViewProps} />}
    </div>
  )
}

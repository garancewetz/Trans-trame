import { useRef } from 'react'
import { AnalysisPanel, type AnalysisPanelImperativeHandle } from '@/features/analysis-panel/components/AnalysisPanel'
import { Graph, type GraphImperativeHandle } from '@/features/graph/components/Graph'
import { Legend } from '@/features/graph/components/Legend'
import { Navbar } from '@/features/shell/components/Navbar'
import { VisualizationView } from '@/features/visualizations/VisualizationView'
import { SidePanel } from '@/features/side-panel/components/SidePanel'
import { TableView } from '@/features/table/components/TableView'
import { Timeline } from '@/features/timeline/components/Timeline'
import { TextsPanel } from '@/features/texts-panel/components/TextsPanel'
import { AuthorsPanel } from '@/features/authors-panel/components/AuthorsPanel'
import { KeyboardHints } from '@/common/components/ui/KeyboardHints'
import { AXES_COLORS } from '@/common/utils/categories'
import { useAppData } from '@/core/AppDataContext'
import { useAppDerivedData } from '@/common/hooks/useAppDerivedData'
import { useNavbarProps } from '@/features/shell/hooks/useNavbarProps'
import { useSidePanelProps } from '@/features/side-panel/hooks/useSidePanelProps'
import { useTableViewProps } from '@/features/table/hooks/useTableViewProps'
import { useAppTimelineAndLayout } from '@/common/hooks/useAppTimelineAndLayout'
import { useAppUiState } from '@/common/hooks/useAppUiState'
import { useMapUrlSync } from '@/common/hooks/useMapUrlSync'

export function GraphApp() {
  const {
    graphData,
    books,
    authors,
    links,
    isLoading,
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
  useMapUrlSync({
    books,
    links,
    dataReady: !isLoading,
    selectedNode: ui.selectedNode,
    selectedLink: ui.selectedLink,
    linkContextNode: ui.linkContextNode,
    setSelectedNode: ui.setSelectedNode,
    setSelectedLink: ui.setSelectedLink,
    setLinkContextNode: ui.setLinkContextNode,
    setPanelTab: ui.setPanelTab,
  })
  const timeline = useAppTimelineAndLayout(graphData)
  const derived = useAppDerivedData(graphData, books, authors, ui.selectedNode)

  const navbarProps = useNavbarProps({
    searchRef: ui.searchRef,
    globalSearch: ui.globalSearch,
    setGlobalSearch: ui.setGlobalSearch,
    searchFocused: ui.searchFocused,
    setSearchFocused: ui.setSearchFocused,
    searchResults: ui.searchResults,
    handleSearchSelect: ui.handleSearchSelect,
    authorsMap: derived.authorsMap,
    handleOpenTable: ui.handleOpenTable,
    selectedAuthor: ui.selectedAuthor,
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

  const sidePanelProps = useSidePanelProps({
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

  const tableViewProps = useTableViewProps({
    books,
    links,
    authors,
    selectedNode: ui.selectedNode,
    tableInitialTab: ui.tableInitialTab,
    tableLinkSourceId: ui.tableLinkSourceId,
    tableFocusBookId: ui.tableFocusBookId,
    lastEditedNodeId: ui.lastEditedNodeId,
    setLastEditedNodeId: ui.setLastEditedNodeId,
    setSelectedNode: ui.setSelectedNode,
    setSelectedLink: ui.setSelectedLink,
    setLinkContextNode: ui.setLinkContextNode,
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

  const isGraphView = timeline.viewMode === 'constellation'

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        {isGraphView ? (
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
            viewMode={timeline.viewMode}
            flashNodeIds={ui.flashNodeIds}
          />
        ) : (
          <VisualizationView
            viewMode={timeline.viewMode}
            graphData={timeline.filteredGraphData}
            authors={authors}
            selectedNode={ui.selectedNode}
            onNodeClick={ui.handleNodeClick}
            activeFilter={ui.activeFilter}
            hoveredFilter={ui.hoveredFilter}
          />
        )}
      </div>

      <KeyboardHints />

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

      {/* Selected book tooltip — constellation mode only (other views handle their own) */}
      {isGraphView && ui.selectedNode && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/10 bg-bg-overlay/92 px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[14px] font-semibold text-white/90">{ui.selectedNode.title}</div>
          {ui.selectedNode.year && (
            <div className="text-[14px] text-white/40">{ui.selectedNode.year}</div>
          )}
        </div>
      )}

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
        onOpenWorkDetail={(id) => {
          const node = graphData.nodes.find((n) => n.id === id)
          if (!node) return
          ui.setSelectedLink(null)
          ui.setLinkContextNode(null)
          ui.setSelectedNode(node)
          ui.setPanelTab('details')
          ui.setTextsPanelOpen(false)
        }}
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

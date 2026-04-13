import { useCallback, useRef } from 'react'
import type { AnalysisPanelImperativeHandle } from '@/features/analysis-panel/components/AnalysisPanel'
import { AnalysisPanel } from '@/features/analysis-panel/components/AnalysisPanel'
import { Graph, type GraphImperativeHandle } from '@/features/graph/components/Graph'
import { Legend } from '@/features/graph/components/Legend'
import { Navbar } from '@/features/shell/components/Navbar'
import { VisualizationView } from '@/features/visualizations/VisualizationView'
import { SidePanel } from '@/features/side-panel/components/SidePanel'
import { TableView } from '@/features/table/components/TableView'
import { Timeline } from '@/features/timeline/components/Timeline'
import { TextsPanel } from '@/features/texts-panel/components/TextsPanel'
import { AuthorsPanel } from '@/features/authors-panel/components/AuthorsPanel'
import { ActiveFilterBar } from '@/common/components/ActiveFilterBar'
import { KeyboardHints } from '@/common/components/ui/KeyboardHints'
import { LoginModal } from '@/pages/LoginPage'

import { AXES_COLORS } from '@/common/utils/categories'
import { authorName } from '@/common/utils/authorUtils'
import type { Highlight } from '@/core/FilterContext'
import { ErrorBoundary } from '@/common/components/ErrorBoundary'
import { useAppData } from '@/core/AppDataContext'
import { useAppTimelineAndLayout } from '@/common/hooks/useAppTimelineAndLayout'
import { useMapUrlSync } from '@/common/hooks/useMapUrlSync'

import { SelectionProvider, useSelection } from '@/core/SelectionContext'
import { FilterProvider, useFilter } from '@/core/FilterContext'
import { TableUiProvider, useTableUi } from '@/core/TableUiContext'
import { PanelVisibilityProvider, usePanelVisibility } from '@/core/PanelVisibilityContext'

import type { Author, Book } from '@/types/domain'

export function GraphApp() {
  return (
    <SelectionProvider>
      <FilterProvider>
        <TableUiProvider>
          <PanelVisibilityProvider>
            <GraphAppContent />
          </PanelVisibilityProvider>
        </TableUiProvider>
      </FilterProvider>
    </SelectionProvider>
  )
}

function GraphAppContent() {
  const { graphData, authors, authorsMap, axisCountsByAxis } = useAppData()
  const selection = useSelection()
  const filter = useFilter()
  const tableUi = useTableUi()
  const panels = usePanelVisibility()

  const graphRef = useRef<GraphImperativeHandle | null>(null)
  const analysisPanelRef = useRef<AnalysisPanelImperativeHandle | null>(null)
  const timeline = useAppTimelineAndLayout(graphData)
  useMapUrlSync()

  // Compute display label for active highlight
  const highlightLabel = (() => {
    const h = filter.activeHighlight
    if (!h) return null
    switch (h.kind) {
      case 'decade': return `${h.decade}s`
      case 'book': {
        const node = graphData.nodes.find((n) => n.id === h.bookId)
        return node?.title ?? h.bookId
      }
      case 'author': {
        const author = authorsMap.get(h.authorId)
        return author ? authorName(author) : h.authorId
      }
    }
  })()

  // Cross-cutting: node click combines selection + filter
  const handleNodeClick = useCallback(
    (node: Book | Author) => {
      if (node.type === 'author') {
        selection.closePanel()
        filter.toggleSelectedAuthor(node.id)
        return
      }
      selection.toggleNode(node as Book)
      filter.setSelectedAuthor(null)
    },
    [selection, filter],
  )

  const isGraphView = timeline.viewMode === 'constellation'

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          {isGraphView ? (
            <Graph
              ref={graphRef}
              graphData={timeline.filteredGraphData}
              authors={authors}
              selectedNode={selection.selectedNode}
              selectedAuthorId={filter.selectedAuthor}
              peekNodeId={selection.peekNodeId}
              activeFilter={filter.activeFilter}
              activeHighlight={filter.activeHighlight}
              hoveredFilter={filter.hoveredFilter}
              onNodeClick={handleNodeClick}
              onLinkClick={() => {}}
              viewMode={timeline.viewMode}
              flashNodeIds={tableUi.flashNodeIds}
            />
          ) : (
            <VisualizationView
              viewMode={timeline.viewMode}
              graphData={timeline.filteredGraphData}
              authors={authors}
              selectedNode={selection.selectedNode}
              onNodeClick={handleNodeClick}
              activeFilter={filter.activeFilter}
              hoveredFilter={filter.hoveredFilter}
            />
          )}
        </ErrorBoundary>
      </div>

      <KeyboardHints />
      <Navbar
        analysisPanelRef={analysisPanelRef}
        viewMode={timeline.viewMode}
        onViewChange={timeline.handleViewChange}
      />

      <ActiveFilterBar
        activeFilter={filter.activeFilter}
        activeHighlight={filter.activeHighlight}
        highlightLabel={highlightLabel}
        selectedAuthor={filter.selectedAuthor}
        selectedAuthorName={filter.selectedAuthor ? authorName(authorsMap.get(filter.selectedAuthor) ?? {}) || null : null}
        selectedBookTitle={selection.selectedNode?.title ?? null}
        onClearAxis={filter.clearActiveFilter}
        onClearHighlight={filter.clearHighlight}
        onClearAuthor={() => filter.setSelectedAuthor(null)}
        onClearSelectedBook={selection.closePanel}
      />

      <Legend
        axisCountsByAxis={axisCountsByAxis}
        axesColors={AXES_COLORS}
        activeFilter={filter.activeFilter}
        hoveredFilter={filter.hoveredFilter}
        toggleFilter={filter.toggleFilter}
        setHoveredFilter={filter.setHoveredFilter}
        clearFilter={filter.clearActiveFilter}
      />

      <SidePanel />

      <Timeline
        graphData={graphData}
        timelineRange={timeline.clampedTimelineRange}
        onRangeChange={timeline.setTimelineRange}
      />

      <AnalysisPanel
        ref={analysisPanelRef}
        graphData={timeline.filteredGraphData}
        activeFilter={filter.activeFilter}
        activeHighlight={filter.activeHighlight}
        onFilterChange={(axis) => {
          if (axis === null) filter.clearActiveFilter()
          else filter.toggleFilter(axis)
        }}
        onHighlightChange={(h: Highlight | null) => {
          if (h === null) filter.clearHighlight()
          else filter.toggleHighlight(h)
        }}
        showTrigger={false}
        authorsMap={authorsMap}
      />

      <TextsPanel
        open={panels.textsPanelOpen}
        onClose={() => panels.setTextsPanelOpen(false)}
      />

      <AuthorsPanel
        open={panels.authorsPanelOpen}
        onClose={() => panels.setAuthorsPanelOpen(false)}
      />

      {tableUi.tableMode && (
        <ErrorBoundary>
          <TableView />
        </ErrorBoundary>
      )}

      <LoginModal />
    </div>
  )
}

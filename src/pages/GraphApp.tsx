import { useCallback, useEffect } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { AnalysisPanel } from '@/features/analysis-panel/components/AnalysisPanel'
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
import { useAuthActions, useAuthState } from '@/core/AuthContext'
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
  const navigate = useNavigate()
  const adminMatch = useMatch('/admin/*')
  const isAdminRoute = Boolean(adminMatch)
  const { session, canContribute, loading: authLoading } = useAuthState()
  const { requireAuth } = useAuthActions()

  const timeline = useAppTimelineAndLayout(graphData)
  useMapUrlSync({ enabled: !isAdminRoute })

  // Guard: direct entry to /admin without auth → redirect to graph + open modal.
  // Wait for the initial auth check to finish so F5 on /admin doesn't eject
  // a logged-in user before their session is restored.
  useEffect(() => {
    if (!isAdminRoute) return
    if (authLoading) return
    if (session && canContribute) return
    requireAuth()
    navigate('/', { replace: true })
  }, [isAdminRoute, authLoading, session, canContribute, requireAuth, navigate])

  // Right-side mutex: opening AnalysisPanel closes the selection SidePanel,
  // and selecting a node/link closes the AnalysisPanel.
  useEffect(() => {
    if (panels.analysisPanelOpen && (selection.selectedNode || selection.selectedLink)) {
      selection.closePanel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.analysisPanelOpen])

  useEffect(() => {
    if ((selection.selectedNode || selection.selectedLink) && panels.analysisPanelOpen) {
      panels.setAnalysisPanelOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.selectedNode, selection.selectedLink])

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
      case 'citedMin': return `citées ≥ ${h.min}`
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

  const canShowAdmin = isAdminRoute && !authLoading && Boolean(session) && canContribute

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Graph stays mounted while in /admin — TableView overlays on top with
       *  an opaque background, so the browser occludes the graph paint on its
       *  own (no need to toggle `visibility`, which forced a slow style recalc). */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          {/* Raw graphData + timelineRange (pas filteredGraphData) : éviter
            *  que chaque tick de la timeline (play = 120 ms) ne change
            *  l'identité des nodes/links et ne force CosmographView à
            *  reconstruire ses Float32Arrays / re-randomiser les positions.
            *  La timeline est appliquée en interne via greyout. */}
          <VisualizationView
            viewMode={timeline.viewMode}
            graphData={graphData}
            authors={authors}
            selectedNode={selection.selectedNode}
            onNodeClick={handleNodeClick}
            activeAxes={filter.activeAxes}
            hoveredFilter={filter.hoveredFilter}
            activeHighlight={filter.activeHighlight}
            selectedAuthorId={filter.selectedAuthor}
            peekNodeId={selection.peekNodeId}
            flashNodeIds={tableUi.flashNodeIds}
            timelineRange={timeline.timelineRange}
          />
        </ErrorBoundary>
      </div>

      <KeyboardHints />
      <Navbar
        viewMode={timeline.viewMode}
        onViewChange={timeline.handleViewChange}
      />

      <ActiveFilterBar
        activeAxes={filter.activeAxes}
        activeHighlight={filter.activeHighlight}
        highlightLabel={highlightLabel}
        selectedAuthor={filter.selectedAuthor}
        selectedAuthorName={filter.selectedAuthor ? authorName(authorsMap.get(filter.selectedAuthor) ?? {}) || null : null}
        selectedBookTitle={selection.selectedNode?.title ?? null}
        visibleCount={timeline.filteredGraphData.nodes.length}
        totalCount={graphData.nodes.length}
        onToggleAxis={filter.toggleFilter}
        onClearAxes={filter.clearActiveFilter}
        onClearHighlight={filter.clearHighlight}
        onClearAuthor={() => filter.setSelectedAuthor(null)}
        onClearSelectedBook={selection.closePanel}
      />

      <Legend
        axisCountsByAxis={axisCountsByAxis}
        axesColors={AXES_COLORS}
        activeAxes={filter.activeAxes}
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
        graphData={timeline.filteredGraphData}
        activeAxes={filter.activeAxes}
        activeHighlight={filter.activeHighlight}
        onToggleAxis={filter.toggleFilter}
        onClearAxes={filter.clearActiveFilter}
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

      {canShowAdmin && (
        <ErrorBoundary>
          <TableView />
        </ErrorBoundary>
      )}

      <LoginModal />
    </div>
  )
}

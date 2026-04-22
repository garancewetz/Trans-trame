import { forwardRef } from 'react'
import type { Book, Author, GraphData, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { CosmographView, type CosmographImperativeHandle } from './CosmographView'

interface Props {
  viewMode: string
  graphData: GraphData
  authors: Author[]
  selectedNode?: Book | null
  onNodeClick?: (node: Book) => void
  activeAxes?: ReadonlySet<string>
  hoveredFilter?: string | null
  activeHighlight?: Highlight | null
  selectedAuthorId?: string | null
  peekNodeId?: string | null
  flashNodeIds?: Set<string> | null
  timelineRange?: TimelineRange | null
}

export const VisualizationView = forwardRef<CosmographImperativeHandle, Props>(function VisualizationView(
  { viewMode, graphData, authors, selectedNode, onNodeClick, activeAxes, hoveredFilter, activeHighlight, selectedAuthorId, peekNodeId, flashNodeIds, timelineRange },
  ref,
) {
  if (viewMode === 'transmissions' || viewMode === 'categories' || viewMode === 'chronological') {
    // Même composant, trois modes — React réutilise l'instance au switch pour
    // préserver la caméra entre les vues (ne reconstruit pas le Graph cosmos).
    const mode = viewMode === 'categories'
      ? 'categories'
      : viewMode === 'chronological' ? 'chronological' : 'free'
    return (
      <CosmographView
        ref={ref}
        mode={mode}
        graphData={graphData}
        authors={authors}
        selectedNode={selectedNode}
        onNodeClick={onNodeClick}
        activeAxes={activeAxes}
        hoveredFilter={hoveredFilter}
        activeHighlight={activeHighlight}
        selectedAuthorId={selectedAuthorId}
        peekNodeId={peekNodeId}
        flashNodeIds={flashNodeIds}
        timelineRange={timelineRange}
      />
    )
  }
  return null
})

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
  activeFilter?: string | null
  hoveredFilter?: string | null
  activeHighlight?: Highlight | null
  selectedAuthorId?: string | null
  peekNodeId?: string | null
  flashNodeIds?: Set<string> | null
  timelineRange?: TimelineRange | null
}

export const VisualizationView = forwardRef<CosmographImperativeHandle, Props>(function VisualizationView(
  { viewMode, graphData, authors, selectedNode, onNodeClick, activeFilter, hoveredFilter, activeHighlight, selectedAuthorId, peekNodeId, flashNodeIds, timelineRange },
  ref,
) {
  if (viewMode === 'cosmograph' || viewMode === 'categories') {
    // Même composant, deux modes — React réutilise l'instance au switch pour
    // préserver la caméra entre les vues (ne reconstruit pas le Graph cosmos).
    return (
      <CosmographView
        ref={ref}
        mode={viewMode === 'categories' ? 'categories' : 'free'}
        graphData={graphData}
        authors={authors}
        selectedNode={selectedNode}
        onNodeClick={onNodeClick}
        activeFilter={activeFilter}
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

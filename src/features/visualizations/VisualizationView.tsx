import type { Book, Author, GraphData, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { CosmographView } from './CosmographView'

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
  timelineRange?: TimelineRange | null
}

export function VisualizationView({ viewMode, graphData, authors, selectedNode, onNodeClick, activeFilter, hoveredFilter, activeHighlight, selectedAuthorId, timelineRange }: Props) {
  if (viewMode === 'cosmograph' || viewMode === 'territories') {
    // Même composant, deux modes — React réutilise l'instance au switch pour
    // préserver la caméra entre les vues (ne reconstruit pas le Graph cosmos).
    return (
      <CosmographView
        mode={viewMode === 'territories' ? 'territories' : 'free'}
        graphData={graphData}
        authors={authors}
        selectedNode={selectedNode}
        onNodeClick={onNodeClick}
        activeFilter={activeFilter}
        hoveredFilter={hoveredFilter}
        activeHighlight={activeHighlight}
        selectedAuthorId={selectedAuthorId}
        timelineRange={timelineRange}
      />
    )
  }
  return null
}

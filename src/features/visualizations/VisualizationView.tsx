import type { Book, Author, GraphData } from '@/types/domain'
import { CircularDendrogramView } from './CircularDendrogramView'
import { HistCiteView } from './HistCiteView'

interface Props {
  viewMode: string
  graphData: GraphData
  authors: Author[]
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
  hoveredFilter?: string | null
}

export function VisualizationView({ viewMode, graphData, authors, onNodeClick, activeFilter, hoveredFilter }: Props) {
  switch (viewMode) {
    case 'histcite':
      return <HistCiteView graphData={graphData} authors={authors} onNodeClick={onNodeClick} activeFilter={activeFilter} hoveredFilter={hoveredFilter} />
    case 'dendrogram':
      return <CircularDendrogramView graphData={graphData} authors={authors} onNodeClick={onNodeClick} activeFilter={activeFilter} hoveredFilter={hoveredFilter} />
    default:
      return null
  }
}

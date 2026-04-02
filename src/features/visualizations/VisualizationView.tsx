import type { Book, Author, GraphData } from '@/types/domain'
import { CircularDendrogramView } from './CircularDendrogramView'
import { HistCiteView } from './HistCiteView'

interface Props {
  viewMode: string
  graphData: GraphData
  authors: Author[]
  onNodeClick?: (node: Book) => void
}

export function VisualizationView({ viewMode, graphData, authors, onNodeClick }: Props) {
  switch (viewMode) {
    case 'histcite':
      return <HistCiteView graphData={graphData} authors={authors} onNodeClick={onNodeClick} />
    case 'dendrogram':
      return <CircularDendrogramView graphData={graphData} authors={authors} onNodeClick={onNodeClick} />
    default:
      return null
  }
}

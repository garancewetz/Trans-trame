import type { Book, GraphData } from '@/types/domain'
import { AlluvialView } from './AlluvialView'
import { CircularDendrogramView } from './CircularDendrogramView'
import { HistCiteView } from './HistCiteView'

interface Props {
  viewMode: string
  graphData: GraphData
  onNodeClick?: (node: Book) => void
}

export function VisualizationView({ viewMode, graphData, onNodeClick }: Props) {
  switch (viewMode) {
    case 'histcite':
      return <HistCiteView graphData={graphData} onNodeClick={onNodeClick} />
    case 'alluvial':
      return <AlluvialView graphData={graphData} onNodeClick={onNodeClick} />
    case 'dendrogram':
      return <CircularDendrogramView graphData={graphData} onNodeClick={onNodeClick} />
    default:
      return null
  }
}

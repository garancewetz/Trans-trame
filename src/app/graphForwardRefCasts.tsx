import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import AnalysisPanel from '@/features/analysis-panel/AnalysisPanel'
import Graph from '@/features/graph/Graph'

// Pendant la migration, Graph/AnalysisPanel sont encore en `.jsx`.
// TS ne peut pas toujours inférer correctement leurs props via `forwardRef`.
// On cast temporairement pour garder `typecheck` OK jusqu'à leur renommage en `.tsx`.
type AnyProps = Record<string, unknown>

export const GraphAny = Graph as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>
export const AnalysisPanelAny =
  AnalysisPanel as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>

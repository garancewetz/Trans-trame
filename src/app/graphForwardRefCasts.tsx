import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import AnalysisPanel from '@/features/analysis-panel/AnalysisPanel'
import Graph from '@/features/graph/Graph'

type AnyProps = Record<string, unknown>

export const GraphAny = Graph as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>
export const AnalysisPanelAny =
  AnalysisPanel as unknown as ForwardRefExoticComponent<AnyProps & RefAttributes<unknown>>

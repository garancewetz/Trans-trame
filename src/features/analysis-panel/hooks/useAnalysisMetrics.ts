import { useMemo } from 'react'
import type { AuthorNode } from '@/common/utils/authorUtils'
import {
  computePanorama,
  computeAxisStats,
  computeDecades,
  computeMostCitedWorks,
  computeTopAuthors,
  computeMaillage,
  computeInterAxisBridges,
  computeArchipelagos,
} from '../analysisMetrics'

type AnyBook = { id: string; title?: string; year?: number | null; axes?: string[]; authorIds?: string[] }
type AnyLink = { source: unknown; target: unknown }

export function useAnalysisMetrics(
  bookNodes: AnyBook[],
  links: AnyLink[],
  authorsMap: Map<string, AuthorNode>,
) {
  const panorama = useMemo(() => computePanorama(bookNodes, links, authorsMap), [bookNodes, links, authorsMap])
  const axisStats = useMemo(() => computeAxisStats(bookNodes), [bookNodes])
  const decades = useMemo(() => computeDecades(bookNodes), [bookNodes])
  const mostCited = useMemo(() => computeMostCitedWorks(bookNodes, links), [bookNodes, links])
  const topAuthors = useMemo(() => computeTopAuthors(bookNodes, authorsMap), [bookNodes, authorsMap])
  const maillage = useMemo(() => computeMaillage(bookNodes, links), [bookNodes, links])
  const bridges = useMemo(() => computeInterAxisBridges(bookNodes, links), [bookNodes, links])
  const archipelagos = useMemo(() => computeArchipelagos(bookNodes, links), [bookNodes, links])

  return { panorama, axisStats, decades, mostCited, topAuthors, maillage, bridges, archipelagos }
}

import { useMemo } from 'react'
import { bookAuthorDisplay, buildAuthorsMap } from '@/common/utils/authorUtils'
import { computeAxisStats } from '@/features/analysis-panel/analysisMetrics'
import { computeSameAuthorBooks } from '@/features/graph/graphRelations'
import type { Author, Book, GraphData } from '@/types/domain'

export function useAppDerivedData(
  graphData: GraphData,
  books: Book[],
  authors: Author[],
  selectedNode: Book | null,
) {
  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const authorCount = useMemo(() => {
    if (authors.length > 0) return authors.length
    const names = new Set<string>()
    books.forEach((n) => {
      const name = bookAuthorDisplay(n, authorsMap)
      if (name) names.add(name)
    })
    return names.size
  }, [authors, books, authorsMap])

  const sameAuthorBooks = useMemo(
    () => computeSameAuthorBooks(graphData, selectedNode),
    [graphData, selectedNode],
  )

  const axisCountsByAxis = useMemo(() => {
    const stats = computeAxisStats(books)
    return Object.fromEntries(stats.map((s) => [s.axis, s.count]))
  }, [books])

  return { authorsMap, authorCount, sameAuthorBooks, axisCountsByAxis }
}

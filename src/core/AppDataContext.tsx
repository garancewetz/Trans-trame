import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AXES_COLORS } from '@/common/utils/categories'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { computeAxisStats } from '@/features/analysis-panel/analysisMetrics'
import { useGraphData } from '@/features/graph/hooks/useGraphData'
import type { AuthorNode } from '@/common/utils/authorUtils'

type GraphData = ReturnType<typeof useGraphData>

type AppDataValue = {
  graphData: GraphData['graphData']
  books: GraphData['books']
  authors: GraphData['authors']
  links: GraphData['links']
  authorNotDuplicatePairs: GraphData['authorNotDuplicatePairs']
  isLoading: GraphData['isLoading']
  isError: GraphData['isError']
  authorsMap: Map<string, AuthorNode>
  authorCount: number
  axisCountsByAxis: Record<string, number>
}

type AppMutationsValue = {
  handleAddBook: GraphData['handleAddBook']
  handleUpdateBook: GraphData['handleUpdateBook']
  handleDeleteBook: GraphData['handleDeleteBook']
  handleAddAuthor: GraphData['handleAddAuthor']
  handleUpdateAuthor: GraphData['handleUpdateAuthor']
  handleDeleteAuthor: GraphData['handleDeleteAuthor']
  handleAddLink: GraphData['handleAddLink']
  handleAddLinks: GraphData['handleAddLinks']
  handleDeleteLink: GraphData['handleDeleteLink']
  handleUpdateLink: GraphData['handleUpdateLink']
  handleAddCitation: GraphData['handleAddCitation']
  handleUpdateCitation: GraphData['handleUpdateCitation']
  handleDeleteCitation: GraphData['handleDeleteCitation']
  handleMergeBooks: GraphData['handleMergeBooks']
  handleMigrateData: GraphData['handleMigrateData']
  markAuthorsNotDuplicate: GraphData['markAuthorsNotDuplicate']
  unmarkAuthorsNotDuplicate: GraphData['unmarkAuthorsNotDuplicate']
  resetToDefault: GraphData['resetToDefault']
}

const AppDataContext = createContext<AppDataValue | null>(null)
const AppMutationsContext = createContext<AppMutationsValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const data = useGraphData({ axesColors: AXES_COLORS })

  const authorsMap = useMemo(() => buildAuthorsMap(data.authors), [data.authors])

  const authorCount = useMemo(() => {
    if (data.authors.length > 0) return data.authors.length
    const names = new Set<string>()
    data.books.forEach((n) => {
      const name = bookAuthorDisplay(n, authorsMap)
      if (name) names.add(name)
    })
    return names.size
  }, [data.authors, data.books, authorsMap])

  const axisCountsByAxis = useMemo(() => {
    const stats = computeAxisStats(data.books)
    return Object.fromEntries(stats.map((s) => [s.axis, s.count]))
  }, [data.books])

  const dataValue = useMemo<AppDataValue>(
    () => ({
      graphData: data.graphData,
      books: data.books,
      authors: data.authors,
      links: data.links,
      authorNotDuplicatePairs: data.authorNotDuplicatePairs,
      isLoading: data.isLoading,
      isError: data.isError,
      authorsMap,
      authorCount,
      axisCountsByAxis,
    }),
    [
      data.graphData,
      data.books,
      data.authors,
      data.links,
      data.authorNotDuplicatePairs,
      data.isLoading,
      data.isError,
      authorsMap,
      authorCount,
      axisCountsByAxis,
    ],
  )

  const mutationsValue = useMemo<AppMutationsValue>(
    () => ({
      handleAddBook: data.handleAddBook,
      handleUpdateBook: data.handleUpdateBook,
      handleDeleteBook: data.handleDeleteBook,
      handleAddAuthor: data.handleAddAuthor,
      handleUpdateAuthor: data.handleUpdateAuthor,
      handleDeleteAuthor: data.handleDeleteAuthor,
      handleAddLink: data.handleAddLink,
      handleAddLinks: data.handleAddLinks,
      handleDeleteLink: data.handleDeleteLink,
      handleUpdateLink: data.handleUpdateLink,
      handleAddCitation: data.handleAddCitation,
      handleUpdateCitation: data.handleUpdateCitation,
      handleDeleteCitation: data.handleDeleteCitation,
      handleMergeBooks: data.handleMergeBooks,
      handleMigrateData: data.handleMigrateData,
      markAuthorsNotDuplicate: data.markAuthorsNotDuplicate,
      unmarkAuthorsNotDuplicate: data.unmarkAuthorsNotDuplicate,
      resetToDefault: data.resetToDefault,
    }),
    [
      data.handleAddBook,
      data.handleUpdateBook,
      data.handleDeleteBook,
      data.handleAddAuthor,
      data.handleUpdateAuthor,
      data.handleDeleteAuthor,
      data.handleAddLink,
      data.handleAddLinks,
      data.handleDeleteLink,
      data.handleUpdateLink,
      data.handleAddCitation,
      data.handleUpdateCitation,
      data.handleDeleteCitation,
      data.handleMergeBooks,
      data.handleMigrateData,
      data.markAuthorsNotDuplicate,
      data.unmarkAuthorsNotDuplicate,
      data.resetToDefault,
    ],
  )

  return (
    <AppDataContext.Provider value={dataValue}>
      <AppMutationsContext.Provider value={mutationsValue}>{children}</AppMutationsContext.Provider>
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within <AppDataProvider>')
  return ctx
}

export function useAppMutations() {
  const ctx = useContext(AppMutationsContext)
  if (!ctx) throw new Error('useAppMutations must be used within <AppDataProvider>')
  return ctx
}

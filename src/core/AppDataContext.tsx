import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AXES_COLORS } from '@/common/utils/categories'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { computeAxisStats } from '@/features/analysis-panel/analysisMetrics'
import { useGraphData } from '@/features/graph/hooks/useGraphData'
import type { AuthorNode } from '@/common/utils/authorUtils'

type AppDataValue = ReturnType<typeof useGraphData> & {
  authorsMap: Map<string, AuthorNode>
  authorCount: number
  axisCountsByAxis: Record<string, number>
}

const AppDataContext = createContext<AppDataValue | null>(null)

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

  const value = useMemo(
    () => ({ ...data, authorsMap, authorCount, axisCountsByAxis }),
    [data, authorsMap, authorCount, axisCountsByAxis],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within <AppDataProvider>')
  return ctx
}

import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type FilterContextValue = {
  activeFilter: string | null
  hoveredFilter: string | null
  selectedAuthor: string | null
  setActiveFilter: (v: string | null) => void
  setHoveredFilter: (v: string | null) => void
  setSelectedAuthor: (v: string | null) => void
  toggleFilter: (axis: string) => void
  clearActiveFilter: () => void
  toggleSelectedAuthor: (authorId: string) => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)

  const toggleFilter = useCallback(
    (axis: string) => setActiveFilter((prev) => (prev === axis ? null : axis)),
    [],
  )
  const clearActiveFilter = useCallback(() => setActiveFilter(null), [])
  const toggleSelectedAuthor = useCallback(
    (authorId: string) => setSelectedAuthor((prev) => (prev === authorId ? null : authorId)),
    [],
  )

  return (
    <FilterContext.Provider
      value={{
        activeFilter, hoveredFilter, selectedAuthor,
        setActiveFilter, setHoveredFilter, setSelectedAuthor,
        toggleFilter, clearActiveFilter, toggleSelectedAuthor,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilter must be inside <FilterProvider>')
  return ctx
}

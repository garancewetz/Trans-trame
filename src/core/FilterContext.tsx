import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterState = {
  activeFilter: string | null
  hoveredFilter: string | null
  selectedAuthor: string | null
}

type FilterActions = {
  setActiveFilter: (v: string | null) => void
  setHoveredFilter: (v: string | null) => void
  setSelectedAuthor: (v: string | null) => void
  toggleFilter: (axis: string) => void
  clearActiveFilter: () => void
  toggleSelectedAuthor: (authorId: string) => void
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const FilterStateContext = createContext<FilterState | null>(null)
const FilterActionsContext = createContext<FilterActions | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

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

  const state = useMemo<FilterState>(() => ({
    activeFilter, hoveredFilter, selectedAuthor,
  }), [activeFilter, hoveredFilter, selectedAuthor])

  const actions = useMemo<FilterActions>(() => ({
    setActiveFilter, setHoveredFilter, setSelectedAuthor,
    toggleFilter, clearActiveFilter, toggleSelectedAuthor,
  }), [toggleFilter, clearActiveFilter, toggleSelectedAuthor])

  return (
    <FilterActionsContext.Provider value={actions}>
      <FilterStateContext.Provider value={state}>
        {children}
      </FilterStateContext.Provider>
    </FilterActionsContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Reactive filter state. */
export function useFilterState() {
  const ctx = useContext(FilterStateContext)
  if (!ctx) throw new Error('useFilterState must be inside <FilterProvider>')
  return ctx
}

/** Stable filter callbacks — never triggers re-renders. */
export function useFilterActions() {
  const ctx = useContext(FilterActionsContext)
  if (!ctx) throw new Error('useFilterActions must be inside <FilterProvider>')
  return ctx
}

/** Combined hook (backward compatible). */
export function useFilter() {
  return { ...useFilterState(), ...useFilterActions() }
}

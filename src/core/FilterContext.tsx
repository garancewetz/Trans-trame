import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Highlight =
  | { kind: 'decade'; decade: number }
  | { kind: 'book'; bookId: string }
  | { kind: 'author'; authorId: string }

type FilterState = {
  activeFilter: string | null
  activeHighlight: Highlight | null
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
  toggleHighlight: (h: Highlight) => void
  clearHighlight: () => void
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const FilterStateContext = createContext<FilterState | null>(null)
const FilterActionsContext = createContext<FilterActions | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

function highlightEquals(a: Highlight, b: Highlight): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'decade') return a.decade === (b as { kind: 'decade'; decade: number }).decade
  if (a.kind === 'book') return a.bookId === (b as { kind: 'book'; bookId: string }).bookId
  return a.authorId === (b as { kind: 'author'; authorId: string }).authorId
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeFilter, setActiveFilterRaw] = useState<string | null>(null)
  const [activeHighlight, setActiveHighlightRaw] = useState<Highlight | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)

  // Mutual exclusion: setting axis filter clears highlight and vice-versa
  const setActiveFilter = useCallback((v: string | null) => {
    setActiveFilterRaw(v)
    if (v) setActiveHighlightRaw(null)
  }, [])

  const toggleFilter = useCallback(
    (axis: string) => {
      setActiveFilterRaw((prev) => {
        const next = prev === axis ? null : axis
        if (next) setActiveHighlightRaw(null)
        return next
      })
    },
    [],
  )
  const clearActiveFilter = useCallback(() => setActiveFilterRaw(null), [])

  const toggleHighlight = useCallback(
    (h: Highlight) => {
      setActiveHighlightRaw((prev) => {
        const next = prev && highlightEquals(prev, h) ? null : h
        if (next) setActiveFilterRaw(null)
        return next
      })
    },
    [],
  )
  const clearHighlight = useCallback(() => setActiveHighlightRaw(null), [])

  const toggleSelectedAuthor = useCallback(
    (authorId: string) => setSelectedAuthor((prev) => (prev === authorId ? null : authorId)),
    [],
  )

  const state = useMemo<FilterState>(() => ({
    activeFilter, activeHighlight, hoveredFilter, selectedAuthor,
  }), [activeFilter, activeHighlight, hoveredFilter, selectedAuthor])

  const actions = useMemo<FilterActions>(() => ({
    setActiveFilter, setHoveredFilter, setSelectedAuthor,
    toggleFilter, clearActiveFilter, toggleSelectedAuthor,
    toggleHighlight, clearHighlight,
  }), [setActiveFilter, toggleFilter, clearActiveFilter, toggleSelectedAuthor, toggleHighlight, clearHighlight])

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
function useFilterState() {
  const ctx = useContext(FilterStateContext)
  if (!ctx) throw new Error('useFilterState must be inside <FilterProvider>')
  return ctx
}

/** Stable filter callbacks — never triggers re-renders. */
function useFilterActions() {
  const ctx = useContext(FilterActionsContext)
  if (!ctx) throw new Error('useFilterActions must be inside <FilterProvider>')
  return ctx
}

/** Combined hook (backward compatible). */
export function useFilter() {
  return { ...useFilterState(), ...useFilterActions() }
}

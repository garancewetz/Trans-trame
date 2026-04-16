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
  if (a.kind === 'decade' && b.kind === 'decade') return a.decade === b.decade
  if (a.kind === 'book' && b.kind === 'book') return a.bookId === b.bookId
  if (a.kind === 'author' && b.kind === 'author') return a.authorId === b.authorId
  return false
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeFilter, setActiveFilterRaw] = useState<string | null>(null)
  const [activeHighlight, setActiveHighlightRaw] = useState<Highlight | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthorRaw] = useState<string | null>(null)

  // Mutual exclusion: a single filter dimension at a time.
  // Setting any of axis / highlight / author clears the other two.
  const setActiveFilter = useCallback((v: string | null) => {
    setActiveFilterRaw(v)
    if (v) {
      setActiveHighlightRaw(null)
      setSelectedAuthorRaw(null)
    }
  }, [])

  const toggleFilter = useCallback(
    (axis: string) => {
      setActiveFilterRaw((prev) => {
        const next = prev === axis ? null : axis
        if (next) {
          setActiveHighlightRaw(null)
          setSelectedAuthorRaw(null)
        }
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
        if (next) {
          setActiveFilterRaw(null)
          setSelectedAuthorRaw(null)
        }
        return next
      })
    },
    [],
  )
  const clearHighlight = useCallback(() => setActiveHighlightRaw(null), [])

  const setSelectedAuthor = useCallback((v: string | null) => {
    setSelectedAuthorRaw(v)
    if (v) {
      setActiveFilterRaw(null)
      setActiveHighlightRaw(null)
    }
  }, [])

  const toggleSelectedAuthor = useCallback(
    (authorId: string) => {
      setSelectedAuthorRaw((prev) => {
        const next = prev === authorId ? null : authorId
        if (next) {
          setActiveFilterRaw(null)
          setActiveHighlightRaw(null)
        }
        return next
      })
    },
    [],
  )

  const state = useMemo<FilterState>(() => ({
    activeFilter, activeHighlight, hoveredFilter, selectedAuthor,
  }), [activeFilter, activeHighlight, hoveredFilter, selectedAuthor])

  const actions = useMemo<FilterActions>(() => ({
    setActiveFilter, setHoveredFilter, setSelectedAuthor,
    toggleFilter, clearActiveFilter, toggleSelectedAuthor,
    toggleHighlight, clearHighlight,
  }), [setActiveFilter, setSelectedAuthor, toggleFilter, clearActiveFilter, toggleSelectedAuthor, toggleHighlight, clearHighlight])

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

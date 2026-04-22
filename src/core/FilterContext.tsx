import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Highlight =
  | { kind: 'decade'; decade: number }
  | { kind: 'book'; bookId: string }
  | { kind: 'author'; authorId: string }
  | { kind: 'citedMin'; min: number }

type FilterState = {
  // Axes actifs — multi-sélection (OR). Set vide = pas de filtre. Passer à
  // multi-axes rend le filtre capable d'exprimer une lecture intersectionnelle
  // (ex. Queer ∪ Afrofeminism) au lieu d'obliger à choisir un seul axe.
  activeAxes: ReadonlySet<string>
  activeHighlight: Highlight | null
  hoveredFilter: string | null
  selectedAuthor: string | null
}

type FilterActions = {
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
const EMPTY_AXES: ReadonlySet<string> = new Set()

// ── Provider ──────────────────────────────────────────────────────────────────

function highlightEquals(a: Highlight, b: Highlight): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'decade' && b.kind === 'decade') return a.decade === b.decade
  if (a.kind === 'book' && b.kind === 'book') return a.bookId === b.bookId
  if (a.kind === 'author' && b.kind === 'author') return a.authorId === b.authorId
  if (a.kind === 'citedMin' && b.kind === 'citedMin') return a.min === b.min
  return false
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeAxes, setActiveAxes] = useState<ReadonlySet<string>>(EMPTY_AXES)
  const [activeHighlight, setActiveHighlightRaw] = useState<Highlight | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthorRaw] = useState<string | null>(null)

  // Mutual exclusion: axis filter vs highlight vs author — une seule dimension
  // à la fois. Multi-axes reste possible à l'intérieur de la dimension "axis".
  const toggleFilter = useCallback(
    (axis: string) => {
      setActiveAxes((prev) => {
        const next = new Set(prev)
        if (next.has(axis)) next.delete(axis)
        else next.add(axis)
        if (next.size > 0) {
          setActiveHighlightRaw(null)
          setSelectedAuthorRaw(null)
        }
        return next
      })
    },
    [],
  )
  const clearActiveFilter = useCallback(() => setActiveAxes(EMPTY_AXES), [])

  const toggleHighlight = useCallback(
    (h: Highlight) => {
      setActiveHighlightRaw((prev) => {
        const next = prev && highlightEquals(prev, h) ? null : h
        if (next) {
          setActiveAxes(EMPTY_AXES)
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
      setActiveAxes(EMPTY_AXES)
      setActiveHighlightRaw(null)
    }
  }, [])

  const toggleSelectedAuthor = useCallback(
    (authorId: string) => {
      setSelectedAuthorRaw((prev) => {
        const next = prev === authorId ? null : authorId
        if (next) {
          setActiveAxes(EMPTY_AXES)
          setActiveHighlightRaw(null)
        }
        return next
      })
    },
    [],
  )

  const state = useMemo<FilterState>(() => ({
    activeAxes, activeHighlight, hoveredFilter, selectedAuthor,
  }), [activeAxes, activeHighlight, hoveredFilter, selectedAuthor])

  const actions = useMemo<FilterActions>(() => ({
    setHoveredFilter, setSelectedAuthor,
    toggleFilter, clearActiveFilter, toggleSelectedAuthor,
    toggleHighlight, clearHighlight,
  }), [setSelectedAuthor, toggleFilter, clearActiveFilter, toggleSelectedAuthor, toggleHighlight, clearHighlight])

  return (
    <FilterActionsContext.Provider value={actions}>
      <FilterStateContext.Provider value={state}>
        {children}
      </FilterStateContext.Provider>
    </FilterActionsContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useFilterState() {
  const ctx = useContext(FilterStateContext)
  if (!ctx) throw new Error('useFilterState must be inside <FilterProvider>')
  return ctx
}

function useFilterActions() {
  const ctx = useContext(FilterActionsContext)
  if (!ctx) throw new Error('useFilterActions must be inside <FilterProvider>')
  return ctx
}

export function useFilter() {
  const state = useFilterState()
  const actions = useFilterActions()
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}

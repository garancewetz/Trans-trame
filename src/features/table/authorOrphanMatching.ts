import type { Author, Book } from '@/types/domain'

export type Match = {
  book: Book
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export type OrphanEntry = {
  author: Author
  matches: Match[]
}

// ── Find candidate books for an orphaned author ──────────────────────────
// Legacy first_name/last_name columns dropped (migration 20260419_books_to_resources).
// Orphan matching requires a new strategy (e.g. manual selection or title fuzzy match).

export function findMatches(_author: Author, _books: Book[]): Match[] {
  return []
}

// ── Confidence badge styles ──────────────────────────────────────────────

export const CONF_STYLE = {
  high: 'border-green/25 bg-green/10 text-green/80',
  medium: 'border-amber/25 bg-amber/10 text-amber/80',
  low: 'border-white/12 bg-white/4 text-white/50',
} as const

export const CONF_LABEL = { high: 'fort', medium: 'moyen', low: 'faible' } as const

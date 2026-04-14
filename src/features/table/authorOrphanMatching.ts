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

// ── String normalization ─────────────────────────────────────────────────

function norm(s: unknown): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

// ── Levenshtein (capped at 3 for early exit) ─────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > 2) return 3
  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// ── Find candidate books for an orphaned author ──────────────────────────

export function findMatches(author: Author, books: Book[]): Match[] {
  const authFn = norm(author.firstName)
  const authLn = norm(author.lastName)
  if (!authLn) return []

  const matches: Match[] = []

  for (const book of books) {
    if (book.authorIds?.includes(author.id)) continue

    const bookFn = norm(book.firstName)
    const bookLn = norm(book.lastName)

    if (bookLn && authLn === bookLn && authFn && bookFn && authFn === bookFn) {
      matches.push({ book, confidence: 'high', reason: 'Correspondance exacte (champs legacy)' })
      continue
    }

    if (bookLn && authLn === bookLn) {
      matches.push({ book, confidence: 'medium', reason: 'Même nom de famille (champs legacy)' })
      continue
    }

    if (bookLn && authLn.length >= 3 && levenshtein(authLn, bookLn) <= 1) {
      matches.push({ book, confidence: 'low', reason: 'Nom similaire (champs legacy)' })
    }
  }

  const order = { high: 0, medium: 1, low: 2 }
  matches.sort((a, b) => order[a.confidence] - order[b.confidence])
  return matches
}

// ── Confidence badge styles ──────────────────────────────────────────────

export const CONF_STYLE = {
  high: 'border-green/25 bg-green/10 text-green/80',
  medium: 'border-amber/25 bg-amber/10 text-amber/80',
  low: 'border-white/12 bg-white/4 text-white/50',
} as const

export const CONF_LABEL = { high: 'fort', medium: 'moyen', low: 'faible' } as const

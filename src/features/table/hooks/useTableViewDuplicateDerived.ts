import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Author, Book, Link } from '@/types/domain'
import { maybeNodeId } from '../maybeNodeId'

type AuthorNodeLike = Pick<Author, 'id' | 'firstName' | 'lastName'>

/**
 * A detected duplicate group of books, tagged by how the match was established.
 *
 * - `exact`     — same normalized title AND same author display string.
 *                 High precision, but rigid (misses translations, subtitle
 *                 variants, typos).
 * - `canonical` — same LLM-provided `originalTitle` (the canonical title in
 *                 the work's original language). Catches editions and
 *                 translations that `exact` would miss. Lower precision, since
 *                 it depends on the LLM's recognition of the work — the UI
 *                 should surface this confidence level to the user.
 */
export type DuplicateGroup = { kind: 'exact' | 'canonical'; books: Book[] }

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  // Early exit: if length difference already exceeds threshold, skip computation
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

function normalize(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

export function useTableViewDuplicateDerived(
  nodes: Book[],
  links: Link[],
  authors: Author[],
  authorsMap: Map<string, AuthorNodeLike>
) {
  const orphans = useMemo(() => {
    const linked = new Set<string>()
    links.forEach((l) => {
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (s) linked.add(s)
      if (t) linked.add(t)
    })
    return nodes.filter((n) => !linked.has(n.id))
  }, [nodes, links])

  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const groups: DuplicateGroup[] = []
    const claimed = new Set<string>()

    // Pass 1 — canonical match via originalTitle.
    // Runs first because it catches broader equivalences (editions, translations).
    // Books grouped here are excluded from Pass 2 to avoid overlapping groups.
    const byOriginal = new Map<string, Book[]>()
    for (const n of nodes) {
      const key = normalize(n.originalTitle)
      if (!key) continue
      const arr = byOriginal.get(key)
      if (arr) arr.push(n)
      else byOriginal.set(key, [n])
    }
    for (const group of byOriginal.values()) {
      if (group.length < 2) continue
      group.forEach((b) => claimed.add(b.id))
      groups.push({ kind: 'canonical', books: group })
    }

    // Pass 2 — exact match on normalized title + author display, among books
    // not already claimed by the canonical pass.
    const byTitleAuthor = new Map<string, Book[]>()
    for (const n of nodes) {
      if (claimed.has(n.id)) continue
      const key = `${normalize(n.title)}|||${normalize(bookAuthorDisplay(n, authorsMap))}`
      const arr = byTitleAuthor.get(key)
      if (arr) arr.push(n)
      else byTitleAuthor.set(key, [n])
    }
    for (const group of byTitleAuthor.values()) {
      if (group.length < 2) continue
      groups.push({ kind: 'exact', books: group })
    }

    return groups
  }, [nodes, authorsMap])

  const orphanedAuthors = useMemo(() => {
    const linked = new Set<string>()
    nodes.forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => linked.add(aid))
    })
    return authors.filter((a) => !linked.has(a.id))
  }, [nodes, authors])

  const authorDuplicateGroups = useMemo(() => {
    const norm = (s: unknown) =>
      String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/g, '').trim()
    const fullName = (a: Author) => {
      const words = `${norm(a.firstName)} ${norm(a.lastName)}`.split(/\s+/).filter(Boolean).sort()
      return words.join(' ')
    }

    // Pass 1: exact match on sorted normalized full name
    const exactMap = new Map<string, Author[]>()
    ;(authors || []).forEach((a) => {
      const key = fullName(a)
      if (!key) return
      if (!exactMap.has(key)) exactMap.set(key, [])
      exactMap.get(key)!.push(a)
    })

    const merged = new Set<string>()
    const groups: Author[][] = []

    // Collect exact-match groups
    for (const group of exactMap.values()) {
      if (group.length > 1) {
        group.forEach((a) => merged.add(a.id))
        groups.push(group)
      }
    }

    // Pass 2: fuzzy match on remaining authors (catch firstName/lastName swaps and typos)
    const remaining = (authors || []).filter((a) => !merged.has(a.id) && fullName(a))
    for (let i = 0; i < remaining.length; i++) {
      if (merged.has(remaining[i].id)) continue
      const nameI = fullName(remaining[i])
      const fuzzyGroup: Author[] = [remaining[i]]
      for (let j = i + 1; j < remaining.length; j++) {
        if (merged.has(remaining[j].id)) continue
        const nameJ = fullName(remaining[j])
        // One name contains the other, or very close edit distance
        if (
          nameI.includes(nameJ) ||
          nameJ.includes(nameI) ||
          (nameI.length >= 4 && nameJ.length >= 4 && levenshtein(nameI, nameJ) <= 2)
        ) {
          fuzzyGroup.push(remaining[j])
        }
      }
      if (fuzzyGroup.length > 1) {
        fuzzyGroup.forEach((a) => merged.add(a.id))
        groups.push(fuzzyGroup)
      }
    }

    return groups
  }, [authors])

  /** Ouvrages sans aucun·e auteur·ice assigné·e (authorIds vide ou absent). */
  const booksWithoutAuthors = useMemo(
    () => nodes.filter((b) => !b.authorIds || b.authorIds.length === 0),
    [nodes],
  )

  const todoCount = useMemo(() => {
    const bookTodos = nodes.filter((b) => b.todo).length
    const authorTodos = authors.filter((a) => a.todo).length
    return bookTodos + authorTodos
  }, [nodes, authors])

  return { orphans, duplicateGroups, authorDuplicateGroups, orphanedAuthors, booksWithoutAuthors, todoCount }
}

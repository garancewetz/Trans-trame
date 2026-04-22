import { useEffect, useMemo, useState } from 'react'
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

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function useTableViewDuplicateDerived(
  nodes: Book[],
  links: Link[],
  authors: Author[],
  authorsMap: Map<string, AuthorNodeLike>,
  authorNotDuplicatePairs: Array<[string, string]> = [],
) {
  const notDupKeys = useMemo(
    () => new Set(authorNotDuplicatePairs.map(([a, b]) => pairKey(a, b))),
    [authorNotDuplicatePairs],
  )

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

  // Heavy O(n²) fuzzy match — defer past first paint so TableView mount is not
  // blocked by it. Mount renders with []; the compute runs on a macrotask,
  // then a second render shows the real count. Users see ~1s lag on the
  // "N doublons" counter, never on navigation.
  const authorDuplicateGroups = useDeferredAuthorDuplicates(authors, notDupKeys)

  /** Ressources sans aucun·e auteur·ice assigné·e (authorIds vide ou absent). */
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

function useDeferredAuthorDuplicates(authors: Author[], notDupKeys: Set<string>): Author[][] {
  const [groups, setGroups] = useState<Author[][]>([])
  useEffect(() => {
    const id = setTimeout(() => setGroups(computeAuthorDuplicateGroups(authors, notDupKeys)), 0)
    return () => clearTimeout(id)
  }, [authors, notDupKeys])
  return groups
}

/**
 * Splits a detected duplicate group by removing user-declared "not a duplicate"
 * edges and keeping only connected components of size ≥ 2. Transitivity is
 * preserved: in {A,B,C} where (A,C) is rejected but (A,B) and (B,C) match,
 * the full group stays connected via B. A rejected pair with no other link
 * (group of 2) disappears entirely.
 */
function splitGroupByNotDupPairs(group: Author[], notDupKeys: Set<string>): Author[][] {
  if (group.length < 2) return []
  // If no pair in this group is rejected, short-circuit to preserve the group as-is.
  let anyExcluded = false
  for (let i = 0; !anyExcluded && i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (notDupKeys.has(pairKey(group[i].id, group[j].id))) { anyExcluded = true; break }
    }
  }
  if (!anyExcluded) return [group]

  const parent = new Map<string, string>()
  group.forEach((a) => parent.set(a.id, a.id))
  const find = (x: string): string => {
    const p = parent.get(x)!
    if (p === x) return x
    const r = find(p)
    parent.set(x, r)
    return r
  }
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (notDupKeys.has(pairKey(group[i].id, group[j].id))) continue
      const rx = find(group[i].id)
      const ry = find(group[j].id)
      if (rx !== ry) parent.set(rx, ry)
    }
  }
  const byRoot = new Map<string, Author[]>()
  for (const a of group) {
    const root = find(a.id)
    const list = byRoot.get(root)
    if (list) list.push(a)
    else byRoot.set(root, [a])
  }
  const out: Author[][] = []
  for (const comp of byRoot.values()) if (comp.length >= 2) out.push(comp)
  return out
}

function computeAuthorDuplicateGroups(authors: Author[], notDupKeys: Set<string>): Author[][] {
  const norm = (s: unknown) =>
    String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/g, '').trim()
  const fullName = (a: Author) => {
    const words = `${norm(a.firstName)} ${norm(a.lastName)}`.split(/\s+/).filter(Boolean).sort()
    return words.join(' ')
  }

  const exactMap = new Map<string, Author[]>()
  ;(authors || []).forEach((a) => {
    const key = fullName(a)
    if (!key) return
    if (!exactMap.has(key)) exactMap.set(key, [])
    exactMap.get(key)!.push(a)
  })

  const merged = new Set<string>()
  const rawGroups: Author[][] = []

  for (const group of exactMap.values()) {
    if (group.length > 1) {
      group.forEach((a) => merged.add(a.id))
      rawGroups.push(group)
    }
  }

  const remaining = (authors || []).filter((a) => !merged.has(a.id) && fullName(a))
  for (let i = 0; i < remaining.length; i++) {
    if (merged.has(remaining[i].id)) continue
    const nameI = fullName(remaining[i])
    const fuzzyGroup: Author[] = [remaining[i]]
    for (let j = i + 1; j < remaining.length; j++) {
      if (merged.has(remaining[j].id)) continue
      const nameJ = fullName(remaining[j])
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
      rawGroups.push(fuzzyGroup)
    }
  }

  const out: Author[][] = []
  for (const g of rawGroups) out.push(...splitGroupByNotDupPairs(g, notDupKeys))
  return out
}

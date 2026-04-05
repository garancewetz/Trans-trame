import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Author, Book, Link } from '@/types/domain'
import { maybeNodeId } from '../maybeNodeId'

type AuthorNodeLike = Pick<Author, 'id' | 'firstName' | 'lastName'>

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

  const duplicateGroups = useMemo(() => {
    const norm = (s: unknown) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
    const map = new Map<string, Book[]>()
    nodes.forEach((n) => {
      const key = `${norm(n.title)}|||${norm(bookAuthorDisplay(n, authorsMap))}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    })
    return Array.from(map.values()).filter((g) => g.length > 1)
  }, [nodes, authorsMap])

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

  return { orphans, duplicateGroups, authorDuplicateGroups }
}

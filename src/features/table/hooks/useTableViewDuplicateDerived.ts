import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Author, Book, Link } from '@/types/domain'
import { maybeNodeId } from '../maybeNodeId'

type AuthorNodeLike = Pick<Author, 'id' | 'firstName' | 'lastName'>

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
    const norm = (s: unknown) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
    const map = new Map<string, Author[]>()
    ;(authors || []).forEach((a) => {
      const key = `${norm(a.lastName)}|||${norm(a.firstName)}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    })
    return Array.from(map.values()).filter((g) => g.length > 1)
  }, [authors])

  return { orphans, duplicateGroups, authorDuplicateGroups }
}

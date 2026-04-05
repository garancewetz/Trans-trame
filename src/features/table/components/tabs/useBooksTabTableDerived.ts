import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { maybeNodeId } from '../../maybeNodeId'
import type { Author, Book, BookId, Link } from '@/types/domain'

type Args = {
  nodes: Book[]
  links: Link[]
  search: string
  sortCol: string
  sortDir: string
  selectedIds: Set<BookId>
  authors: Author[]
}

export function useBooksTabTableDerived({
  nodes,
  links,
  search,
  sortCol,
  sortDir,
  selectedIds,
  authors,
}: Args) {
  const authorsMap = useMemo(() => {
    const m = new Map<string, Author>()
    ;(authors || []).forEach((a) => m.set(a.id, a))
    return m
  }, [authors])

  const linkCountByNode = useMemo(() => {
    const counts = new Map<string, number>()
    ;(links || []).forEach((l) => {
      const srcId = maybeNodeId(l.source)
      const tgtId = maybeNodeId(l.target)
      if (srcId) counts.set(srcId, (counts.get(srcId) || 0) + 1)
      if (tgtId) counts.set(tgtId, (counts.get(tgtId) || 0) + 1)
    })
    return counts
  }, [links])

  const filteredNodes = useMemo(() => {
    const q = String(search || '').toLowerCase().trim()
    if (!q) return nodes
    return (nodes || []).filter(
      (n) =>
        String(n.title || '').toLowerCase().includes(q) ||
        bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q) ||
        String(n.year || '').includes(q)
    )
  }, [nodes, search, authorsMap])

  const sortedNodes = useMemo(() => {
    const list = [...filteredNodes]
    list.sort((a, b) => {
      let va: string | number
      let vb: string | number
      switch (sortCol) {
        case 'title': va = String(a.title || '').toLowerCase(); vb = String(b.title || '').toLowerCase(); break
        case 'lastName': va = bookAuthorDisplay(a, authorsMap).toLowerCase(); vb = bookAuthorDisplay(b, authorsMap).toLowerCase(); break
        case 'year': va = a.year || 0; vb = b.year || 0; break
        case 'linkCount': va = linkCountByNode.get(a.id) || 0; vb = linkCountByNode.get(b.id) || 0; break
        default: va = ''; vb = ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredNodes, sortCol, sortDir, authorsMap, linkCountByNode])

  const mergeNodes = useMemo(() => {
    if (selectedIds.size !== 2) return []
    const ids = new Set(selectedIds)
    return (nodes || []).filter((n) => ids.has(n.id))
  }, [nodes, selectedIds])

  return { authorsMap, linkCountByNode, sortedNodes, mergeNodes }
}

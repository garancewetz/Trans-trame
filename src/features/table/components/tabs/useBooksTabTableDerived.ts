import { useMemo } from 'react'
import { bookAuthorDisplay, bookAuthorSortKey } from '@/common/utils/authorUtils'
import { matchAllWords } from '@/common/utils/searchUtils'
import { RESOURCE_TYPES, type ResourceTypeValue } from '@/common/constants/resourceTypes'
import { AXES } from '@/common/utils/categories'
import { maybeNodeId } from '../../maybeNodeId'
import type { Author, Book, BookId, Link } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'

const RESOURCE_TYPE_ORDER: Record<string, number> = Object.fromEntries(
  RESOURCE_TYPES.map((t, i) => [t.value, i]),
)

const AXIS_ORDER: Record<string, number> = Object.fromEntries(AXES.map((a, i) => [a, i]))

function primaryAxisRank(book: Book): number {
  const first = book.axes?.[0]
  if (!first) return Number.MAX_SAFE_INTEGER
  const rank = AXIS_ORDER[first]
  return rank ?? Number.MAX_SAFE_INTEGER - 1
}

type Args = {
  nodes: Book[]
  links: Link[]
  search: string
  sortCol: string
  sortDir: string
  selectedIds: Set<BookId>
  authors: Author[]
  axisFilter?: Axis | null
  typeFilter?: ResourceTypeValue | null
  todoOnly?: boolean
}

export function useBooksTabTableDerived({
  nodes,
  links,
  search,
  sortCol,
  sortDir,
  selectedIds,
  authors,
  axisFilter,
  typeFilter,
  todoOnly,
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

  const linkedBooksByNode = useMemo(() => {
    const nodesMap = new Map<BookId, Book>()
    ;(nodes || []).forEach((n) => nodesMap.set(n.id, n))
    const result = new Map<BookId, Book[]>()
    ;(links || []).forEach((l) => {
      const srcId = maybeNodeId(l.source) as BookId | null
      const tgtId = maybeNodeId(l.target) as BookId | null
      if (!srcId || !tgtId) return
      const srcBook = nodesMap.get(srcId)
      const tgtBook = nodesMap.get(tgtId)
      if (srcBook && tgtBook) {
        if (!result.has(srcId)) result.set(srcId, [])
        result.get(srcId)!.push(tgtBook)
        if (!result.has(tgtId)) result.set(tgtId, [])
        result.get(tgtId)!.push(srcBook)
      }
    })
    return result
  }, [links, nodes])

  const filteredNodes = useMemo(() => {
    const q = String(search || '').trim()
    let list = nodes || []
    if (todoOnly) list = list.filter((n) => !!n.todo)
    if (typeFilter) list = list.filter((n) => (n.resourceType ?? 'book') === typeFilter)
    if (axisFilter === 'UNCATEGORIZED') {
      list = list.filter((n) => !n.axes?.length || n.axes.includes('UNCATEGORIZED'))
    } else if (axisFilter) {
      list = list.filter((n) => n.axes?.includes(axisFilter))
    }
    if (q) list = list.filter((n) =>
      matchAllWords(q, [n.title || '', bookAuthorDisplay(n, authorsMap), String(n.year || '')].join(' '))
    )
    return list
  }, [nodes, search, authorsMap, axisFilter, typeFilter, todoOnly])

  const sortedNodes = useMemo(() => {
    const list = [...filteredNodes]
    list.sort((a, b) => {
      let va: string | number
      let vb: string | number
      switch (sortCol) {
        case 'title': va = String(a.title || '').toLowerCase(); vb = String(b.title || '').toLowerCase(); break
        case 'lastName': va = bookAuthorSortKey(a, authorsMap); vb = bookAuthorSortKey(b, authorsMap); break
        case 'year': va = a.year || 0; vb = b.year || 0; break
        case 'resourceType':
          va = RESOURCE_TYPE_ORDER[a.resourceType ?? 'book'] ?? RESOURCE_TYPES.length
          vb = RESOURCE_TYPE_ORDER[b.resourceType ?? 'book'] ?? RESOURCE_TYPES.length
          break
        case 'axes':
          va = primaryAxisRank(a)
          vb = primaryAxisRank(b)
          break
        case 'linkCount': va = linkCountByNode.get(a.id) || 0; vb = linkCountByNode.get(b.id) || 0; break
        case 'createdAt': va = (a.created_at as string) || ''; vb = (b.created_at as string) || ''; break
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

  return { authorsMap, linkCountByNode, linkedBooksByNode, sortedNodes, mergeNodes }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Author, Book } from '@/domain/types'
import { authorName, bookAuthorDisplay } from '@/lib/authorUtils'

function normalize(s: unknown): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export type GlobalSearchResultItem =
  | { kind: 'author'; authorId: string; author: string; count: number }
  | { kind: 'node'; node: Book }

type UseGlobalSearchProps = {
  nodes: Book[]
  authors?: Author[]
  onSelectNode?: (node: Book) => void
  onSelectAuthor?: (authorId: string) => void
}

export default function useGlobalSearch({
  nodes,
  authors = [],
  onSelectNode,
  onSelectAuthor,
}: UseGlobalSearchProps) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)

  const searchResults = useMemo(() => {
    const q = normalize(globalSearch)
    if (!q) return []

    const matchedNodes = nodes
      .filter((n) => normalize(n.title).includes(q) || normalize(bookAuthorDisplay(n, authors)).includes(q))
      .map((node) => ({ kind: 'node' as const, node }))

    const bookCountByAuthor = new Map<string, number>()
    nodes.forEach((n) => {
      ;(n.authorIds || []).forEach((aid) => {
        bookCountByAuthor.set(aid, (bookCountByAuthor.get(aid) || 0) + 1)
      })
    })

    const matchedAuthors = authors
      .filter((a) => normalize(authorName(a)).includes(q))
      .map((a) => ({
        kind: 'author' as const,
        authorId: a.id,
        author: authorName(a),
        count: bookCountByAuthor.get(a.id) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author, 'fr'))

    return [...matchedAuthors, ...matchedNodes]
  }, [globalSearch, nodes, authors])

  const closeSearch = useCallback(() => {
    setGlobalSearch('')
    setSearchFocused(false)
  }, [])

  const handleSearchSelect = useCallback(
    (item: GlobalSearchResultItem | null | undefined) => {
      closeSearch()
      if (!item) return
      if (item.kind === 'author') {
        onSelectAuthor?.(item.authorId)
        return
      }
      if (item.kind === 'node') {
        onSelectNode?.(item.node)
      }
    },
    [closeSearch, onSelectAuthor, onSelectNode]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const el = searchRef.current
      const target = e.target
      if (el && target instanceof Node && !el.contains(target)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return {
    searchRef,
    globalSearch,
    setGlobalSearch,
    searchFocused,
    setSearchFocused,
    searchResults,
    handleSearchSelect,
  }
}

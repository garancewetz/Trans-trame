import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authorName, bookAuthorDisplay } from '../../../authorUtils'

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export default function useGlobalSearch({ nodes, authors = [], onSelectNode, onSelectAuthor }) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  const searchResults = useMemo(() => {
    const q = normalize(globalSearch)
    if (!q) return []

    const matchedNodes = nodes
      .filter((n) => normalize(n.title).includes(q) || normalize(bookAuthorDisplay(n, authors)).includes(q))
      .map((node) => ({ kind: 'node', node }))

    // Build author results from entity list
    const bookCountByAuthor = new Map()
    nodes.forEach((n) => {
      ;(n.authorIds || []).forEach((aid) => {
        bookCountByAuthor.set(aid, (bookCountByAuthor.get(aid) || 0) + 1)
      })
    })

    const matchedAuthors = authors
      .filter((a) => normalize(authorName(a)).includes(q))
      .map((a) => ({
        kind: 'author',
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
    (item) => {
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
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false)
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

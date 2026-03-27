import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authorName } from '../authorUtils'

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export default function useGlobalSearch({ nodes, onSelectNode, onSelectAuthor }) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  const searchResults = useMemo(() => {
    const q = normalize(globalSearch)
    if (!q) return []

    const matchedNodes = nodes
      .filter((n) => normalize(n.title).includes(q) || normalize(authorName(n)).includes(q))
      .map((node) => ({ kind: 'node', node }))

    const authorCounts = new Map()
    nodes.forEach((n) => {
      const name = authorName(n)
      if (!name) return
      const key = normalize(name)
      if (!key) return
      authorCounts.set(key, { name, count: (authorCounts.get(key)?.count || 0) + 1 })
    })

    const matchedAuthors = [...authorCounts.entries()]
      .filter(([key, v]) => key.includes(q) || normalize(v.name).includes(q))
      .map(([, v]) => ({ kind: 'author', author: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author, 'fr'))

    return [...matchedAuthors, ...matchedNodes]
  }, [globalSearch, nodes])

  const closeSearch = useCallback(() => {
    setGlobalSearch('')
    setSearchFocused(false)
  }, [])

  const handleSearchSelect = useCallback(
    (item) => {
      closeSearch()
      if (!item) return
      if (item.kind === 'author') {
        onSelectAuthor?.(item.author)
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

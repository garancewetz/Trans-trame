import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function useGlobalSearch({ nodes, onSelect }) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  const searchResults = useMemo(() => {
    const q = globalSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter((n) => n.title.toLowerCase().includes(q) || n.author.toLowerCase().includes(q))
  }, [globalSearch, nodes])

  const handleSearchSelect = useCallback(
    (node) => {
      setGlobalSearch('')
      setSearchFocused(false)
      onSelect(node)
    },
    [onSelect]
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

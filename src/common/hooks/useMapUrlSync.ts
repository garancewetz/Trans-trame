import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BookId } from '@/types/domain'
import { MAP_QUERY_KEYS } from '@/common/utils/bookSlug'
import { useAppData } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'

const Q = MAP_QUERY_KEYS

/**
 * `?book=<uuid>` — ouvrage ouvert dans le panneau.
 * `?link=<id>&from=<uuid>` (optionnel) — détail lien ; `from` = nœud contexte si ≠ `book`.
 */
export function useMapUrlSync() {
  const { books, links, isLoading } = useAppData()
  const {
    selectedNode,
    selectedLink,
    linkContextNode,
    setSelectedNode,
    setSelectedLink,
    setLinkContextNode,
    setPanelTab,
  } = useSelection()

  const [searchParams, setSearchParams] = useSearchParams()
  const skipStateToUrl = useRef(false)
  const prevBookInUrl = useRef<string | null>(null)
  const isInitialSync = useRef(true)

  useEffect(() => {
    if (isLoading) return

    const bookId = searchParams.get(Q.book) as BookId | null
    const linkId = searchParams.get(Q.link)
    const fromId = searchParams.get(Q.from) as BookId | null

    if (bookId) {
      const book = books.find((b) => b.id === bookId)
      if (!book) return

      prevBookInUrl.current = bookId

      const link = linkId ? links.find((l) => l.id === linkId) : undefined
      const ctxId = (fromId || bookId) as BookId
      const ctx = books.find((b) => b.id === ctxId)

      skipStateToUrl.current = true

      if (link && ctx) {
        setSelectedNode(book)
        setSelectedLink(link)
        setLinkContextNode(ctx)
        setPanelTab('details')
      } else {
        setSelectedNode(book)
        setSelectedLink(null)
        setLinkContextNode(null)
        setPanelTab('details')
      }
      queueMicrotask(() => {
        skipStateToUrl.current = false
      })
      return
    }

    if (prevBookInUrl.current) {
      skipStateToUrl.current = true
      prevBookInUrl.current = null
      setSelectedNode(null)
      setSelectedLink(null)
      setLinkContextNode(null)
      setPanelTab('details')
      queueMicrotask(() => {
        skipStateToUrl.current = false
      })
    }
  }, [isLoading, searchParams, books, links, setSelectedNode, setSelectedLink, setLinkContextNode, setPanelTab])

  useEffect(() => {
    if (skipStateToUrl.current) return

    const next = new URLSearchParams()
    if (selectedNode) {
      next.set(Q.book, selectedNode.id)
      if (selectedLink && linkContextNode) {
        next.set(Q.link, selectedLink.id)
        if (linkContextNode.id !== selectedNode.id) {
          next.set(Q.from, linkContextNode.id)
        }
      }
    }

    if (next.toString() === searchParams.toString()) {
      isInitialSync.current = false
      return
    }

    setSearchParams(next, { replace: isInitialSync.current })
    isInitialSync.current = false
  }, [
    selectedNode?.id,
    selectedLink?.id,
    linkContextNode?.id,
    searchParams,
    setSearchParams,
  ])
}

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Book, BookId, Link } from '@/types/domain'
import { MAP_QUERY_KEYS } from '@/common/utils/bookSlug'

const Q = MAP_QUERY_KEYS

type Args = {
  books: Book[]
  links: Link[]
  dataReady: boolean
  selectedNode: Book | null
  selectedLink: Link | null
  linkContextNode: Book | null
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  setLinkContextNode: (n: Book | null) => void
  setPanelTab: (t: string) => void
}

/**
 * `?book=<uuid>` — ouvrage ouvert dans le panneau.
 * `?link=<id>&from=<uuid>` (optionnel) — détail lien ; `from` = nœud contexte si ≠ `book`.
 */
export function useMapUrlSync(p: Args) {
  const [searchParams, setSearchParams] = useSearchParams()
  const skipStateToUrl = useRef(false)
  const prevBookInUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!p.dataReady) return

    const bookId = searchParams.get(Q.book) as BookId | null
    const linkId = searchParams.get(Q.link)
    const fromId = searchParams.get(Q.from) as BookId | null

    if (bookId) {
      const book = p.books.find((b) => b.id === bookId)
      if (!book) return

      prevBookInUrl.current = bookId

      const link = linkId ? p.links.find((l) => l.id === linkId) : undefined
      const ctxId = (fromId || bookId) as BookId
      const ctx = p.books.find((b) => b.id === ctxId)

      skipStateToUrl.current = true

      if (link && ctx) {
        p.setSelectedNode(book)
        p.setSelectedLink(link)
        p.setLinkContextNode(ctx)
        p.setPanelTab('details')
      } else {
        p.setSelectedNode(book)
        p.setSelectedLink(null)
        p.setLinkContextNode(null)
        p.setPanelTab('details')
      }
      queueMicrotask(() => {
        skipStateToUrl.current = false
      })
      return
    }

    if (prevBookInUrl.current) {
      skipStateToUrl.current = true
      prevBookInUrl.current = null
      p.setSelectedNode(null)
      p.setSelectedLink(null)
      p.setLinkContextNode(null)
      p.setPanelTab('details')
      queueMicrotask(() => {
        skipStateToUrl.current = false
      })
    }
  }, [p.dataReady, searchParams, p.books, p.links, p.setSelectedNode, p.setSelectedLink, p.setLinkContextNode, p.setPanelTab])

  useEffect(() => {
    if (skipStateToUrl.current) return

    const next = new URLSearchParams()
    if (p.selectedNode) {
      next.set(Q.book, p.selectedNode.id)
      if (p.selectedLink && p.linkContextNode) {
        next.set(Q.link, p.selectedLink.id)
        if (p.linkContextNode.id !== p.selectedNode.id) {
          next.set(Q.from, p.linkContextNode.id)
        }
      }
    }

    if (next.toString() === searchParams.toString()) return
    setSearchParams(next, { replace: true })
  }, [
    p.selectedNode?.id,
    p.selectedLink?.id,
    p.linkContextNode?.id,
    searchParams,
    setSearchParams,
  ])
}

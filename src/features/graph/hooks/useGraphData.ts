import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import type { Author, Book, BookId, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import {
  deleteAllBooks,
  deleteBookRowById,
  deleteBookAuthorsByBookId,
  deleteLinkRowById,
  insertBookAuthors,
  updateLinkRowById,
} from '../api/graphDataApi'
import { type AxesColorMap, normalizeEndpointId } from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'
import { migrateLegacyAuthorsAndBooks } from './graphDataMigration'
import { planLinksAfterBookMerge } from './graphDataMergeBooks'
import { useGraphDataEntityCallbacks } from './useGraphDataEntityCallbacks'
import { useGraphDataset } from './useGraphDataset'

function linkWithStringEndpoints(l: Link, source: BookId, target: BookId): Link {
  return { ...l, source, target }
}

/** Normalise un titre pour le regroupement d'oeuvres (lowercase, diacritics, whitespace). */
function normTitle(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export function useGraphData({ axesColors }: { axesColors: AxesColorMap }) {
  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const queryClient = useQueryClient()
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY }),
    [queryClient]
  )

  const axesColorsRef = useRef(axesColors)
  axesColorsRef.current = axesColors
  const booksRef = useRef(books)
  booksRef.current = books
  const authorsRef = useRef(authors)
  authorsRef.current = authors
  const linksRef = useRef(links)
  linksRef.current = links

  // ── TanStack Query: initial load ─────────────────────────────────────────────
  const { data: datasetData, isLoading, isError } = useGraphDataset(axesColors)
  const isMutating = useIsMutating()

  // Buffer dataset from server while mutations are in-flight to avoid overwriting
  // optimistic state (e.g. authorIds set by addBookMutation) with stale DB data.
  const pendingDataset = useRef<typeof datasetData>(undefined)

  useLayoutEffect(() => {
    if (!datasetData) return
    if (isMutating > 0) {
      pendingDataset.current = datasetData
      return
    }
    pendingDataset.current = undefined
    setBooks(datasetData.books)
    setAuthors(datasetData.authors)
    setLinks(datasetData.links)
  }, [datasetData, isMutating])

  // When all mutations settle, discard any stale buffered data and refetch fresh
  const prevMutating = useRef(0)
  useEffect(() => {
    if (prevMutating.current > 0 && isMutating === 0) {
      pendingDataset.current = undefined
      invalidate()
    }
    prevMutating.current = isMutating
  }, [isMutating, invalidate])

  // graphData : livres uniquement + liens citation (les auteurs sont des entités de données, pas des nœuds graphe)
  // Books sharing the same originalTitle are collapsed into a single representative node.
  const graphData = useMemo(() => {
    const bookIdToRepId = new Map<string, string>()
    const repNodes = new Map<string, Book>() // normKey → representative Book node
    const standaloneBooks: Book[] = []

    // Group books by normalized originalTitle
    const byOriginal = new Map<string, Book[]>()
    for (const b of books) {
      const ot = b.originalTitle?.trim()
      if (ot) {
        const key = normTitle(ot)
        if (!byOriginal.has(key)) byOriginal.set(key, [])
        byOriginal.get(key)!.push(b)
      } else {
        standaloneBooks.push(b)
      }
    }

    // For each group, pick a representative and remap all book ids
    for (const [key, group] of byOriginal) {
      if (group.length === 1) {
        // Single book with originalTitle: show originalTitle as graph node title
        const solo = group[0]
        standaloneBooks.push({ ...solo, title: solo.originalTitle || solo.title })
        continue
      }
      // Sort by id for a stable representative across re-renders
      group.sort((a, b) => a.id.localeCompare(b.id))
      const rep = group[0]
      const allAuthorIds = [...new Set(group.flatMap((b) => b.authorIds ?? []))]
      const allAxes = [...new Set(group.flatMap((b) => b.axes ?? []))]
      const years = group.map((b) => b.year).filter((y): y is number => y != null)
      const repNode: Book = {
        ...rep,
        title: rep.originalTitle || rep.title,
        authorIds: allAuthorIds,
        axes: allAxes,
        year: years.length ? Math.min(...years) : rep.year,
      }
      repNodes.set(key, repNode)
      for (const b of group) {
        bookIdToRepId.set(b.id, rep.id)
      }
    }

    const nodes = [...standaloneBooks, ...repNodes.values()]

    // Remap links: redirect endpoints to representative node, deduplicate
    const seen = new Set<string>()
    const remappedLinks = (links || [])
      .map((l) => {
        let source = normalizeEndpointId(l.source)
        let target = normalizeEndpointId(l.target)
        if (!source || !target) return null
        source = bookIdToRepId.get(source) ?? source
        target = bookIdToRepId.get(target) ?? target
        if (source === target) return null
        const [lo, hi] = source < target ? [source, target] : [target, source]
        const dedupKey = `${lo}|${hi}|${l.citation_text || ''}`
        if (seen.has(dedupKey)) return null
        seen.add(dedupKey)
        return linkWithStringEndpoints(l, source, target)
      })
      .filter((x): x is Link => x !== null)

    return { nodes, links: remappedLinks }
  }, [books, links])

  const {
    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleAddLink,
    handleDeleteLink,
    handleUpdateLink,
  } = useGraphDataEntityCallbacks({
    axesColorsRef,
    booksRef,
    authorsRef,
    linksRef,
    setBooks,
    setAuthors,
    setLinks,
  })

  // ── Fusion de livres ─────────────────────────────────────────────────────────

  const handleMergeBooks = useCallback((fromNodeId: string, intoNodeId: string) => {
    if (!fromNodeId || !intoNodeId || fromNodeId === intoNodeId) return false

    const fromBook = books.find((n) => n.id === fromNodeId)
    const intoBook = books.find((n) => n.id === intoNodeId)
    if (!fromBook || !intoBook) return false

    const { remappedLinks, linksToUpdate, linkIdsToDelete } = planLinksAfterBookMerge(
      links,
      fromNodeId,
      intoNodeId
    )

    // Transfer author associations from the deleted book to the kept book
    const fromAuthorIds = fromBook.authorIds ?? []
    const intoAuthorIds = new Set(intoBook.authorIds ?? [])
    const newAuthorIds = fromAuthorIds.filter((id) => !intoAuthorIds.has(id))

    setBooks((prev) => {
      const updated = prev.map((b) =>
        b.id === intoNodeId && newAuthorIds.length > 0
          ? { ...b, authorIds: [...(b.authorIds ?? []), ...newAuthorIds] }
          : b
      )
      return updated.filter((n) => n.id !== fromNodeId)
    })
    setLinks(remappedLinks)

    // Sequence: update/delete links first, THEN delete the book
    // (avoids ON DELETE CASCADE wiping links before they are remapped)
    Promise.all([
      ...linksToUpdate.map(({ id, source_id, target_id }) =>
        updateLinkRowById(id, { source_id, target_id })
      ),
      ...linkIdsToDelete.map((id) => deleteLinkRowById(id)),
      ...(newAuthorIds.length > 0 ? [insertBookAuthors(intoNodeId, newAuthorIds)] : []),
    ]).then((linkResults) => {
      const linkErrors = linkResults.filter((r) => r.error)
      if (linkErrors.length > 0) devWarn('Erreurs lors de la fusion (liens)', linkErrors)

      // Only delete book after links are safely remapped
      Promise.all([
        deleteBookAuthorsByBookId(fromNodeId),
        deleteBookRowById(fromNodeId),
      ]).then((delResults) => {
        const delErrors = delResults.filter((r) => r.error)
        if (delErrors.length > 0) devWarn('Erreurs lors de la fusion (suppression)', delErrors)
        invalidate()
      })
    })

    return true
  }, [books, links, invalidate])

  // ── Migration legacy → entités auteurs ───────────────────────────────────────

  const handleMigrateData = useCallback(async () => {
    return migrateLegacyAuthorsAndBooks({
      books,
      authors,
      axesColors: axesColorsRef.current,
      setBooks,
      setAuthors,
    })
  }, [books, authors])

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetToDefault = useCallback(() => {
    setBooks([])
    setAuthors([])
    setLinks([])
    deleteAllBooks()
      .then(({ error }) => {
        if (error) devWarn('Erreur reset', error)
        invalidate()
      })
  }, [invalidate])

  return {
    graphData,
    books,
    authors,
    links,
    isLoading,
    isError,
    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleMigrateData,
    handleAddLink,
    handleDeleteLink,
    handleUpdateLink,
    handleMergeBooks,
    resetToDefault,
  }
}

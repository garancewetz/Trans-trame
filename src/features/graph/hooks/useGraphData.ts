import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Author, Book, BookId, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import {
  deleteAllBooks,
  deleteBookRowById,
  deleteLinkRowById,
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

// ── Hook principal ─────────────────────────────────────────────────────────────

export function useGraphData({ axesColors }: { axesColors: AxesColorMap }) {
  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

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

  // useLayoutEffect : appliquer le jeu de données avant le paint pour éviter un flash « not found »
  // (ex. `/?book=…` alors que `nodes` est encore vide un frame après isLoading === false).
  useLayoutEffect(() => {
    if (!datasetData) return
    setBooks(datasetData.books)
    setAuthors(datasetData.authors)
    setLinks(datasetData.links)
  }, [datasetData])

  // graphData : livres uniquement + liens citation (les auteurs sont des entités de données, pas des nœuds graphe)
  const graphData = useMemo(() => ({
    // IMPORTANT: react-force-graph mutates `nodes` and `links` (source/target become node objects).
    // - On garde les objets `books` stables pour préserver les positions (x/y/vx...) du layout.
    // - Mais on CLONE les liens + on normalise source/target en ids pour éviter les doublons
    //   quand les nœuds sont mis à jour (sinon les liens peuvent pointer vers de vieux objets).
    nodes: books,
    links: (links || [])
      .map((l) => {
        const source = normalizeEndpointId(l.source)
        const target = normalizeEndpointId(l.target)
        if (!source || !target) return null
        return linkWithStringEndpoints(l, source, target)
      })
      .filter((x): x is Link => x !== null),
  }), [books, links])

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

    const fromExists = books.some((n) => n.id === fromNodeId)
    const intoExists = books.some((n) => n.id === intoNodeId)
    if (!fromExists || !intoExists) return false

    const { remappedLinks, linksToUpdate, linkIdsToDelete } = planLinksAfterBookMerge(
      links,
      fromNodeId,
      intoNodeId
    )

    setBooks((prev) => prev.filter((n) => n.id !== fromNodeId))
    setLinks(remappedLinks)

    Promise.all([
      ...linksToUpdate.map(({ id, source_id, target_id }) =>
        updateLinkRowById(id, { source_id, target_id })
      ),
      ...linkIdsToDelete.map((id) => deleteLinkRowById(id)),
      deleteBookRowById(fromNodeId),
    ]).then((results) => {
      const errors = results.filter((r) => r.error)
      if (errors.length > 0) devWarn('Erreurs lors de la fusion', errors)
      invalidate()
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Author, Book, Link } from '@/domain/types'
import { migrateData } from '@/lib/authorUtils'
import { devWarn } from '@/lib/logger'
import {
  deleteAllBooks,
  deleteAuthorRowById,
  deleteBookRowById,
  deleteLinkRowById,
  insertAuthorRow,
  insertBookRow,
  insertLinkRow,
  loadGraphDataFromSupabase,
  updateAuthorRowById,
  updateBookRowById,
  updateLinkRowById,
} from '../api/graphDataApi'
import {
  authorToDbRow,
  bookToDbRow,
  type AxesColorMap,
  type BookRowInput,
  dbAuthorToNode,
  dbBookToNode,
  dbLinkToLink,
  normalizeEndpointId,
  normalizeId,
  sanitizeAuthor,
  sanitizeBook,
} from '../domain/graphDataModel'

// ── Chargement initial ─────────────────────────────────────────────────────────

async function loadFromSupabase({
  axesColors,
}: {
  axesColors: AxesColorMap
}): Promise<{ books: Book[]; authors: Author[]; links: Link[] } | null> {
  try {
    const { booksRes, authorsRes, linksRes } = await loadGraphDataFromSupabase()
    if (booksRes.error || linksRes.error) return null
    const authorsData = authorsRes.error ? [] : (authorsRes.data || [])
    return {
      books: (booksRes.data || []).map((r) => sanitizeBook(dbBookToNode(r), axesColors)),
      authors: authorsData.map((r) => sanitizeAuthor(dbAuthorToNode(r), axesColors)),
      links: (linksRes.data || []).map(dbLinkToLink),
    }
  } catch {
    return null
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export default function useGraphData({ axesColors }: { axesColors: AxesColorMap }) {
  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const axesColorsRef = useRef(axesColors)
  axesColorsRef.current = axesColors
  const booksRef = useRef(books)
  booksRef.current = books
  const authorsRef = useRef(authors)
  authorsRef.current = authors

  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    loadFromSupabase({ axesColors }).then((data) => {
      if (data) {
        setBooks(data.books)
        setAuthors(data.authors)
        setLinks(data.links)
      }
    })
  }, [axesColors])

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
        return { ...l, source, target } as Link
      })
      .filter((x): x is Link => x !== null),
  }), [books, links])

  // ── Livres ───────────────────────────────────────────────────────────────────

  const handleAddBook = useCallback((book) => {
    const sanitized = sanitizeBook({ type: 'book', ...book }, axesColorsRef.current)
    setBooks((prev) => {
      if (prev.some((n) => n.id === sanitized.id)) return prev
      return [...prev, sanitized]
    })
    return insertBookRow(bookToDbRow(sanitized))
      .then(({ error }) => { if (error) devWarn('Erreur ajout livre', error) })
  }, [])

  const handleUpdateBook = useCallback((updatedNode) => {
    const sanitized = sanitizeBook({ type: 'book', ...updatedNode }, axesColorsRef.current)
    setBooks((prev) => {
      return prev.map((n) => {
        if (n.id !== sanitized.id) return n
        // Copie avec positions force-graph préservées (x, y, fx, fy, vx, vy)
        Object.assign(n, sanitized)
        return n
      })
    })
    const { id, ...fields } = bookToDbRow(sanitized)
    updateBookRowById(id, fields)
      .then(({ error }) => { if (error) devWarn('Erreur mise à jour livre', error) })
  }, [])

  const handleDeleteBook = useCallback((nodeId) => {
    if (!nodeId) return false
    // Vérification synchrone via ref (setBooks updater s'exécute en différé)
    const exists = booksRef.current.some((n) => n.id === nodeId)
    if (!exists) return false
    setBooks((prev) => prev.filter((n) => n.id !== nodeId))
    setLinks((prev) => prev.filter((l) => {
      const srcId = normalizeId(l.source)
      const tgtId = normalizeId(l.target)
      return srcId !== nodeId && tgtId !== nodeId
    }))
    // ON DELETE CASCADE dans la DB supprime automatiquement les liens associés
    deleteBookRowById(nodeId)
      .then(({ error }) => { if (error) devWarn('Erreur suppression livre', error) })
    return true
  }, [])

  // ── Auteurs ──────────────────────────────────────────────────────────────────

  const handleAddAuthor = useCallback((author) => {
    const sanitized = sanitizeAuthor({ type: 'author', ...author }, axesColorsRef.current)
    setAuthors((prev) => {
      if (prev.some((a) => a.id === sanitized.id)) return prev
      return [...prev, sanitized]
    })
    return insertAuthorRow(authorToDbRow(sanitized))
      .then(({ error }) => { if (error) devWarn('Erreur ajout auteur', error) })
  }, [])

  const handleUpdateAuthor = useCallback((updatedAuthor) => {
    const sanitized = sanitizeAuthor({ type: 'author', ...updatedAuthor }, axesColorsRef.current)
    setAuthors((prev) => prev.map((a) => (a.id === sanitized.id ? sanitized : a)))
    const { id, ...fields } = authorToDbRow(sanitized)
    updateAuthorRowById(id, fields)
      .then(({ error }) => { if (error) devWarn('Erreur mise à jour auteur', error) })
  }, [])

  const handleDeleteAuthor = useCallback((authorId) => {
    if (!authorId) return false
    if (!authorsRef.current.some((a) => a.id === authorId)) return false
    // Mettre à jour les livres qui référencent cet auteur
    const booksToUpdate = booksRef.current.filter((b) => b.authorIds?.includes(authorId))
    booksToUpdate.forEach((book) => {
      const ids = book.authorIds ?? []
      const updated = { ...book, authorIds: ids.filter((id) => id !== authorId) }
      const { id, ...fields } = bookToDbRow(updated)
      updateBookRowById(id, fields)
        .then(({ error }) => { if (error) devWarn('Erreur MAJ authorId dans livre', error) })
    })
    setAuthors((prev) => prev.filter((a) => a.id !== authorId))
    if (booksToUpdate.length > 0) {
      setBooks((prev) => prev.map((b) =>
        b.authorIds?.includes(authorId)
          ? { ...b, authorIds: b.authorIds.filter((id) => id !== authorId) }
          : b
      ))
    }
    deleteAuthorRowById(authorId)
      .then(({ error }) => { if (error) devWarn('Erreur suppression auteur', error) })
    return true
  }, [])

  // ── Liens ────────────────────────────────────────────────────────────────────

  const handleAddLink = useCallback((link) => {
    const srcId = normalizeId(link.source)
    const tgtId = normalizeId(link.target)
    const newLink = {
      id: crypto.randomUUID(),
      source: srcId,
      target: tgtId,
      citation_text: link.citation_text || '',
      edition: link.edition || '',
      page: link.page || '',
      context: link.context || '',
    }

    setLinks((prev) => {
      const isDuplicate = prev.some((l) => {
        const s = normalizeId(l.source)
        const t = normalizeId(l.target)
        return s === srcId && t === tgtId && l.citation_text === newLink.citation_text
      })
      if (isDuplicate) return prev
      return [...prev, newLink]
    })

    insertLinkRow({
      id: newLink.id,
      source_id: srcId,
      target_id: tgtId,
      citation_text: newLink.citation_text,
      edition: newLink.edition,
      page: newLink.page,
      context: newLink.context,
    }).then(({ error }) => { if (error) devWarn('Erreur ajout lien', error) })
  }, [])

  const handleDeleteLink = useCallback((linkId) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId))
    deleteLinkRowById(linkId)
      .then(({ error }) => { if (error) devWarn('Erreur suppression lien', error) })
  }, [])

  const handleUpdateLink = useCallback((linkId, updatedFields) => {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...updatedFields } : l)))
    updateLinkRowById(linkId, updatedFields)
      .then(({ error }) => { if (error) devWarn('Erreur mise à jour lien', error) })
  }, [])

  // ── Fusion de livres ─────────────────────────────────────────────────────────

  const handleMergeBooks = useCallback((fromNodeId, intoNodeId) => {
    if (!fromNodeId || !intoNodeId || fromNodeId === intoNodeId) return false

    const fromExists = books.some((n) => n.id === fromNodeId)
    const intoExists = books.some((n) => n.id === intoNodeId)
    if (!fromExists || !intoExists) return false

    const linksToUpdate: { id: string; source_id: string; target_id: string }[] = []
    const linkIdsToDelete: string[] = []
    const dedupe = new Set<string>()
    const remappedLinks: Link[] = []

    links.forEach((link) => {
      const srcIdRaw = normalizeId(link.source)
      const tgtIdRaw = normalizeId(link.target)
      const srcId = srcIdRaw === fromNodeId ? intoNodeId : srcIdRaw
      const tgtId = tgtIdRaw === fromNodeId ? intoNodeId : tgtIdRaw

      if (!srcId || !tgtId || srcId === tgtId) {
        linkIdsToDelete.push(link.id)
        return
      }
      const key = `${srcId}|${tgtId}|${link.citation_text || ''}|${link.page || ''}|${link.edition || ''}`
      if (dedupe.has(key)) {
        linkIdsToDelete.push(link.id)
        return
      }
      dedupe.add(key)

      if (srcId !== srcIdRaw || tgtId !== tgtIdRaw) {
        linksToUpdate.push({ id: link.id, source_id: srcId, target_id: tgtId })
      }
      remappedLinks.push({ ...link, source: srcId, target: tgtId })
    })

    setBooks((prev) => prev.filter((n) => n.id !== fromNodeId))
    setLinks(remappedLinks)

    Promise.all([
      ...linksToUpdate.map(({ id, source_id, target_id }) =>
        updateLinkRowById(id, { source_id, target_id })
      ),
      ...linkIdsToDelete.map((id) =>
        deleteLinkRowById(id)
      ),
      deleteBookRowById(fromNodeId),
    ]).then((results) => {
      const errors = results.filter((r) => r.error)
      if (errors.length > 0) devWarn('Erreurs lors de la fusion', errors)
    })

    return true
  }, [books, links])

  // ── Migration legacy → entités auteurs ───────────────────────────────────────

  const handleMigrateData = useCallback(async () => {
    const { newAuthors, updatedBooks } = migrateData(books, authors)
    if (newAuthors.length === 0 && updatedBooks.every((b) => !b.authorIds?.length)) {
      return { newAuthors: 0, updatedBooks: 0 }
    }

    // Insérer les nouveaux auteurs en DB
    if (newAuthors.length > 0) {
      const rows = newAuthors.map((a) =>
        authorToDbRow({
          type: 'author',
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          axes: a.axes,
        } as Author)
      )
      const { error } = await insertAuthorRow(rows)
      if (error) { devWarn('Migration: erreur insert authors', error); return null }
      setAuthors((prev) => [...prev, ...newAuthors.map((a) => ({ ...a, type: 'author' as const } as Author))])
    }

    // Mettre à jour les livres avec leurs authorIds
    const booksToUpdate = updatedBooks.filter((b) => b.authorIds?.length > 0)
    await Promise.all(
      booksToUpdate.map((book) => {
        const { id, ...fields } = bookToDbRow(book as BookRowInput)
        return updateBookRowById(id, fields)
          .then(({ error }) => { if (error) devWarn('Migration: erreur update book', id, error) })
      })
    )
    setBooks(updatedBooks as Book[])

    return { newAuthors: newAuthors.length, updatedBooks: booksToUpdate.length }
  }, [books, authors])

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetToDefault = useCallback(() => {
    setBooks([])
    setAuthors([])
    setLinks([])
    deleteAllBooks()
      .then(({ error }) => { if (error) devWarn('Erreur reset', error) })
  }, [])

  return {
    graphData,
    books,
    authors,
    links,
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

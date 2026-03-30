import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { AXES_MIGRATION } from '../../../categories'
import { migrateData } from '../../../authorUtils'

// ── Helpers: sanitisation ──────────────────────────────────────────────────────

function sanitizeAxes(axes, axesColors) {
  if (!Array.isArray(axes)) return []
  const allowed = new Set(Object.keys(axesColors))
  return axes.map((a) => AXES_MIGRATION[a] ?? a).filter((a) => allowed.has(a))
}

function sanitizeBook(node, axesColors) {
  if (!node || typeof node !== 'object') return node
  return { ...node, axes: sanitizeAxes(node.axes, axesColors) }
}

function sanitizeAuthor(author, axesColors) {
  if (!author || typeof author !== 'object') return author
  return { ...author, axes: sanitizeAxes(author.axes, axesColors) }
}

function normalizeId(v) {
  if (v && typeof v === 'object') return v.id
  return v
}

function normalizeEndpointId(v) {
  const raw = normalizeId(v)
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return null
}

// ── Helpers: conversion DB ↔ app ───────────────────────────────────────────────

function dbBookToNode(row) {
  return {
    id: row.id,
    type: 'book',
    title: row.title,
    firstName: row.first_name,   // legacy — conservé pour rétrocompatibilité
    lastName: row.last_name,     // legacy — conservé pour rétrocompatibilité
    authorIds: row.author_ids || [],
    year: row.year,
    description: row.description || '',
    axes: row.axes || [],
  }
}

function dbAuthorToNode(row) {
  return {
    id: row.id,
    type: 'author',
    firstName: row.first_name,
    lastName: row.last_name,
    axes: row.axes || [],
  }
}

function dbLinkToLink(row) {
  return {
    id: row.id,
    source: row.source_id,
    target: row.target_id,
    citation_text: row.citation_text || '',
    edition: row.edition || '',
    page: row.page || '',
    context: row.context || '',
  }
}

function bookToDbRow(node) {
  return {
    id: node.id,
    title: node.title,
    first_name: node.firstName || '',
    last_name: node.lastName || '',
    author_ids: node.authorIds || [],
    year: node.year || null,
    description: node.description || '',
    axes: node.axes || [],
  }
}

function authorToDbRow(author) {
  return {
    id: author.id,
    first_name: author.firstName || '',
    last_name: author.lastName || '',
    axes: author.axes || [],
  }
}

// ── Chargement initial ─────────────────────────────────────────────────────────

async function loadFromSupabase({ axesColors }) {
  try {
    const [booksRes, authorsRes, linksRes] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: true }),
      supabase.from('authors').select('*').order('created_at', { ascending: true }),
      supabase.from('links').select('*'),
    ])
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

export default function useGraphData({ axesColors }) {
  const [books, setBooks] = useState([])
  const [authors, setAuthors] = useState([])
  const [links, setLinks] = useState([])
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
        return { ...l, source, target }
      })
      .filter(Boolean),
  }), [books, links])

  // ── Livres ───────────────────────────────────────────────────────────────────

  const handleAddBook = useCallback((book) => {
    const sanitized = sanitizeBook({ type: 'book', ...book }, axesColorsRef.current)
    setBooks((prev) => {
      if (prev.some((n) => n.id === sanitized.id)) return prev
      return [...prev, sanitized]
    })
    return supabase.from('books').insert(bookToDbRow(sanitized))
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur ajout livre', error) })
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
    supabase.from('books').update(fields).eq('id', id)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur mise à jour livre', error) })
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
    supabase.from('books').delete().eq('id', nodeId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur suppression livre', error) })
    return true
  }, [])

  // ── Auteurs ──────────────────────────────────────────────────────────────────

  const handleAddAuthor = useCallback((author) => {
    const sanitized = sanitizeAuthor({ type: 'author', ...author }, axesColorsRef.current)
    setAuthors((prev) => {
      if (prev.some((a) => a.id === sanitized.id)) return prev
      return [...prev, sanitized]
    })
    return supabase.from('authors').insert(authorToDbRow(sanitized))
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur ajout auteur', error) })
  }, [])

  const handleUpdateAuthor = useCallback((updatedAuthor) => {
    const sanitized = sanitizeAuthor({ type: 'author', ...updatedAuthor }, axesColorsRef.current)
    setAuthors((prev) => prev.map((a) => (a.id === sanitized.id ? sanitized : a)))
    const { id, ...fields } = authorToDbRow(sanitized)
    supabase.from('authors').update(fields).eq('id', id)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur mise à jour auteur', error) })
  }, [])

  const handleDeleteAuthor = useCallback((authorId) => {
    if (!authorId) return false
    if (!authorsRef.current.some((a) => a.id === authorId)) return false
    // Mettre à jour les livres qui référencent cet auteur
    const booksToUpdate = booksRef.current.filter((b) => b.authorIds?.includes(authorId))
    booksToUpdate.forEach((book) => {
      const updated = { ...book, authorIds: book.authorIds.filter((id) => id !== authorId) }
      const { id, ...fields } = bookToDbRow(updated)
      supabase.from('books').update(fields).eq('id', id)
        .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur MAJ authorId dans livre', error) })
    })
    setAuthors((prev) => prev.filter((a) => a.id !== authorId))
    if (booksToUpdate.length > 0) {
      setBooks((prev) => prev.map((b) =>
        b.authorIds?.includes(authorId)
          ? { ...b, authorIds: b.authorIds.filter((id) => id !== authorId) }
          : b
      ))
    }
    supabase.from('authors').delete().eq('id', authorId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur suppression auteur', error) })
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

    supabase.from('links').insert({
      id: newLink.id,
      source_id: srcId,
      target_id: tgtId,
      citation_text: newLink.citation_text,
      edition: newLink.edition,
      page: newLink.page,
      context: newLink.context,
    }).then(({ error }) => { if (error) console.warn('[trans_trame] Erreur ajout lien', error) })
  }, [])

  const handleDeleteLink = useCallback((linkId) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId))
    supabase.from('links').delete().eq('id', linkId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur suppression lien', error) })
  }, [])

  const handleUpdateLink = useCallback((linkId, updatedFields) => {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...updatedFields } : l)))
    supabase.from('links').update(updatedFields).eq('id', linkId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur mise à jour lien', error) })
  }, [])

  // ── Fusion de livres ─────────────────────────────────────────────────────────

  const handleMergeBooks = useCallback((fromNodeId, intoNodeId) => {
    if (!fromNodeId || !intoNodeId || fromNodeId === intoNodeId) return false

    const fromExists = books.some((n) => n.id === fromNodeId)
    const intoExists = books.some((n) => n.id === intoNodeId)
    if (!fromExists || !intoExists) return false

    const linksToUpdate = []
    const linkIdsToDelete = []
    const dedupe = new Set()
    const remappedLinks = []

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
        supabase.from('links').update({ source_id, target_id }).eq('id', id)
      ),
      ...linkIdsToDelete.map((id) =>
        supabase.from('links').delete().eq('id', id)
      ),
      supabase.from('books').delete().eq('id', fromNodeId),
    ]).then((results) => {
      const errors = results.filter((r) => r.error)
      if (errors.length > 0) console.warn('[trans_trame] Erreurs lors de la fusion', errors)
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
      const rows = newAuthors.map(authorToDbRow)
      const { error } = await supabase.from('authors').insert(rows)
      if (error) { console.warn('[trans_trame] Migration: erreur insert authors', error); return null }
      setAuthors((prev) => [...prev, ...newAuthors])
    }

    // Mettre à jour les livres avec leurs authorIds
    const booksToUpdate = updatedBooks.filter((b) => b.authorIds?.length > 0)
    await Promise.all(
      booksToUpdate.map((book) => {
        const { id, ...fields } = bookToDbRow(book)
        return supabase.from('books').update(fields).eq('id', id)
          .then(({ error }) => { if (error) console.warn('[trans_trame] Migration: erreur update book', id, error) })
      })
    )
    setBooks(updatedBooks)

    return { newAuthors: newAuthors.length, updatedBooks: booksToUpdate.length }
  }, [books, authors])

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetToDefault = useCallback(() => {
    setBooks([])
    setAuthors([])
    setLinks([])
    supabase.from('books').delete().not('id', 'is', null)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur reset', error) })
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

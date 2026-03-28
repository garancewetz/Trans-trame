import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { AXES_MIGRATION } from '../../../categories'

// ── Helpers: sanitisation ──────────────────────────────────────────────────────

function sanitizeAxes(axes, axesColors) {
  if (!Array.isArray(axes)) return []
  const allowed = new Set(Object.keys(axesColors))
  return axes.map((a) => AXES_MIGRATION[a] ?? a).filter((a) => allowed.has(a))
}

function sanitizeNode(node, axesColors) {
  if (!node || typeof node !== 'object') return node
  return { ...node, axes: sanitizeAxes(node.axes, axesColors) }
}

function normalizeId(v) {
  if (v && typeof v === 'object') return v.id
  return v
}

// ── Helpers: conversion DB ↔ app ───────────────────────────────────────────────

function dbBookToNode(row) {
  return {
    id: row.id,
    title: row.title,
    firstName: row.first_name,
    lastName: row.last_name,
    year: row.year,
    description: row.description || '',
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

function nodeToDbRow(node) {
  return {
    id: node.id,
    title: node.title,
    first_name: node.firstName || '',
    last_name: node.lastName || '',
    year: node.year || null,
    description: node.description || '',
    axes: node.axes || [],
  }
}

// ── Chargement initial ─────────────────────────────────────────────────────────

async function loadFromSupabase({ axesColors }) {
  try {
    const [booksRes, linksRes] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: true }),
      supabase.from('links').select('*'),
    ])
    if (booksRes.error || linksRes.error) return null
    return {
      nodes: (booksRes.data || []).map((r) => sanitizeNode(dbBookToNode(r), axesColors)),
      links: (linksRes.data || []).map(dbLinkToLink),
    }
  } catch {
    return null
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export default function useGraphData({ axesColors }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const axesColorsRef = useRef(axesColors)
  axesColorsRef.current = axesColors

  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    loadFromSupabase({ axesColors }).then((data) => {
      if (data) setGraphData(data)
    })
  }, [axesColors])

  // ── Livres ───────────────────────────────────────────────────────────────────

  const handleAddBook = useCallback((book) => {
    const sanitized = sanitizeNode(book, axesColorsRef.current)
    setGraphData((prev) => {
      if (prev.nodes.some((n) => n.id === sanitized.id)) return prev
      return { ...prev, nodes: [...prev.nodes, sanitized] }
    })
    supabase.from('books').insert(nodeToDbRow(sanitized))
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur ajout livre', error) })
  }, [])

  const handleUpdateBook = useCallback((updatedNode) => {
    const sanitized = sanitizeNode(updatedNode, axesColorsRef.current)
    setGraphData((prev) => {
      const prevNode = prev.nodes.find((n) => n.id === sanitized.id)
      if (prevNode) {
        // Mutation en place pour préserver les propriétés internes de force-graph (x, y, z…)
        Object.assign(prevNode, sanitized)
      }
      return { ...prev, nodes: [...prev.nodes] }
    })
    const { id, ...fields } = nodeToDbRow(sanitized)
    supabase.from('books').update(fields).eq('id', id)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur mise à jour livre', error) })
  }, [])

  const handleDeleteBook = useCallback((nodeId) => {
    if (!nodeId) return false
    let deleted = false
    setGraphData((prev) => {
      if (!prev.nodes.some((n) => n.id === nodeId)) return prev
      deleted = true
      return {
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        links: prev.links.filter((l) => {
          const srcId = normalizeId(l.source)
          const tgtId = normalizeId(l.target)
          return srcId !== nodeId && tgtId !== nodeId
        }),
      }
    })
    if (deleted) {
      // ON DELETE CASCADE dans la DB supprime automatiquement les liens associés
      supabase.from('books').delete().eq('id', nodeId)
        .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur suppression livre', error) })
    }
    return deleted
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

    setGraphData((prev) => {
      const isDuplicate = prev.links.some((l) => {
        const s = normalizeId(l.source)
        const t = normalizeId(l.target)
        return s === srcId && t === tgtId && l.citation_text === newLink.citation_text
      })
      if (isDuplicate) return prev
      return { ...prev, links: [...prev.links, newLink] }
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
    setGraphData((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== linkId),
    }))
    supabase.from('links').delete().eq('id', linkId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur suppression lien', error) })
  }, [])

  const handleUpdateLink = useCallback((linkId, updatedFields) => {
    setGraphData((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l.id === linkId ? { ...l, ...updatedFields } : l)),
    }))
    supabase.from('links').update(updatedFields).eq('id', linkId)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur mise à jour lien', error) })
  }, [])

  // ── Fusion de livres ─────────────────────────────────────────────────────────

  const handleMergeBooks = useCallback((fromNodeId, intoNodeId) => {
    if (!fromNodeId || !intoNodeId || fromNodeId === intoNodeId) return false

    // Validate existence synchronously before touching state
    const fromExists = graphData.nodes.some((n) => n.id === fromNodeId)
    const intoExists = graphData.nodes.some((n) => n.id === intoNodeId)
    if (!fromExists || !intoExists) return false

    // Compute remapped links outside of the updater
    const linksToUpdate = []
    const linkIdsToDelete = []
    const dedupe = new Set()
    const remappedLinks = []

    graphData.links.forEach((link) => {
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

    // Update local state
    setGraphData({
      nodes: graphData.nodes.filter((n) => n.id !== fromNodeId),
      links: remappedLinks,
    })

    // Persist to Supabase unconditionally (validation already passed above)
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
  }, [graphData])

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetToDefault = useCallback(() => {
    setGraphData({ nodes: [], links: [] })
    // Supprime tous les livres (CASCADE supprime les liens automatiquement)
    supabase.from('books').delete().not('id', 'is', null)
      .then(({ error }) => { if (error) console.warn('[trans_trame] Erreur reset', error) })
  }, [])

  return {
    graphData,
    setGraphData,
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleDeleteLink,
    handleUpdateLink,
    handleMergeBooks,
    resetToDefault,
  }
}

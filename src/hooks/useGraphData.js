import { useCallback, useEffect, useState } from 'react'
import {
  loadGraphData,
  persistGraphDataToLocalStorage,
  sanitizeNode,
  serializeGraphData,
} from '../api/graphStorage'

const STORAGE_KEY = 'trans_trame_data'

export default function useGraphData({ defaultData, axesColors }) {
  const [graphData, setGraphData] = useState(() =>
    loadGraphData({ defaultData, axesColors, storageKey: STORAGE_KEY })
  )

  const addEntry = useCallback(
    (newNode, newLink) => {
      setGraphData((prev) => {
        const safeNewNode = newNode ? sanitizeNode(newNode, axesColors) : null
        const nodes =
          safeNewNode && !prev.nodes.some((n) => n.id === safeNewNode.id)
            ? [...prev.nodes, safeNewNode]
            : [...prev.nodes]

        const isDuplicateLink =
          newLink &&
          prev.links.some((l) => {
            const srcA = typeof l.source === 'object' ? l.source.id : l.source
            const tgtA = typeof l.target === 'object' ? l.target.id : l.target
            return (
              srcA === newLink.source &&
              tgtA === newLink.target &&
              l.citation_text === newLink.citation_text
            )
          })

        const links = newLink && !isDuplicateLink ? [...prev.links, newLink] : [...prev.links]

        const next = { nodes, links }
        persistGraphDataToLocalStorage(next, STORAGE_KEY)
        return next
      })
    },
    [axesColors]
  )

  const handleAddBook = useCallback((book) => addEntry(book, null), [addEntry])
  const handleAddLink = useCallback((link) => addEntry(null, link), [addEntry])

  const handleUpdateBook = useCallback(
    (updatedNode) => {
      setGraphData((prev) => {
        const prevNode = prev.nodes.find((n) => n.id === updatedNode.id)
        if (prevNode) {
          // Mutate in place to preserve force-graph internal properties (x, y, z, vx, vy, vz…)
          const sanitized = sanitizeNode(updatedNode, axesColors)
          Object.assign(prevNode, sanitized)
        }
        const next = { ...prev, nodes: [...prev.nodes] }
        persistGraphDataToLocalStorage(next, STORAGE_KEY)
        return next
      })
    },
    [axesColors]
  )

  const handleDeleteBook = useCallback((nodeId) => {
    if (!nodeId) return false
    let deleted = false
    setGraphData((prev) => {
      if (!prev.nodes.some((n) => n.id === nodeId)) return prev
      deleted = true
      const next = {
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        links: prev.links.filter((l) => {
          const srcId = typeof l.source === 'object' ? l.source.id : l.source
          const tgtId = typeof l.target === 'object' ? l.target.id : l.target
          return srcId !== nodeId && tgtId !== nodeId
        }),
      }
      persistGraphDataToLocalStorage(next, STORAGE_KEY)
      return next
    })
    return deleted
  }, [])

  const handleMergeBooks = useCallback((fromNodeId, intoNodeId) => {
    if (!fromNodeId || !intoNodeId || fromNodeId === intoNodeId) return false
    let merged = false
    setGraphData((prev) => {
      const fromExists = prev.nodes.some((n) => n.id === fromNodeId)
      const intoExists = prev.nodes.some((n) => n.id === intoNodeId)
      if (!fromExists || !intoExists) return prev
      merged = true

      const dedupe = new Set()
      const remappedLinks = []
      prev.links.forEach((link) => {
        const srcIdRaw = typeof link.source === 'object' ? link.source.id : link.source
        const tgtIdRaw = typeof link.target === 'object' ? link.target.id : link.target
        const srcId = srcIdRaw === fromNodeId ? intoNodeId : srcIdRaw
        const tgtId = tgtIdRaw === fromNodeId ? intoNodeId : tgtIdRaw
        if (!srcId || !tgtId || srcId === tgtId) return
        const key = `${srcId}|${tgtId}|${link.citation_text || ''}|${link.page || ''}|${link.edition || ''}`
        if (dedupe.has(key)) return
        dedupe.add(key)
        remappedLinks.push({ ...link, source: srcId, target: tgtId })
      })

      const next = {
        nodes: prev.nodes.filter((n) => n.id !== fromNodeId),
        links: remappedLinks,
      }
      persistGraphDataToLocalStorage(next, STORAGE_KEY)
      return next
    })
    return merged
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const payload = serializeGraphData(graphData)
        const json = JSON.stringify(payload)
        const bytes = new Blob([json]).size
        if (bytes > 4_500_000) return
        localStorage.setItem(STORAGE_KEY, json)
      } catch {
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [graphData])

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setGraphData({ nodes: [...defaultData.nodes], links: [...defaultData.links] })
  }, [defaultData.links, defaultData.nodes])

  return {
    graphData,
    setGraphData,
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleMergeBooks,
    resetToDefault,
  }
}

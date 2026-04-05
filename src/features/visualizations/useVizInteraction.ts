import { useMemo, useState } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { getCitationEdges, type CitationEdge } from './utils'

interface Args {
  graphData: GraphData
  selectedId: string | null
  activeFilter?: string | null
  hoveredFilter?: string | null
}

export function useVizInteraction({ graphData, selectedId, activeFilter, hoveredFilter }: Args) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const books = useMemo(
    () => graphData.nodes.filter((n) => n.type === 'book') as Book[],
    [graphData.nodes],
  )

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])

  const nodeAxesSet = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const b of books) m.set(b.id, b.axes ?? [])
    return m
  }, [books])

  const relatedIds = useMemo(() => {
    if (!selectedId) return null
    const ids = new Set<string>()
    for (const { sourceId, targetId } of edges) {
      if (sourceId === selectedId) ids.add(targetId)
      if (targetId === selectedId) ids.add(sourceId)
    }
    return ids
  }, [selectedId, edges])

  const hoveredNeighborIds = useMemo(() => {
    if (!hoveredId) return null
    const ids = new Set<string>()
    for (const { sourceId, targetId } of edges) {
      if (sourceId === hoveredId) ids.add(targetId)
      if (targetId === hoveredId) ids.add(sourceId)
    }
    return ids
  }, [hoveredId, edges])

  const currentFilter = hoveredFilter ?? activeFilter ?? null

  const nodeMatchesFilter = useMemo(() => {
    if (!currentFilter) return null
    const m = new Map<string, boolean>()
    for (const b of books) m.set(b.id, (b.axes ?? []).includes(currentFilter))
    return m
  }, [books, currentFilter])

  function filterOpacity(nodeId: string): number {
    if (!nodeMatchesFilter) return 1
    return nodeMatchesFilter.get(nodeId) ? 1 : 0.15
  }

  function linkFilterOpacity(sourceId: string, targetId: string): number {
    if (!nodeMatchesFilter) return 1
    const srcMatch = nodeMatchesFilter.get(sourceId) ?? false
    const tgtMatch = nodeMatchesFilter.get(targetId) ?? false
    if (srcMatch || tgtMatch) return 1
    return 0.12
  }

  return {
    hoveredId,
    setHoveredId,
    books,
    edges,
    bookMap,
    nodeAxesSet,
    relatedIds,
    hoveredNeighborIds,
    filterOpacity,
    linkFilterOpacity,
  }
}

import { useCallback, useMemo, useRef, useState } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { getCitationEdges } from './utils'

interface Args {
  graphData: GraphData
  selectedId: string | null
  activeFilter?: string | null
  hoveredFilter?: string | null
}

/**
 * Adjacency index : pour chaque nœud, ses voisins citation (entrants + sortants).
 * O(degree) pour déterminer « voisins du nœud X » sans itérer sur toutes les arêtes.
 */
function buildAdjacency(edges: { sourceId: string; targetId: string }[]) {
  const m = new Map<string, Set<string>>()
  const ensure = (id: string) => {
    let s = m.get(id)
    if (!s) { s = new Set(); m.set(id, s) }
    return s
  }
  for (const { sourceId, targetId } of edges) {
    ensure(sourceId).add(targetId)
    ensure(targetId).add(sourceId)
  }
  return m
}

export function useVizInteraction({ graphData, selectedId, activeFilter, hoveredFilter }: Args) {
  // Hover state : on garde un state React pour déclencher le re-render des
  // overlays focaux, mais le reste de l'UI (base layer) est mémorisé sans
  // dépendre de `hoveredId` pour éviter de re-render des centaines de nœuds
  // à chaque mouvement de souris — pattern inspiré de Galaxy (cf. Graph.tsx).
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const books = useMemo(
    () => graphData.nodes.filter((n): n is Book => n.type === 'book'),
    [graphData.nodes],
  )

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])

  const nodeAxesSet = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const b of books) m.set(b.id, b.axes ?? [])
    return m
  }, [books])

  const adjacency = useMemo(() => buildAdjacency(edges), [edges])

  const relatedIds = useMemo(() => {
    if (!selectedId) return null
    return adjacency.get(selectedId) ?? new Set<string>()
  }, [selectedId, adjacency])

  const hoveredNeighborIds = useMemo(() => {
    if (!hoveredId) return null
    return adjacency.get(hoveredId) ?? new Set<string>()
  }, [hoveredId, adjacency])

  const currentFilter = hoveredFilter ?? activeFilter ?? null

  const nodeMatchesFilter = useMemo(() => {
    if (!currentFilter) return null
    const m = new Map<string, boolean>()
    for (const b of books) m.set(b.id, (b.axes ?? []).includes(currentFilter))
    return m
  }, [books, currentFilter])

  // Helpers stables (useCallback) pour que les memos consommateurs ne
  // soient invalidés que si `nodeMatchesFilter` change — pas à chaque render.
  const filterOpacity = useCallback(
    (nodeId: string): number => {
      if (!nodeMatchesFilter) return 1
      return nodeMatchesFilter.get(nodeId) ? 1 : 0.15
    },
    [nodeMatchesFilter],
  )

  const linkFilterOpacity = useCallback(
    (sourceId: string, targetId: string): number => {
      if (!nodeMatchesFilter) return 1
      const srcMatch = nodeMatchesFilter.get(sourceId) ?? false
      const tgtMatch = nodeMatchesFilter.get(targetId) ?? false
      if (srcMatch || tgtMatch) return 1
      return 0.12
    },
    [nodeMatchesFilter],
  )

  // Ref miroir pour les handlers stables : évite de recréer les callbacks
  // à chaque changement de hoveredId.
  const hoveredIdRef = useRef<string | null>(null)
  hoveredIdRef.current = hoveredId

  return {
    hoveredId,
    setHoveredId,
    hoveredIdRef,
    books,
    edges,
    bookMap,
    nodeAxesSet,
    adjacency,
    relatedIds,
    hoveredNeighborIds,
    nodeMatchesFilter,
    filterOpacity,
    linkFilterOpacity,
  }
}

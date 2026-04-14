import { useMemo } from 'react'
import type { AuthorId, Book, GraphData } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'
import { linkKeyOf } from '../domain/linkStyle'

type Args = {
  graphData: GraphData
  selectedAuthorId: AuthorId | null
  peekNodeId: string | null
  selectedNode: Book | null
}

export function useGraphDerivedLinkState({ graphData, selectedAuthorId, peekNodeId, selectedNode }: Args) {
  const authorNodeIds = useMemo(() => {
    if (!selectedAuthorId) return new Set<string>()
    const ids = new Set<string>()
    ids.add(selectedAuthorId)
    graphData.nodes.forEach((n) => {
      if (n.authorIds?.includes(selectedAuthorId)) ids.add(n.id)
    })
    return ids
  }, [selectedAuthorId, graphData.nodes])

  const anchorIds = useMemo(() => {
    if (peekNodeId) return new Set([peekNodeId])
    if (selectedNode) return new Set([selectedNode.id])
    if (authorNodeIds.size) return authorNodeIds
    return null
  }, [peekNodeId, selectedNode, authorNodeIds])

  const connectedLinks = useMemo(() => {
    if (!anchorIds) return new Set<string>()
    const set = new Set<string>()
    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId) || anchorIds.has(tgtId)) set.add(linkKeyOf(srcId, tgtId))
    })
    return set
  }, [anchorIds, graphData.links])

  const connectedNodes = useMemo(() => {
    if (!anchorIds) return new Set<string>()
    const set = new Set(anchorIds)
    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId)) set.add(tgtId)
      if (anchorIds.has(tgtId)) set.add(srcId)
    })
    return set
  }, [anchorIds, graphData.links])

  // Comptages basés sur les liens de citation (hors author-book) : une seule passe.
  const { citationsByNodeId, linkWeights, degreeByNodeId } = useMemo(() => {
    const citations = new Map<string, number>()
    const weights = new Map<string, number>()
    const degree = new Map<string, number>()
    const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) || 0) + 1)

    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return

      bump(citations, tgtId) // inlinks (cité par N)
      bump(weights, linkKeyOf(srcId, tgtId)) // multiplicité dirigée A→B (≠ B→A)
      bump(degree, srcId)
      bump(degree, tgtId)
    })

    return {
      citationsByNodeId: citations,
      linkWeights: weights,
      degreeByNodeId: degree,
    }
  }, [graphData.links])

  // Top N livres par degré (in+out) : sert à étiqueter en permanence les
  // carrefours bibliographiques de la constellation, même en vue d'ensemble.
  // N choisi pour rester lisible sans saturer (~12 ancres nommées).
  // Les auteurs sont naturellement exclus : degreeByNodeId ignore les liens
  // author-book, donc ils tombent toujours à 0 et sont filtrés par `d <= 0`.
  const topDegreeNodeIds = useMemo(() => {
    const TOP_LANDMARK_COUNT = 12
    const candidates: Array<{ id: string; degree: number }> = []
    graphData.nodes.forEach((n) => {
      const d = degreeByNodeId.get(n.id) || 0
      if (d <= 0) return
      candidates.push({ id: n.id, degree: d })
    })
    candidates.sort((a, b) => b.degree - a.degree)
    return new Set(candidates.slice(0, TOP_LANDMARK_COUNT).map((c) => c.id))
  }, [graphData.nodes, degreeByNodeId])

  return {
    authorNodeIds,
    anchorIds,
    connectedLinks,
    connectedNodes,
    citationsByNodeId,
    linkWeights,
    degreeByNodeId,
    topDegreeNodeIds,
  }
}

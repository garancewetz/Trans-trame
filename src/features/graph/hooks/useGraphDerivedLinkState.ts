import { useMemo } from 'react'
import type { AuthorId, Book, GraphData } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'

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
      if (anchorIds.has(srcId) || anchorIds.has(tgtId)) set.add(`${srcId}-${tgtId}`)
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

  const citationsByNodeId = useMemo(() => {
    const counts = new Map<string, number>()
    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return
      const targetId = normalizeEndpointId(link.target)
      if (!targetId) return
      counts.set(targetId, (counts.get(targetId) || 0) + 1)
    })
    return counts
  }, [graphData.links])

  const linkWeights = useMemo(() => {
    const counts = new Map<string, number>()
    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      const key = [srcId, tgtId].sort().join('-')
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [graphData.links])

  return {
    authorNodeIds,
    anchorIds,
    connectedLinks,
    connectedNodes,
    citationsByNodeId,
    linkWeights,
  }
}

import type { GraphData, Book, Link } from '@/types/domain'

function endpointId(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (v != null && typeof v === 'object' && 'id' in v) {
    return typeof v.id === 'string' ? v.id : undefined
  }
  return undefined
}

export type Ref = { other: Book | undefined; link: Link }

export function getOutgoingRefs(graphData: GraphData, node: Book): Ref[] {
  return graphData.links
    .filter((l) => endpointId(l.source) === node.id)
    .map((l) => ({
      link: l,
      other: graphData.nodes.find((n) => n.id === endpointId(l.target)),
    }))
}

export function getIncomingRefs(graphData: GraphData, node: Book): Ref[] {
  return graphData.links
    .filter((l) => endpointId(l.target) === node.id)
    .map((l) => ({
      link: l,
      other: graphData.nodes.find((n) => n.id === endpointId(l.source)),
    }))
}

export function getLinkNodes(graphData: GraphData, link: Link) {
  const srcId = endpointId(link.source)
  const tgtId = endpointId(link.target)
  return { source: graphData.nodes.find((n) => n.id === srcId), target: graphData.nodes.find((n) => n.id === tgtId) }
}

export function computeSameAuthorBooks(graphData: GraphData, selectedNode: Book | null) {
  if (!selectedNode || !selectedNode.authorIds?.length) return []

  const authorIds = new Set(selectedNode.authorIds)
  return graphData.nodes
    .filter((n) => n.id !== selectedNode.id)
    .filter((n) => n.authorIds?.some((aid) => authorIds.has(aid)))
    .sort((a, b) => {
      const ay = Number(a.year) || 0
      const by = Number(b.year) || 0
      if (ay !== by) return by - ay
      return String(a.title || '').localeCompare(String(b.title || ''), 'fr', { sensitivity: 'base' })
    })
}


import type { Book, BookId, Link } from '@/types/domain'

function extractId(value: unknown): BookId {
  if (value && typeof value === 'object') return (value as { id: BookId }).id
  return value as BookId
}

export function resolveLinks(links: Link[], nodes: Book[]) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  return links.map((link) => {
    const srcId = extractId(link.source)
    const tgtId = extractId(link.target)
    return {
      ...link,
      _srcId: srcId,
      _tgtId: tgtId,
      sourceNode: nodeMap.get(srcId) ?? null,
      targetNode: nodeMap.get(tgtId) ?? null,
    }
  })
}

import type { Highlight } from '@/core/FilterContext'

type AdjacencyEntry = { linkKeys: string[]; neighborIds: string[] }

/**
 * Determines whether a node is visible given the current filter/highlight state.
 * Pure function — no React hooks or side effects.
 */
export function isNodeVisibleForFilters(
  node: { id: string; type?: string; axes?: string[]; year?: number | null; authorIds?: string[] },
  activeFilter: string | null,
  activeHighlight: Highlight | null,
  linksByNodeId: Map<string, AdjacencyEntry>,
  citationsByNodeId?: Map<string, number> | null,
): boolean {
  if (activeHighlight) {
    switch (activeHighlight.kind) {
      case 'decade': {
        if (node.type === 'author') return true
        const y = node.year
        return y != null && Math.floor(y / 10) * 10 === activeHighlight.decade
      }
      case 'book': {
        if (node.id === activeHighlight.bookId) return true
        const entry = linksByNodeId.get(activeHighlight.bookId)
        return entry?.neighborIds.includes(node.id) ?? false
      }
      case 'author': {
        if (node.type === 'author') return node.id === activeHighlight.authorId
        return (node.authorIds || []).includes(activeHighlight.authorId)
      }
      case 'citedMin': {
        if (node.type === 'author') return true
        const c = citationsByNodeId?.get(node.id) ?? 0
        return c >= activeHighlight.min
      }
    }
  }
  if (!activeFilter) return true
  if (node.type === 'author') return true
  return (node.axes || []).includes(activeFilter)
}

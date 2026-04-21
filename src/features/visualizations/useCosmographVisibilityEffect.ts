import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import type { Book, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { isNodeVisibleForFilters } from '@/features/graph/domain/nodeVisibility'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'

type AdjacencyIndex = Map<string, { neighborIds: string[] }>

type Args = {
  graphRef: RefObject<Graph | null>
  books: Book[]
  activeFilter: string | null | undefined
  hoveredFilter: string | null | undefined
  activeHighlight: Highlight | null | undefined
  selectedAuthorId: string | null | undefined
  timelineRange: TimelineRange | null | undefined
  linksByNodeId: AdjacencyIndex
  citationsByBookId: Map<string, number>
  visibleIndexSetRef: MutableRefObject<Set<number> | null>
  applyFocalRef: ApplyFocalVisualStateRef
  drawOverlay: () => void
}

/**
 * Greyout basé sur filtres / highlights / plage timeline. Reprend
 * isNodeVisibleForFilters de Galaxy pour garder la sémantique cohérente.
 * La timeline s'ajoute comme prédicat supplémentaire — livre in-range si
 * son année est dans [start, end]. Livres sans année : toujours visibles
 * (aligné avec useAppTimelineAndLayout).
 */
export function useCosmographVisibilityEffect({
  graphRef, books, activeFilter, hoveredFilter, activeHighlight, selectedAuthorId,
  timelineRange, linksByNodeId, citationsByBookId, visibleIndexSetRef,
  applyFocalRef, drawOverlay,
}: Args): void {
  useEffect(() => {
    const g = graphRef.current
    if (!g || books.length === 0) return

    const effectiveFilter = hoveredFilter ?? activeFilter ?? null
    const effectiveHighlight = activeHighlight
      ?? (selectedAuthorId ? { kind: 'author' as const, authorId: selectedAuthorId } : null)

    const inRange = (book: Book): boolean => {
      if (!timelineRange) return true
      const y = book.year
      if (y == null) return true
      return y >= timelineRange.start && y <= timelineRange.end
    }

    if (!effectiveFilter && !effectiveHighlight && !timelineRange) {
      visibleIndexSetRef.current = null
      applyFocalRef.current()
      g.render()
      drawOverlay()
      return
    }

    const matched: number[] = []
    for (let i = 0; i < books.length; i++) {
      const b = books[i]
      if (!inRange(b)) continue
      if (isNodeVisibleForFilters(b, effectiveFilter, effectiveHighlight, linksByNodeId, citationsByBookId)) {
        matched.push(i)
      }
    }
    visibleIndexSetRef.current = new Set(matched)
    applyFocalRef.current()
    g.render()
    drawOverlay()
  }, [
    graphRef, books, activeFilter, hoveredFilter, activeHighlight, selectedAuthorId,
    timelineRange, linksByNodeId, citationsByBookId, visibleIndexSetRef,
    applyFocalRef, drawOverlay,
  ])
}

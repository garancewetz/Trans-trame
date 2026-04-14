import { useMemo, type ReactElement } from 'react'
import { nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { nodeRadius } from './histogram/histogramLayout'
import type { Arc } from './histogram/histogramLayout'
import type { Book } from '@/types/domain'

type FocalArcsProps = {
  arcs: Arc[]
  selectedId: string | null
  hoveredId: string | null
  linkFilterOpacity: (sourceId: string, targetId: string) => number
}

export function HistCiteFocalArcs({ arcs, selectedId, hoveredId, linkFilterOpacity }: FocalArcsProps) {
  return useMemo(() => {
    if (!selectedId && !hoveredId) return null
    const focalIds = new Set<string>()
    if (selectedId) focalIds.add(selectedId)
    if (hoveredId) focalIds.add(hoveredId)
    return arcs.flatMap((arc, i) => {
      if (!focalIds.has(arc.sourceId) && !focalIds.has(arc.targetId)) return []
      return [(
        <g key={arc.key} opacity={linkFilterOpacity(arc.sourceId, arc.targetId)}>
          <CitationLink
            d={arc.d}
            sourceId={arc.sourceId}
            targetId={arc.targetId}
            selectedId={selectedId}
            hoveredId={hoveredId}
            linkIndex={i}
            sx={arc.sx}
            sy={arc.sy}
            tx={arc.tx}
            ty={arc.ty}
          />
        </g>
      )]
    })
  }, [arcs, selectedId, hoveredId, linkFilterOpacity])
}

type FocalNodesProps = {
  selectedId: string | null
  hoveredId: string | null
  relatedIds: Set<string> | null
  hoveredNeighborIds: Set<string> | null
  bookMap: Map<string, Book>
  nodePos: Map<string, { x: number; y: number }>
  citationCount: Map<string, number>
  filterOpacity: (id: string) => number
  onClick: (book: Book) => void
  onEnter: (id: string) => void
  onLeave: () => void
}

export function HistCiteFocalNodes({
  selectedId, hoveredId, relatedIds, hoveredNeighborIds,
  bookMap, nodePos, citationCount, filterOpacity,
  onClick, onEnter, onLeave,
}: FocalNodesProps) {
  return useMemo(() => {
    if (!selectedId && !hoveredId) return null
    const focalIds = new Set<string>()
    if (selectedId) {
      focalIds.add(selectedId)
      relatedIds?.forEach((id) => focalIds.add(id))
    }
    if (hoveredId) {
      focalIds.add(hoveredId)
      hoveredNeighborIds?.forEach((id) => focalIds.add(id))
    }
    const out: ReactElement[] = []
    for (const id of focalIds) {
      const book = bookMap.get(id)
      const pos = nodePos.get(id)
      if (!book || !pos || typeof book.year !== 'number') continue
      const fill = nodeFill(book.axes)
      const bookR = nodeRadius(citationCount.get(id) ?? 0)
      const nv = getNodeVisual(id, bookR, selectedId, relatedIds, hoveredId, hoveredNeighborIds)
      const isHovered = id === hoveredId
      out.push(
        <g
          key={id}
          opacity={filterOpacity(id)}
          onClick={() => onClick(book)}
          onMouseEnter={() => onEnter(id)}
          onMouseLeave={onLeave}
          style={nodeHoverStyle(isHovered)}
        >
          {nv.glowR != null && (
            <circle cx={pos.x} cy={pos.y} r={nv.glowR} fill={fill} fillOpacity={nv.glowOpacity} />
          )}
          <circle cx={pos.x} cy={pos.y} r={nv.r} fill={fill} fillOpacity={nv.opacity} />
        </g>,
      )
    }
    return out
  }, [
    selectedId, hoveredId, relatedIds, hoveredNeighborIds,
    bookMap, nodePos, citationCount, filterOpacity,
    onClick, onEnter, onLeave,
  ])
}

import { useMemo, type ReactElement } from 'react'
import { nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { shortTitle } from './utils'
import type { Book } from '@/types/domain'
import type { Chord } from './dendrogram/dendrogramLayout'

type Props = {
  chords: Chord[]
  selectedId: string | null
  hoveredId: string | null
  relatedIds: Set<string> | null
  hoveredNeighborIds: Set<string> | null
  bookMap: Map<string, Book>
  nodePos: Map<string, { x: number; y: number }>
  bookAngles: Map<string, number>
  filterOpacity: (id: string) => number
  linkFilterOpacity: (sourceId: string, targetId: string) => number
  onClick: (book: Book) => void
  onEnter: (id: string) => void
  onLeave: () => void
  nodeR: number
  cx: number
  cy: number
  labelR: number
}

export function DendrogramFocalChords({
  chords, selectedId, hoveredId, linkFilterOpacity,
}: Pick<Props, 'chords' | 'selectedId' | 'hoveredId' | 'linkFilterOpacity'>) {
  return useMemo(() => {
    if (!selectedId && !hoveredId) return null
    const focalIds = new Set<string>()
    if (selectedId) focalIds.add(selectedId)
    if (hoveredId) focalIds.add(hoveredId)
    return chords.flatMap((c, i) => {
      if (!focalIds.has(c.sourceId) && !focalIds.has(c.targetId)) return []
      return [(
        <g key={c.key} opacity={linkFilterOpacity(c.sourceId, c.targetId)}>
          <CitationLink
            d={c.d}
            sourceId={c.sourceId}
            targetId={c.targetId}
            selectedId={selectedId}
            hoveredId={hoveredId}
            linkIndex={i}
            sx={c.sx}
            sy={c.sy}
            tx={c.tx}
            ty={c.ty}
          />
        </g>
      )]
    })
  }, [chords, selectedId, hoveredId, linkFilterOpacity])
}

export function DendrogramFocalNodes({
  selectedId, hoveredId, relatedIds, hoveredNeighborIds,
  bookMap, nodePos, filterOpacity, onClick, onEnter, onLeave, nodeR,
}: Pick<Props,
  'selectedId' | 'hoveredId' | 'relatedIds' | 'hoveredNeighborIds' |
  'bookMap' | 'nodePos' | 'filterOpacity' | 'onClick' | 'onEnter' | 'onLeave' | 'nodeR'
>) {
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
      const p = nodePos.get(id)
      if (!book || !p) continue
      const fill = nodeFill(book.axes)
      const nv = getNodeVisual(id, nodeR, selectedId, relatedIds, hoveredId, hoveredNeighborIds)
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
            <circle cx={p.x} cy={p.y} r={nv.glowR} fill={fill} fillOpacity={nv.glowOpacity} />
          )}
          <circle cx={p.x} cy={p.y} r={nv.r} fill={fill} fillOpacity={nv.opacity} />
        </g>,
      )
    }
    return out
  }, [
    selectedId, hoveredId, relatedIds, hoveredNeighborIds,
    bookMap, nodePos, filterOpacity, onClick, onEnter, onLeave, nodeR,
  ])
}

export function DendrogramFocalLabels({
  selectedId, hoveredId, relatedIds, hoveredNeighborIds,
  bookMap, bookAngles, cx, cy, labelR,
}: Pick<Props,
  'selectedId' | 'hoveredId' | 'relatedIds' | 'hoveredNeighborIds' |
  'bookMap' | 'bookAngles' | 'cx' | 'cy' | 'labelR'
>) {
  return useMemo(() => {
    const ids = new Set<string>()
    if (selectedId) {
      ids.add(selectedId)
      relatedIds?.forEach((id) => ids.add(id))
    }
    if (hoveredId) {
      ids.add(hoveredId)
      hoveredNeighborIds?.forEach((id) => ids.add(id))
    }
    if (ids.size === 0) return null
    const out: ReactElement[] = []
    for (const id of ids) {
      const book = bookMap.get(id)
      if (!book) continue
      const angle = bookAngles.get(id) ?? 0
      const lx = cx + Math.cos(angle) * labelR
      const ly = cy + Math.sin(angle) * labelR
      const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'
      const fill = nodeFill(book.axes)
      const prominent = id === selectedId || id === hoveredId
      out.push(
        <text
          key={`lbl-${id}`}
          x={lx}
          y={ly}
          textAnchor={anchor}
          fontSize={prominent ? 12 : 10}
          fill={prominent ? 'rgba(255,255,255,0.95)' : fill}
          fontFamily="sans-serif"
          fontWeight={prominent ? 700 : 400}
        >
          {shortTitle(book.title, 32)}
        </text>,
      )
    }
    return out
  }, [selectedId, hoveredId, relatedIds, hoveredNeighborIds, bookMap, bookAngles, cx, cy, labelR])
}

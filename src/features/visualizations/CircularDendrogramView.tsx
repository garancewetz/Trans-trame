import { useMemo, useState } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { getCitationEdges, shortTitle } from './utils'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { AXES, AXES_COLORS, AXES_LABELS } from '@/common/utils/categories'

const TWO_PI = Math.PI * 2

interface Props {
  graphData: GraphData
  authors: Author[]
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
  hoveredFilter?: string | null
}

export function CircularDendrogramView({ graphData, authors, onNodeClick, activeFilter, hoveredFilter }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])

  const books = useMemo(
    () => graphData.nodes.filter((n) => n.type === 'book') as Book[],
    [graphData.nodes],
  )

  const nodeAxesSet = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const b of books) m.set(b.id, b.axes ?? [])
    return m
  }, [books])

  const sortedBooks = useMemo(() => {
    const axisOrder = Object.fromEntries(AXES.map((a, i) => [a, i]))
    return [...books].sort((a, b) => {
      const ai = axisOrder[a.axes?.[0] ?? ''] ?? 99
      const bi = axisOrder[b.axes?.[0] ?? ''] ?? 99
      if (ai !== bi) return ai - bi
      return (a.year ?? 9999) - (b.year ?? 9999)
    })
  }, [books])

  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2 - 100
  const labelR = R + 28
  const nodeR = 5

  const bookAngles = useMemo(() => {
    const n = sortedBooks.length
    return new Map(sortedBooks.map((b, i) => [b.id, (i / Math.max(n, 1)) * TWO_PI - Math.PI / 2]))
  }, [sortedBooks])

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])

  const pos = (id: string) => {
    const angle = bookAngles.get(id) ?? 0
    return { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R }
  }

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

  const chords = useMemo(() => {
    return edges.flatMap(({ sourceId, targetId }) => {
      if (!bookAngles.has(sourceId) || !bookAngles.has(targetId)) return []
      const src = pos(sourceId)
      const tgt = pos(targetId)
      const cpFactor = 0.18
      const cpX = cx + (src.x - cx) * cpFactor + (tgt.x - cx) * cpFactor
      const cpY = cy + (src.y - cy) * cpFactor + (tgt.y - cy) * cpFactor
      return [{
        d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`,
        sourceId,
        targetId,
      }]
    })
  }, [edges, bookAngles, cx, cy, R])

  const axisArcs = useMemo(() => {
    const arcR = R + 14
    const groups: { axis: string; startAngle: number; endAngle: number }[] = []
    let currentAxis: string | null = null
    let startIdx = 0
    const n = sortedBooks.length

    sortedBooks.forEach((b, i) => {
      const axis = b.axes?.[0] ?? '__none__'
      if (axis !== currentAxis) {
        if (currentAxis !== null) {
          groups.push({
            axis: currentAxis,
            startAngle: (startIdx / n) * TWO_PI - Math.PI / 2,
            endAngle: (i / n) * TWO_PI - Math.PI / 2,
          })
        }
        currentAxis = axis
        startIdx = i
      }
    })
    if (currentAxis !== null && n > 0) {
      groups.push({
        axis: currentAxis,
        startAngle: (startIdx / n) * TWO_PI - Math.PI / 2,
        endAngle: TWO_PI - Math.PI / 2,
      })
    }

    return groups.map(({ axis, startAngle, endAngle }) => {
      const GAP = 0.02
      const sa = startAngle + GAP
      const ea = endAngle - GAP
      const x1 = cx + Math.cos(sa) * arcR
      const y1 = cy + Math.sin(sa) * arcR
      const x2 = cx + Math.cos(ea) * arcR
      const y2 = cy + Math.sin(ea) * arcR
      const large = ea - sa > Math.PI ? 1 : 0
      const color = AXES_COLORS[axis as keyof typeof AXES_COLORS] ?? '#888'
      return { d: `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${large} 1 ${x2} ${y2}`, color, axis }
    })
  }, [sortedBooks, cx, cy, R])

  const currentFilter = hoveredFilter ?? activeFilter ?? null

  const nodeMatchesFilter = useMemo(() => {
    if (!currentFilter) return null
    const m = new Map<string, boolean>()
    for (const b of books) m.set(b.id, (b.axes ?? []).includes(currentFilter))
    return m
  }, [books, currentFilter])

  function filterOpacity(nodeId: string): number {
    if (!nodeMatchesFilter) return 1
    return nodeMatchesFilter.get(nodeId) ? 1 : hoveredFilter ? 0.06 : 0.15
  }

  function linkFilterOpacity(sourceId: string, targetId: string): number {
    if (!nodeMatchesFilter) return 1
    const srcMatch = nodeMatchesFilter.get(sourceId) ?? false
    const tgtMatch = nodeMatchesFilter.get(targetId) ?? false
    if (srcMatch || tgtMatch) return 1
    return hoveredFilter ? 0.08 : 0.12
  }

  function handleNodeClick(book: Book) {
    if (hasMoved()) return
    setSelectedId(book.id === selectedId ? null : book.id)
    onNodeClick?.(book)
  }

  const selectedBook = selectedId ? bookMap.get(selectedId) : null

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          {/* Chords */}
          {chords.map((c, i) => (
            <g key={i} opacity={linkFilterOpacity(c.sourceId, c.targetId)}>
              <CitationLink
                d={c.d}
                sourceId={c.sourceId}
                targetId={c.targetId}
                selectedId={selectedId}
                hoveredId={hoveredId}
                linkIndex={i}
              />
            </g>
          ))}

          {/* Axis arcs */}
          {axisArcs.map((arc, i) => (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={5} strokeOpacity={currentFilter ? (currentFilter === arc.axis ? 0.9 : 0.08) : 0.6} strokeLinecap="round" />
          ))}

          {/* Book nodes */}
          {sortedBooks.map((book) => {
            const { x, y } = pos(book.id)
            const fill = nodeFill(book.axes)
            const nv = getNodeVisual(book.id, nodeR, selectedId, relatedIds, hoveredId, hoveredNeighborIds)
            const fOpacity = filterOpacity(book.id)
            return (
              <g
                key={book.id}
                opacity={fOpacity}
                onClick={() => handleNodeClick(book)}
                onMouseEnter={() => setHoveredId(book.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={nodeHoverStyle(hoveredId === book.id)}
              >
                {nv.glowR != null && (
                  <circle cx={x} cy={y} r={nv.glowR} fill={fill} fillOpacity={nv.glowOpacity} />
                )}
                <circle cx={x} cy={y} r={nv.r} fill={fill} fillOpacity={nv.opacity} />
              </g>
            )
          })}

          {/* Labels: show for selected, its relations, hovered and hovered neighbors */}
          {sortedBooks.map((book) => {
            const isSelected = book.id === selectedId
            const isRelated = relatedIds?.has(book.id) ?? false
            const isHovered = book.id === hoveredId
            const isHoverNeighbor = hoveredNeighborIds?.has(book.id) ?? false
            if (!isSelected && !isRelated && !isHovered && !isHoverNeighbor) return null
            const angle = bookAngles.get(book.id) ?? 0
            const lx = cx + Math.cos(angle) * labelR
            const ly = cy + Math.sin(angle) * labelR
            const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'
            const fill = nodeFill(book.axes)
            const prominent = isSelected || isHovered
            return (
              <text
                key={`lbl-${book.id}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={prominent ? 12 : 10}
                fill={prominent ? 'rgba(255,255,255,0.95)' : fill}
                fontFamily="sans-serif"
                fontWeight={prominent ? 700 : 400}
              >
                {shortTitle(book.title, 32)}
              </text>
            )
          })}

          {/* Hover label */}
          {hoveredId && (() => {
            const { x, y } = pos(hoveredId)
            const book = bookMap.get(hoveredId)
            if (!book) return null
            return <HoverLabel x={x} y={y - nodeR - 6} author={bookAuthorDisplay(book, authors)} title={book.title} />
          })()}
        </g>
      </svg>

      {/* Title */}
      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[13px] font-mono tracking-[2px] text-white/25">
        ARBORESCENCE CIRCULAIRE
      </div>

      {/* Selected tooltip */}
      {selectedBook && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/10 bg-bg-overlay/92 px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[14px] font-semibold text-white/90">{selectedBook.title}</div>
          <div className="text-[14px] text-white/40">
            {selectedBook.year} · {selectedBook.axes?.join(', ')} · {relatedIds?.size ?? 0} connexions
          </div>
        </div>
      )}

      {/* Axis legend */}
      <div className="absolute bottom-20 left-4 flex flex-col gap-1">
        {axisArcs.map((arc) => (
          <span key={arc.axis} className="flex items-center gap-1.5 text-[14px] text-white/35">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: arc.color }} />
            {AXES_LABELS[arc.axis as keyof typeof AXES_LABELS] ?? arc.axis}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={reset}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[14px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        >
          ⌖ reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[14px] text-white/20 font-mono">
        {books.length} ouvrages · {edges.length} citations · scroll pour zoomer · glisser pour naviguer
      </div>
    </div>
  )
}

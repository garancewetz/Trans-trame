import { useMemo, useState } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { getCitationEdges, axisColor, shortTitle } from './utils'
import { AXES, AXES_COLORS, AXES_LABELS } from '@/common/utils/categories'

const TWO_PI = Math.PI * 2

interface Props {
  graphData: GraphData
  onNodeClick?: (node: Book) => void
}

export function CircularDendrogramView({ graphData, onNodeClick }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])

  const books = useMemo(
    () => graphData.nodes.filter((n) => n.type === 'book') as Book[],
    [graphData.nodes],
  )

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

  // Related IDs for selected node
  const relatedIds = useMemo(() => {
    if (!selectedId) return null
    const ids = new Set<string>()
    for (const { sourceId, targetId } of edges) {
      if (sourceId === selectedId) ids.add(targetId)
      if (targetId === selectedId) ids.add(sourceId)
    }
    return ids
  }, [selectedId, edges])

  const chords = useMemo(() => {
    return edges.flatMap(({ sourceId, targetId }) => {
      if (!bookAngles.has(sourceId) || !bookAngles.has(targetId)) return []
      const src = pos(sourceId)
      const tgt = pos(targetId)
      const cpFactor = 0.18
      const cpX = cx + (src.x - cx) * cpFactor + (tgt.x - cx) * cpFactor
      const cpY = cy + (src.y - cy) * cpFactor + (tgt.y - cy) * cpFactor
      const book = bookMap.get(sourceId)
      const isRelated = selectedId
        ? sourceId === selectedId || targetId === selectedId
        : false
      return [{
        d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`,
        color: axisColor(book?.axes),
        opacity: selectedId ? (isRelated ? 0.85 : 0.04) : 0.18,
        width: isRelated ? 2.5 : 1,
        sourceId,
        targetId,
      }]
    })
  }, [edges, bookAngles, selectedId, cx, cy, bookMap, R])

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

  function handleNodeClick(book: Book) {
    if (hasMoved()) return
    setSelectedId(book.id === selectedId ? null : book.id)
    onNodeClick?.(book)
  }

  const selectedBook = selectedId ? bookMap.get(selectedId) : null

  return (
    <div ref={ref} className="absolute inset-0 bg-[#080c1e] overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <g transform={transformStr}>
          {/* Chords */}
          {chords.map((c, i) => (
            <path key={i} d={c.d} fill="none" stroke={c.color} strokeOpacity={c.opacity} strokeWidth={c.width} />
          ))}

          {/* Axis arcs */}
          {axisArcs.map((arc, i) => (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={5} strokeOpacity={0.6} strokeLinecap="round" />
          ))}

          {/* Book nodes */}
          {sortedBooks.map((book) => {
            const { x, y } = pos(book.id)
            const color = axisColor(book.axes)
            const isSelected = book.id === selectedId
            const isRelated = relatedIds?.has(book.id) ?? false
            const dimmed = selectedId && !isSelected && !isRelated
            return (
              <g
                key={book.id}
                onClick={() => handleNodeClick(book)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${book.title}${book.year ? ` (${book.year})` : ''}`}</title>
                {isSelected && (
                  <circle cx={x} cy={y} r={nodeR + 6} fill={color} fillOpacity={0.2} />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? nodeR + 2 : isRelated ? nodeR + 1 : nodeR}
                  fill={color}
                  fillOpacity={dimmed ? 0.15 : isSelected ? 1 : 0.8}
                />
              </g>
            )
          })}

          {/* Labels: always show for selected and its relations */}
          {sortedBooks.map((book) => {
            const angle = bookAngles.get(book.id) ?? 0
            const { x, y } = pos(book.id)
            const lx = cx + Math.cos(angle) * labelR
            const ly = cy + Math.sin(angle) * labelR
            const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'
            const isSelected = book.id === selectedId
            const isRelated = relatedIds?.has(book.id) ?? false
            if (!isSelected && !isRelated) return null
            const color = axisColor(book.axes)
            return (
              <text
                key={`lbl-${book.id}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={isSelected ? 12 : 10}
                fill={isSelected ? 'rgba(255,255,255,0.95)' : color}
                fontFamily="sans-serif"
                fontWeight={isSelected ? 700 : 400}
              >
                {shortTitle(book.title, 32)}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Title */}
      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[11px] font-mono tracking-[2px] text-white/25">
        ARBORESCENCE CIRCULAIRE
      </div>

      {/* Selected tooltip */}
      {selectedBook && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(8,12,30,0.92)] px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[12px] font-semibold text-white/90">{selectedBook.title}</div>
          <div className="text-[10px] text-white/40">
            {selectedBook.year} · {selectedBook.axes?.join(', ')} · {relatedIds?.size ?? 0} connexions
          </div>
        </div>
      )}

      {/* Axis legend */}
      <div className="absolute bottom-10 left-4 flex flex-col gap-1">
        {axisArcs.map((arc) => (
          <span key={arc.axis} className="flex items-center gap-1.5 text-[10px] text-white/35">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: arc.color }} />
            {AXES_LABELS[arc.axis as keyof typeof AXES_LABELS] ?? arc.axis}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={reset}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        >
          ⌖ reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] text-white/20 font-mono">
        {books.length} ouvrages · {edges.length} citations · scroll pour zoomer · glisser pour naviguer
      </div>
    </div>
  )
}

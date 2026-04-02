import { useMemo, useState } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { getCitationEdges, axisColor, shortTitle, linearScale } from './utils'

const PAD = { left: 70, right: 70, top: 80, bottom: 64 }
const NODE_R = 5
const STACK_GAP = 16

interface Props {
  graphData: GraphData
  onNodeClick?: (node: Book) => void
}

export function HistCiteView({ graphData, onNodeClick }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const books = useMemo(
    () =>
      graphData.nodes.filter(
        (n) => n.type === 'book' && typeof n.year === 'number',
      ) as (typeof graphData.nodes[0] & { year: number })[],
    [graphData.nodes],
  )

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])
  const bookMap = useMemo(() => new Map(graphData.nodes.map((n) => [n.id, n])), [graphData.nodes])

  const { minYear, maxYear } = useMemo(() => {
    const years = books.map((b) => b.year)
    return { minYear: Math.min(...years, 1960), maxYear: Math.max(...years, 2025) }
  }, [books])

  const nodePositions = useMemo(() => {
    const innerW = w - PAD.left - PAD.right
    const baselineY = h - PAD.bottom
    const byYear = new Map<number, string[]>()
    for (const b of books) {
      const arr = byYear.get(b.year) ?? []
      arr.push(b.id)
      byYear.set(b.year, arr)
    }
    const pos = new Map<string, { x: number; y: number }>()
    for (const [year, ids] of byYear) {
      const x = linearScale(year, minYear, maxYear, PAD.left, PAD.left + innerW)
      ids.forEach((id, i) => pos.set(id, { x, y: baselineY - i * STACK_GAP }))
    }
    return pos
  }, [books, w, h, minYear, maxYear])

  const arcs = useMemo(() => {
    return edges.flatMap(({ sourceId, targetId }) => {
      const src = nodePositions.get(sourceId)
      const tgt = nodePositions.get(targetId)
      if (!src || !tgt || src.x === tgt.x) return []
      const cpX = (src.x + tgt.x) / 2
      const dx = Math.abs(src.x - tgt.x)
      const cpY = Math.min(src.y, tgt.y) - Math.max(32, dx * 0.38)
      const book = bookMap.get(sourceId)
      return [{ d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`, color: axisColor(book?.axes), sourceId, targetId }]
    })
  }, [edges, nodePositions, bookMap])

  const ticks = useMemo(() => {
    const innerW = w - PAD.left - PAD.right
    const baselineY = h - PAD.bottom
    const startDecade = Math.ceil(minYear / 10) * 10
    const result: { year: number; x: number; baselineY: number }[] = []
    for (let y = startDecade; y <= maxYear; y += 10) {
      result.push({ year: y, x: linearScale(y, minYear, maxYear, PAD.left, PAD.left + innerW), baselineY })
    }
    return result
  }, [w, h, minYear, maxYear])

  const baselineY = h - PAD.bottom

  function handleNodeClick(book: Book & { year: number }) {
    if (hasMoved()) return
    setSelectedId(book.id === selectedId ? null : book.id)
    onNodeClick?.(book)
  }

  const selectedBook = selectedId ? (bookMap.get(selectedId) as (Book & { year: number }) | undefined) : null

  return (
    <div ref={ref} className="absolute inset-0 bg-[#080c1e] overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <g transform={transformStr}>
          {/* Citation arcs */}
          {arcs.map((arc, i) => {
            const isRelated = selectedId && (arc.sourceId === selectedId || arc.targetId === selectedId)
            return (
              <path
                key={i}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeOpacity={selectedId ? (isRelated ? 0.8 : 0.06) : 0.28}
                strokeWidth={isRelated ? 2 : 1.4}
              />
            )
          })}

          {/* Baseline */}
          <line
            x1={PAD.left}
            y1={baselineY}
            x2={w - PAD.right}
            y2={baselineY}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />

          {/* Decade ticks */}
          {ticks.map(({ year, x, baselineY: by }) => (
            <g key={year}>
              <line x1={x} y1={by} x2={x} y2={by + 6} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
              <text x={x} y={by + 20} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
                {year}
              </text>
            </g>
          ))}

          {/* Book nodes */}
          {books.map((book) => {
            const pos = nodePositions.get(book.id)
            if (!pos) return null
            const color = axisColor(book.axes)
            const isSelected = book.id === selectedId
            return (
              <g key={book.id} onClick={() => handleNodeClick(book)} style={{ cursor: 'pointer' }}>
                <title>{`${book.title} (${book.year})`}</title>
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 5} fill={color} fillOpacity={0.25} />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? NODE_R + 2 : NODE_R}
                  fill={color}
                  fillOpacity={selectedId && !isSelected ? 0.3 : 0.88}
                  stroke={isSelected ? color : 'none'}
                  strokeWidth={1.5}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {/* Title */}
      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[11px] font-mono tracking-[2px] text-white/25">
        GRAPHE DE CITATION CHRONOLOGIQUE
      </div>

      {/* Selected book tooltip */}
      {selectedBook && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(8,12,30,0.92)] px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[12px] font-semibold text-white/90">{selectedBook.title}</div>
          <div className="text-[10px] text-white/40">{selectedBook.year}</div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={reset}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          title="Réinitialiser la vue"
        >
          ⌖ reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] text-white/20 font-mono">
        {books.length} ouvrages · {arcs.length} citations · scroll pour zoomer · glisser pour naviguer
      </div>
    </div>
  )
}

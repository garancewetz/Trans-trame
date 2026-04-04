import { useMemo, useState } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { getCitationEdges, shortTitle, linearScale } from './utils'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'

const PAD = { left: 70, right: 70, top: 80, bottom: 96 }
const NODE_R = 5
const STACK_GAP = 16

interface Props {
  graphData: GraphData
  authors: Author[]
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
  hoveredFilter?: string | null
}

export function HistCiteView({ graphData, authors, onNodeClick, activeFilter, hoveredFilter }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const books = useMemo(
    () =>
      graphData.nodes.filter(
        (n) => n.type === 'book' && typeof n.year === 'number',
      ) as (typeof graphData.nodes[0] & { year: number })[],
    [graphData.nodes],
  )

  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])
  const bookMap = useMemo(() => new Map(graphData.nodes.map((n) => [n.id, n])), [graphData.nodes])

  const nodeAxesSet = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const b of books) m.set(b.id, b.axes ?? [])
    return m
  }, [books])

  const { minYear, maxYear } = useMemo(() => {
    const years = books.map((b) => b.year)
    return { minYear: Math.min(...years), maxYear: Math.max(...years, 2025) }
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
      return [{ d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`, sourceId, targetId }]
    })
  }, [edges, nodePositions])

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

  const currentFilter = hoveredFilter ?? activeFilter ?? null

  const nodeMatchesFilter = useMemo(() => {
    if (!currentFilter) return null
    const m = new Map<string, boolean>()
    for (const b of books) m.set(b.id, (b.axes ?? []).includes(currentFilter))
    return m
  }, [books, currentFilter])

  const baselineY = h - PAD.bottom

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

  function handleNodeClick(book: Book & { year: number }) {
    if (hasMoved()) return
    setSelectedId(book.id === selectedId ? null : book.id)
    onNodeClick?.(book)
  }

  const selectedBook = selectedId ? (bookMap.get(selectedId) as (Book & { year: number }) | undefined) : null

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          {/* Citation arcs */}
          {arcs.map((arc, i) => (
            <g key={i} opacity={linkFilterOpacity(arc.sourceId, arc.targetId)}>
              <CitationLink
                d={arc.d}
                sourceId={arc.sourceId}
                targetId={arc.targetId}
                selectedId={selectedId}
                hoveredId={hoveredId}
                linkIndex={i}
              />
            </g>
          ))}

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
              <text x={x} y={by + 20} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
                {year}
              </text>
            </g>
          ))}

          {/* Book nodes */}
          {books.map((book) => {
            const pos = nodePositions.get(book.id)
            if (!pos) return null
            const fill = nodeFill(book.axes)
            const nv = getNodeVisual(book.id, NODE_R, selectedId, relatedIds, hoveredId, hoveredNeighborIds)
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
                  <circle cx={pos.x} cy={pos.y} r={nv.glowR} fill={fill} fillOpacity={nv.glowOpacity} />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nv.r}
                  fill={fill}
                  fillOpacity={nv.opacity}
                />
              </g>
            )
          })}

          {/* Hover label */}
          {hoveredId && (() => {
            const pos = nodePositions.get(hoveredId)
            const book = bookMap.get(hoveredId) as Book | undefined
            if (!pos || !book) return null
            return <HoverLabel x={pos.x} y={pos.y - NODE_R - 6} author={bookAuthorDisplay(book, authors)} title={book.title} />
          })()}
        </g>
      </svg>

      {/* Title */}
      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[13px] font-mono tracking-[2px] text-white/25">
        GRAPHE DE CITATION CHRONOLOGIQUE
      </div>

      {/* Selected book tooltip */}
      {selectedBook && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/10 bg-bg-overlay/92 px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[14px] font-semibold text-white/90">{selectedBook.title}</div>
          <div className="text-[14px] text-white/40">{selectedBook.year}</div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={reset}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[14px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          title="Réinitialiser la vue"
        >
          ⌖ reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[14px] text-white/20 font-mono">
        {books.length} ouvrages · {arcs.length} citations · scroll pour zoomer · glisser pour naviguer
      </div>
    </div>
  )
}

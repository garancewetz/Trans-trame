import { useMemo } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { useVizInteraction } from './useVizInteraction'

const PAD = { left: 70, right: 70, top: 80, bottom: 96 }
const NODE_R = 5
const STACK_GAP = 22

interface Props {
  graphData: GraphData
  authors: Author[]
  selectedNode?: Book | null
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
  hoveredFilter?: string | null
}

export function HistCiteView({ graphData, authors, selectedNode, onNodeClick, activeFilter, hoveredFilter }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const selectedId = selectedNode?.id ?? null

  const {
    hoveredId, setHoveredId, books: allBooks, edges, bookMap, nodeAxesSet,
    relatedIds, hoveredNeighborIds, filterOpacity, linkFilterOpacity,
  } = useVizInteraction({ graphData, selectedId, activeFilter, hoveredFilter })

  const books = useMemo(
    () => allBooks.filter((b) => typeof b.year === 'number') as (Book & { year: number })[],
    [allBooks],
  )

  const { minYear, maxYear } = useMemo(() => {
    const years = books.map((b) => b.year)
    return { minYear: Math.min(...years), maxYear: Math.max(...years, 2025) }
  }, [books])

  const nodePositions = useMemo(() => {
    const PX_PER_BOOK = 18
    const minW = books.length * PX_PER_BOOK
    const innerW = Math.max(w - PAD.left - PAD.right, minW)
    const baselineY = h - PAD.bottom

    // Group books by year
    const byYear = new Map<number, string[]>()
    for (const b of books) {
      const arr = byYear.get(b.year) ?? []
      arr.push(b.id)
      byYear.set(b.year, arr)
    }

    // Weight per decade: more books → more horizontal space
    const byDecade = new Map<number, number>()
    for (const [year, ids] of byYear) {
      const dec = Math.floor(year / 10) * 10
      byDecade.set(dec, (byDecade.get(dec) ?? 0) + ids.length)
    }
    const decades = [...byDecade.keys()].sort((a, b) => a - b)
    const MIN_WEIGHT = 1
    const weights = decades.map((d) => MIN_WEIGHT + (byDecade.get(d) ?? 0))
    const totalWeight = weights.reduce((s, w) => s + w, 0)

    // Cumulative X ranges per decade
    const decadeStart = new Map<number, number>()
    const decadeWidth = new Map<number, number>()
    let cumX = PAD.left
    decades.forEach((d, i) => {
      const dw = (weights[i] / totalWeight) * innerW
      decadeStart.set(d, cumX)
      decadeWidth.set(d, dw)
      cumX += dw
    })

    // Position each node within its decade's horizontal band
    const pos = new Map<string, { x: number; y: number }>()
    // Group years per decade for sub-positioning
    const yearsByDecade = new Map<number, number[]>()
    for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
      const dec = Math.floor(year / 10) * 10
      const arr = yearsByDecade.get(dec) ?? []
      arr.push(year)
      yearsByDecade.set(dec, arr)
    }

    for (const [dec, years] of yearsByDecade) {
      const dx = decadeStart.get(dec)!
      const dw = decadeWidth.get(dec)!
      const pad = Math.min(dw * 0.08, 12)
      years.forEach((year, yi) => {
        const x = years.length === 1
          ? dx + dw / 2
          : dx + pad + (yi / (years.length - 1)) * (dw - 2 * pad)
        const ids = byYear.get(year)!
        ids.forEach((id, i) => pos.set(id, { x, y: baselineY - i * STACK_GAP }))
      })
    }

    return { pos, decadeStart, decadeWidth, decades, innerW }
  }, [books, w, h, minYear, maxYear])

  const nodePos = nodePositions.pos
  const { decadeStart, decadeWidth, decades } = nodePositions

  // Citation count per book (how many times it appears as a target)
  const citationCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { targetId } of edges) {
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1)
    }
    return counts
  }, [edges])

  const arcs = useMemo(() => {
    return edges.flatMap(({ sourceId, targetId }) => {
      const src = nodePos.get(sourceId)
      const tgt = nodePos.get(targetId)
      if (!src || !tgt || src.x === tgt.x) return []
      const cpX = (src.x + tgt.x) / 2
      const dx = Math.abs(src.x - tgt.x)
      const cpY = Math.min(src.y, tgt.y) - Math.max(32, dx * 0.38)
      return [{ d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`, sourceId, targetId, sx: src.x, sy: src.y, tx: tgt.x, ty: tgt.y }]
    })
  }, [edges, nodePositions])

  const ticks = useMemo(() => {
    const baselineY = h - PAD.bottom
    return decades.map((dec) => ({
      year: dec,
      x: decadeStart.get(dec)! + decadeWidth.get(dec)! / 2,
      baselineY,
    }))
  }, [h, decades, decadeStart, decadeWidth])

  const baselineY = h - PAD.bottom

  function handleNodeClick(book: Book & { year: number }) {
    if (hasMoved()) return
    onNodeClick?.(book)
  }

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          {/* Citation arcs */}
          {arcs.map((arc, i) => (
            <g key={`${arc.sourceId}|${arc.targetId}|${i}`} opacity={linkFilterOpacity(arc.sourceId, arc.targetId)}>
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
          ))}

          {/* Baseline */}
          <line
            x1={PAD.left}
            y1={baselineY}
            x2={PAD.left + nodePositions.innerW}
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
            const pos = nodePos.get(book.id)
            if (!pos) return null
            const fill = nodeFill(book.axes)
            const cites = citationCount.get(book.id) ?? 0
            const bookR = NODE_R + Math.min(Math.sqrt(cites) * 3, 12)
            const nv = getNodeVisual(book.id, bookR, selectedId, relatedIds, hoveredId, hoveredNeighborIds)
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
            const pos = nodePos.get(hoveredId)
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

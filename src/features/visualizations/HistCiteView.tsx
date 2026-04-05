import { useMemo } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { linearScale } from './utils'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { useVizInteraction } from './useVizInteraction'

const PAD = { left: 70, right: 70, top: 80, bottom: 96 }
const NODE_R = 5
const STACK_GAP = 16

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
      return [{ d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`, sourceId, targetId, sx: src.x, sy: src.y, tx: tgt.x, ty: tgt.y }]
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
            <g key={i} opacity={linkFilterOpacity(arc.sourceId, arc.targetId)}>
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

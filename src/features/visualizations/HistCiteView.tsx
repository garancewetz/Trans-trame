import { useCallback, useMemo } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill } from './SvgDefs'
import { useVizInteraction } from './useVizInteraction'
import {
  PAD, NODE_R,
  computeNodePositions, computeCitationCounts, computeArcs, computeTicks, nodeRadius,
} from './histogram/histogramLayout'
import type { Arc } from './histogram/histogramLayout'
import { HistCiteFocalArcs, HistCiteFocalNodes } from './HistCiteFocalLayers'

// Style "idle" des arcs de fond
const BASE_ARC_STROKE = 'rgba(140,220,255,1)'
const BASE_ARC_OPACITY_IDLE = 0.15
const BASE_ARC_OPACITY_FOCUSED = 0.08
const BASE_ARC_WIDTH_IDLE = 0.5
const BASE_ARC_WIDTH_FOCUSED = 0.3

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
    () => allBooks.filter((b): b is Book & { year: number } => typeof b.year === 'number'),
    [allBooks],
  )

  const nodePositions = useMemo(() => computeNodePositions(books, w, h), [books, w, h])
  const nodePos = nodePositions.pos
  const { decadeStart, decadeWidth, decades } = nodePositions

  const citationCount = useMemo(() => computeCitationCounts(edges), [edges])
  const arcs = useMemo<Arc[]>(() => computeArcs(edges, nodePos), [edges, nodePos])

  const browsing = !!hoveredId && !selectedId
  const baseArcsLayer = useMemo(() => {
    const opacity = selectedId || browsing ? BASE_ARC_OPACITY_FOCUSED : BASE_ARC_OPACITY_IDLE
    const strokeWidth = selectedId || browsing ? BASE_ARC_WIDTH_FOCUSED : BASE_ARC_WIDTH_IDLE
    const marker = selectedId || browsing ? undefined : 'url(#arrow-cite-faint)'
    return arcs.map((arc) => (
      <path
        key={arc.key}
        d={arc.d}
        fill="none"
        stroke={BASE_ARC_STROKE}
        strokeOpacity={opacity}
        strokeWidth={strokeWidth}
        markerEnd={marker}
        opacity={linkFilterOpacity(arc.sourceId, arc.targetId)}
      />
    ))
  }, [arcs, selectedId, browsing, linkFilterOpacity])

  const onEnter = useCallback((id: string) => setHoveredId(id), [setHoveredId])
  const onLeave = useCallback(() => setHoveredId(null), [setHoveredId])
  const onClick = useCallback((book: Book) => {
    if (hasMoved()) return
    onNodeClick?.(book)
  }, [hasMoved, onNodeClick])

  const baseNodesLayer = useMemo(() => {
    return books.map((book) => {
      const pos = nodePos.get(book.id)
      if (!pos) return null
      const fill = nodeFill(book.axes)
      const bookR = nodeRadius(citationCount.get(book.id) ?? 0)
      return (
        <circle
          key={book.id}
          cx={pos.x}
          cy={pos.y}
          r={bookR}
          fill={fill}
          fillOpacity={0.88}
          opacity={filterOpacity(book.id)}
          style={{ cursor: 'pointer' }}
          onClick={() => onClick(book)}
          onMouseEnter={() => onEnter(book.id)}
          onMouseLeave={onLeave}
        />
      )
    })
  }, [books, nodePos, citationCount, filterOpacity, onClick, onEnter, onLeave])

  const ticks = useMemo(
    () => computeTicks(h, decades, decadeStart, decadeWidth),
    [h, decades, decadeStart, decadeWidth],
  )

  const baselineY = h - PAD.bottom
  const hasFocus = !!selectedId || !!hoveredId
  const baseLayerOpacity = hasFocus ? 0.35 : 1

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          <line
            x1={PAD.left} y1={baselineY}
            x2={PAD.left + nodePositions.innerW} y2={baselineY}
            stroke="rgba(255,255,255,0.18)" strokeWidth={1}
          />

          {ticks.map(({ year, x, baselineY: by }) => (
            <g key={year}>
              <line x1={x} y1={by} x2={x} y2={by + 6} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
              <text x={x} y={by + 20} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
                {year}
              </text>
            </g>
          ))}

          <g opacity={baseLayerOpacity}>
            {baseArcsLayer}
            {baseNodesLayer}
          </g>

          <HistCiteFocalArcs arcs={arcs} selectedId={selectedId} hoveredId={hoveredId} linkFilterOpacity={linkFilterOpacity} />
          <HistCiteFocalNodes
            selectedId={selectedId} hoveredId={hoveredId} relatedIds={relatedIds} hoveredNeighborIds={hoveredNeighborIds}
            bookMap={bookMap} nodePos={nodePos} citationCount={citationCount} filterOpacity={filterOpacity}
            onClick={onClick} onEnter={onEnter} onLeave={onLeave}
          />

          {hoveredId && (() => {
            const pos = nodePos.get(hoveredId)
            const book = bookMap.get(hoveredId)
            if (!pos || !book) return null
            return <HoverLabel x={pos.x} y={pos.y - NODE_R - 6} author={bookAuthorDisplay(book, authors)} title={book.title} />
          })()}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[13px] font-mono tracking-[2px] text-white/25">
        GRAPHE DE CITATION CHRONOLOGIQUE
      </div>

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

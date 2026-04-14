import { useCallback, useMemo } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill } from './SvgDefs'
import { useVizInteraction } from './useVizInteraction'
import {
  sortBooksByAxis, computeBookAngles, computeNodePositions,
  computeChords, computeAxisArcs,
} from './dendrogram/dendrogramLayout'
import type { Chord } from './dendrogram/dendrogramLayout'
import { DendrogramFocalChords, DendrogramFocalNodes, DendrogramFocalLabels } from './DendrogramFocalLayers'

// Style "idle" inlined pour les chords de fond
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

export function CircularDendrogramView({ graphData, authors, selectedNode, onNodeClick, activeFilter, hoveredFilter }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const selectedId = selectedNode?.id ?? null

  const {
    hoveredId, setHoveredId, books, edges, bookMap, nodeAxesSet,
    relatedIds, hoveredNeighborIds, filterOpacity, linkFilterOpacity,
  } = useVizInteraction({ graphData, selectedId, activeFilter, hoveredFilter })

  const sortedBooks = useMemo(() => sortBooksByAxis(books), [books])

  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2 - 100
  const labelR = R + 28
  const nodeR = 5

  const bookAngles = useMemo(() => computeBookAngles(sortedBooks), [sortedBooks])
  const nodePos = useMemo(() => computeNodePositions(bookAngles, cx, cy, R), [bookAngles, cx, cy, R])
  const chords = useMemo<Chord[]>(() => computeChords(edges, nodePos, cx, cy), [edges, nodePos, cx, cy])
  const axisArcs = useMemo(() => computeAxisArcs(sortedBooks, cx, cy, R), [sortedBooks, cx, cy, R])

  const currentFilter = hoveredFilter ?? activeFilter ?? null

  const onEnter = useCallback((id: string) => setHoveredId(id), [setHoveredId])
  const onLeave = useCallback(() => setHoveredId(null), [setHoveredId])
  const onClick = useCallback((book: Book) => {
    if (hasMoved()) return
    onNodeClick?.(book)
  }, [hasMoved, onNodeClick])

  const browsing = !!hoveredId && !selectedId
  const baseChordsLayer = useMemo(() => {
    const opacity = selectedId || browsing ? BASE_ARC_OPACITY_FOCUSED : BASE_ARC_OPACITY_IDLE
    const strokeWidth = selectedId || browsing ? BASE_ARC_WIDTH_FOCUSED : BASE_ARC_WIDTH_IDLE
    const marker = selectedId || browsing ? undefined : 'url(#arrow-cite-faint)'
    return chords.map((c) => (
      <path
        key={c.key}
        d={c.d}
        fill="none"
        stroke={BASE_ARC_STROKE}
        strokeOpacity={opacity}
        strokeWidth={strokeWidth}
        markerEnd={marker}
        opacity={linkFilterOpacity(c.sourceId, c.targetId)}
      />
    ))
  }, [chords, selectedId, browsing, linkFilterOpacity])

  const baseNodesLayer = useMemo(() => {
    return sortedBooks.map((book) => {
      const p = nodePos.get(book.id)
      if (!p) return null
      const fill = nodeFill(book.axes)
      return (
        <circle
          key={book.id}
          cx={p.x}
          cy={p.y}
          r={nodeR}
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
  }, [sortedBooks, nodePos, filterOpacity, onClick, onEnter, onLeave])

  const hasFocus = !!selectedId || !!hoveredId
  const baseLayerOpacity = hasFocus ? 0.35 : 1

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          {axisArcs.map((arc, i) => (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={5} strokeOpacity={currentFilter ? (currentFilter === arc.axis ? 0.9 : 0.08) : 0.6} strokeLinecap="round" />
          ))}

          <g opacity={baseLayerOpacity}>
            {baseChordsLayer}
            {baseNodesLayer}
          </g>

          <DendrogramFocalChords chords={chords} selectedId={selectedId} hoveredId={hoveredId} linkFilterOpacity={linkFilterOpacity} />
          <DendrogramFocalNodes
            selectedId={selectedId} hoveredId={hoveredId} relatedIds={relatedIds} hoveredNeighborIds={hoveredNeighborIds}
            bookMap={bookMap} nodePos={nodePos} filterOpacity={filterOpacity}
            onClick={onClick} onEnter={onEnter} onLeave={onLeave} nodeR={nodeR}
          />
          <DendrogramFocalLabels
            selectedId={selectedId} hoveredId={hoveredId} relatedIds={relatedIds} hoveredNeighborIds={hoveredNeighborIds}
            bookMap={bookMap} bookAngles={bookAngles} cx={cx} cy={cy} labelR={labelR}
          />

          {hoveredId && (() => {
            const p = nodePos.get(hoveredId)
            const book = bookMap.get(hoveredId)
            if (!p || !book) return null
            return <HoverLabel x={p.x} y={p.y - nodeR - 6} author={bookAuthorDisplay(book, authors)} title={book.title} />
          })()}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[13px] font-mono tracking-[2px] text-white/25">
        ARBORESCENCE CIRCULAIRE
      </div>

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

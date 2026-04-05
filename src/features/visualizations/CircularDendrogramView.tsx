import { useMemo } from 'react'
import type { Book, Author, GraphData } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { shortTitle } from './utils'
import { HoverLabel } from './HoverLabel'
import { SvgDefs, nodeFill, CitationLink, getNodeVisual } from './SvgDefs'
import { nodeHoverStyle } from '@/common/utils/nodeHoverScale'
import { AXES, AXES_COLORS } from '@/common/utils/categories'
import { useVizInteraction } from './useVizInteraction'

const TWO_PI = Math.PI * 2

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

  const pos = (id: string) => {
    const angle = bookAngles.get(id) ?? 0
    return { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R }
  }

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
        sx: src.x,
        sy: src.y,
        tx: tgt.x,
        ty: tgt.y,
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

  function handleNodeClick(book: Book) {
    if (hasMoved()) return
    onNodeClick?.(book)
  }

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
                sx={c.sx}
                sy={c.sy}
                tx={c.tx}
                ty={c.ty}
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

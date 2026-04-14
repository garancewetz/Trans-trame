import { useCallback, useMemo, type ReactElement } from 'react'
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

// Style « idle » inlined pour les chords de fond — pas de CitationLink,
// pas de dépendance à hoveredId → base layer stable entre deux hovers.
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

type Chord = {
  d: string
  sourceId: string
  targetId: string
  sx: number
  sy: number
  tx: number
  ty: number
  key: string
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

  // Positions pré-calculées — lookup O(1), pas de fonction `pos()` appelée
  // à chaque render.
  const nodePos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    bookAngles.forEach((angle, id) => {
      m.set(id, { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R })
    })
    return m
  }, [bookAngles, cx, cy, R])

  const chords = useMemo<Chord[]>(() => {
    const out: Chord[] = []
    let i = 0
    for (const { sourceId, targetId } of edges) {
      const src = nodePos.get(sourceId)
      const tgt = nodePos.get(targetId)
      if (!src || !tgt) continue
      const cpFactor = 0.18
      const cpX = cx + (src.x - cx) * cpFactor + (tgt.x - cx) * cpFactor
      const cpY = cy + (src.y - cy) * cpFactor + (tgt.y - cy) * cpFactor
      out.push({
        d: `M ${src.x} ${src.y} Q ${cpX} ${cpY} ${tgt.x} ${tgt.y}`,
        sourceId,
        targetId,
        sx: src.x,
        sy: src.y,
        tx: tgt.x,
        ty: tgt.y,
        key: `${sourceId}|${targetId}|${i++}`,
      })
    }
    return out
  }, [edges, nodePos, cx, cy])

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

  // Handlers stables — le base layer ne doit pas être invalidé à chaque render.
  const onEnter = useCallback((id: string) => setHoveredId(id), [setHoveredId])
  const onLeave = useCallback(() => setHoveredId(null), [setHoveredId])
  const onClick = useCallback((book: Book) => {
    if (hasMoved()) return
    onNodeClick?.(book)
  }, [hasMoved, onNodeClick])

  // Couche de fond des chords — stable vis-à-vis de hoveredId, pas de particules.
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

  // Overlay des chords focaux — ne rend que les quelques chords touchant
  // sélection/hover (gradient directionnel + particules).
  const focalChordsLayer = useMemo(() => {
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

  // Couche de fond des nœuds — mémorisée, pas de glow, pas de scale hover.
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

  // Overlay des nœuds focaux (sélectionné + voisins + survolé + voisins).
  const focalNodesLayer = useMemo(() => {
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
    bookMap, nodePos, filterOpacity,
    onClick, onEnter, onLeave,
  ])

  // Labels : ne calcule plus sur TOUS les livres. On dérive l'ensemble focal
  // (petit : quelques dizaines de livres max) puis on rend.
  const focalLabels = useMemo(() => {
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

  // Dim du fond quand un focus est actif — sans invalider la memo du base layer.
  const hasFocus = !!selectedId || !!hoveredId
  const baseLayerOpacity = hasFocus ? 0.35 : 1

  return (
    <div ref={ref} className="absolute inset-0 bg-bg-base overflow-hidden">
      <svg ref={svgRef} width={w} height={h} {...svgHandlers}>
        <SvgDefs nodeAxesSet={nodeAxesSet} />
        <g transform={transformStr}>
          {/* Axis arcs (ring) — toujours visibles, pas de focus */}
          {axisArcs.map((arc, i) => (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={5} strokeOpacity={currentFilter ? (currentFilter === arc.axis ? 0.9 : 0.08) : 0.6} strokeLinecap="round" />
          ))}

          {/* Base layer (chords + nodes) — dimmed when focus active */}
          <g opacity={baseLayerOpacity}>
            {baseChordsLayer}
            {baseNodesLayer}
          </g>

          {/* Focal overlays — re-render seulement quand sélection/hover change */}
          {focalChordsLayer}
          {focalNodesLayer}
          {focalLabels}

          {/* Hover label */}
          {hoveredId && (() => {
            const p = nodePos.get(hoveredId)
            const book = bookMap.get(hoveredId)
            if (!p || !book) return null
            return <HoverLabel x={p.x} y={p.y - nodeR - 6} author={bookAuthorDisplay(book, authors)} title={book.title} />
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

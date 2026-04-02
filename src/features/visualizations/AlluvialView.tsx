import { useMemo, useState } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { useVizSize } from './useVizSize'
import { usePanZoom } from './usePanZoom'
import { getCitationEdges, axisColor, shortTitle } from './utils'

const PAD = { left: 40, right: 40, top: 64, bottom: 48 }
const COL_W = 18
const ITEM_H = 10
const ITEM_GAP = 2

interface Props {
  graphData: GraphData
  onNodeClick?: (node: Book) => void
}

function decadeOf(year: number) {
  return Math.floor(year / 10) * 10
}

export function AlluvialView({ graphData, onNodeClick }: Props) {
  const { ref, w, h } = useVizSize()
  const { svgRef, transformStr, hasMoved, reset, svgHandlers } = usePanZoom()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const books = useMemo(
    () =>
      graphData.nodes.filter(
        (n) => n.type === 'book' && typeof n.year === 'number',
      ) as (Book & { year: number })[],
    [graphData.nodes],
  )
  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const edges = useMemo(() => getCitationEdges(graphData.links), [graphData.links])

  const { decades, booksByDecade } = useMemo(() => {
    const inDegree = new Map<string, number>()
    for (const { targetId } of edges) inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1)

    const byDecade = new Map<number, string[]>()
    for (const b of books) {
      const dec = decadeOf(b.year)
      const arr = byDecade.get(dec) ?? []
      arr.push(b.id)
      byDecade.set(dec, arr)
    }
    for (const [dec, ids] of byDecade) {
      byDecade.set(dec, ids.sort((a, b) => (inDegree.get(b) ?? 0) - (inDegree.get(a) ?? 0)))
    }
    const decades = [...byDecade.keys()].sort((a, b) => a - b)
    return { decades, booksByDecade: byDecade }
  }, [books, edges])

  const innerW = w - PAD.left - PAD.right
  const innerH = h - PAD.top - PAD.bottom

  const colX = useMemo(() => {
    if (decades.length === 0) return new Map<number, number>()
    const step = innerW / Math.max(decades.length - 1, 1)
    return new Map(decades.map((dec, i) => [dec, PAD.left + i * step]))
  }, [decades, innerW])

  const bookPos = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    for (const [dec, ids] of booksByDecade) {
      const x = colX.get(dec) ?? 0
      const totalH = ids.length * (ITEM_H + ITEM_GAP) - ITEM_GAP
      const startY = PAD.top + (innerH - totalH) / 2
      ids.forEach((id, i) => pos.set(id, { x, y: startY + i * (ITEM_H + ITEM_GAP) }))
    }
    return pos
  }, [booksByDecade, colX, innerH])

  const relatedIds = useMemo(() => {
    if (!selectedId) return null
    const ids = new Set<string>()
    for (const { sourceId, targetId } of edges) {
      if (sourceId === selectedId) ids.add(targetId)
      if (targetId === selectedId) ids.add(sourceId)
    }
    return ids
  }, [selectedId, edges])

  const ribbons = useMemo(() => {
    const result: { d: string; color: string; opacity: number; width: number; sourceId: string; targetId: string }[] = []
    for (const { sourceId, targetId } of edges) {
      const src = bookPos.get(sourceId)
      const tgt = bookPos.get(targetId)
      if (!src || !tgt) continue
      const srcBook = bookMap.get(sourceId)
      if (!srcBook) continue

      const x1 = src.x + COL_W / 2
      const y1 = src.y + ITEM_H / 2
      const x2 = tgt.x - COL_W / 2
      const y2 = tgt.y + ITEM_H / 2
      const cpX1 = x1 + (x2 - x1) * 0.4
      const cpX2 = x1 + (x2 - x1) * 0.6
      const isRelated = selectedId
        ? sourceId === selectedId || targetId === selectedId
        : false

      result.push({
        d: `M ${x1} ${y1} C ${cpX1} ${y1} ${cpX2} ${y2} ${x2} ${y2}`,
        color: axisColor(srcBook.axes),
        opacity: selectedId ? (isRelated ? 0.85 : 0.04) : 0.22,
        width: isRelated ? 3 : 2,
        sourceId,
        targetId,
      })
    }
    return result
  }, [edges, bookPos, bookMap, selectedId])

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
          {/* Ribbons */}
          {ribbons.map((r, i) => (
            <path key={i} d={r.d} fill="none" stroke={r.color} strokeOpacity={r.opacity} strokeWidth={r.width} />
          ))}

          {/* Decade columns */}
          {decades.map((dec) => {
            const x = colX.get(dec) ?? 0
            const ids = booksByDecade.get(dec) ?? []
            const totalH = ids.length * (ITEM_H + ITEM_GAP) - ITEM_GAP
            const startY = PAD.top + (innerH - totalH) / 2

            return (
              <g key={dec}>
                <text x={x} y={PAD.top - 14} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
                  {dec}s
                </text>

                {ids.map((id, i) => {
                  const book = bookMap.get(id)
                  if (!book) return null
                  const color = axisColor(book.axes)
                  const isSelected = id === selectedId
                  const isRelated = relatedIds?.has(id) ?? false
                  const dimmed = selectedId && !isSelected && !isRelated
                  const by = startY + i * (ITEM_H + ITEM_GAP)

                  return (
                    <g key={id} onClick={() => handleNodeClick(book)} style={{ cursor: 'pointer' }}>
                      <title>{`${book.title} (${book.year})`}</title>
                      {isSelected && (
                        <rect x={x - COL_W / 2 - 3} y={by - 3} width={COL_W + 6} height={ITEM_H + 6} fill={color} fillOpacity={0.2} rx={3} />
                      )}
                      <rect
                        x={x - COL_W / 2}
                        y={by}
                        width={COL_W}
                        height={ITEM_H}
                        fill={color}
                        fillOpacity={dimmed ? 0.15 : isSelected || isRelated ? 1 : 0.65}
                        rx={2}
                      />
                      {(isSelected || isRelated) && (
                        <text
                          x={x}
                          y={isSelected ? by - 8 : by - 4}
                          textAnchor="middle"
                          fontSize={isSelected ? 10 : 8.5}
                          fill={isSelected ? 'rgba(255,255,255,0.9)' : color}
                          fontFamily="sans-serif"
                          fontWeight={isSelected ? 700 : 400}
                        >
                          {shortTitle(book.title, isSelected ? 28 : 22)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          <line x1={PAD.left} y1={h - PAD.bottom} x2={w - PAD.right} y2={h - PAD.bottom} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        </g>
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[11px] font-mono tracking-[2px] text-white/25">
        DIAGRAMME D'ALLUVIONS
      </div>

      {selectedBook && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(8,12,30,0.92)] px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[12px] font-semibold text-white/90">{selectedBook.title}</div>
          <div className="text-[10px] text-white/40">{selectedBook.year} · {relatedIds?.size ?? 0} connexions</div>
        </div>
      )}

      <div className="absolute bottom-3 right-3">
        <button onClick={reset} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors">
          ⌖ reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] text-white/20 font-mono">
        {decades.length} décennies · {books.length} ouvrages · scroll pour zoomer · glisser pour naviguer
      </div>
    </div>
  )
}

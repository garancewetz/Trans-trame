import type { Book } from '@/types/domain'
import { AXES, axisColor } from '@/common/utils/categories'

const TWO_PI = Math.PI * 2

export type Chord = {
  d: string
  sourceId: string
  targetId: string
  sx: number
  sy: number
  tx: number
  ty: number
  key: string
}

export type Edge = { sourceId: string; targetId: string }

export type AxisArc = {
  d: string
  color: string
  axis: string
}

/** Sort books by primary axis order, then by year. */
export function sortBooksByAxis(books: Book[]): Book[] {
  const axisOrder = Object.fromEntries(AXES.map((a, i) => [a, i]))
  return [...books].sort((a, b) => {
    const ai = axisOrder[a.axes?.[0] ?? ''] ?? 99
    const bi = axisOrder[b.axes?.[0] ?? ''] ?? 99
    if (ai !== bi) return ai - bi
    return (a.year ?? 9999) - (b.year ?? 9999)
  })
}

/** Assign an angle to each book, evenly distributed around the circle. */
export function computeBookAngles(sortedBooks: Book[]): Map<string, number> {
  const n = sortedBooks.length
  return new Map(sortedBooks.map((b, i) => [b.id, (i / Math.max(n, 1)) * TWO_PI - Math.PI / 2]))
}

/** Compute (x, y) positions for each book on the circle. */
export function computeNodePositions(
  bookAngles: Map<string, number>,
  cx: number,
  cy: number,
  R: number,
): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>()
  bookAngles.forEach((angle, id) => {
    m.set(id, { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R })
  })
  return m
}

/** Build quadratic-Bézier chords between source and target positions. */
export function computeChords(
  edges: Edge[],
  nodePos: Map<string, { x: number; y: number }>,
  cx: number,
  cy: number,
): Chord[] {
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
}

/** Compute colored axis arcs on the outer ring of the dendrogram. */
export function computeAxisArcs(
  sortedBooks: Book[],
  cx: number,
  cy: number,
  R: number,
): AxisArc[] {
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
    const color = axisColor(axis) ?? '#888'
    return { d: `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${large} 1 ${x2} ${y2}`, color, axis }
  })
}

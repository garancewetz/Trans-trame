import type { Book } from '@/types/domain'

export type Arc = {
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

export type NodePositions = {
  pos: Map<string, { x: number; y: number }>
  decadeStart: Map<number, number>
  decadeWidth: Map<number, number>
  decades: number[]
  innerW: number
}

export type Tick = {
  year: number
  x: number
  baselineY: number
}

const PAD = { left: 70, right: 70, top: 80, bottom: 96 }
const NODE_R = 5
const STACK_GAP = 22

export { PAD, NODE_R, STACK_GAP }

/**
 * Compute node positions on a timeline grouped by decade.
 * Books without a numeric year must be filtered out before calling this.
 */
export function computeNodePositions(
  books: (Book & { year: number })[],
  w: number,
  h: number,
): NodePositions {
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
}

/** Count how many times each book appears as a citation target. */
export function computeCitationCounts(edges: Edge[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { targetId } of edges) {
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1)
  }
  return counts
}

/** Build quadratic-Bézier arcs between source and target positions. */
export function computeArcs(
  edges: Edge[],
  nodePos: Map<string, { x: number; y: number }>,
): Arc[] {
  const out: Arc[] = []
  let i = 0
  for (const { sourceId, targetId } of edges) {
    const src = nodePos.get(sourceId)
    const tgt = nodePos.get(targetId)
    if (!src || !tgt || src.x === tgt.x) continue
    const cpX = (src.x + tgt.x) / 2
    const dx = Math.abs(src.x - tgt.x)
    const cpY = Math.min(src.y, tgt.y) - Math.max(32, dx * 0.38)
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

/** Compute decade tick positions for the timeline axis. */
export function computeTicks(
  h: number,
  decades: number[],
  decadeStart: Map<number, number>,
  decadeWidth: Map<number, number>,
): Tick[] {
  const baselineY = h - PAD.bottom
  return decades.map((dec) => ({
    year: dec,
    x: decadeStart.get(dec)! + decadeWidth.get(dec)! / 2,
    baselineY,
  }))
}

/** Compute the node radius including citation-count bonus. */
export function nodeRadius(citationCount: number): number {
  return NODE_R + Math.min(Math.sqrt(citationCount) * 3, 12)
}

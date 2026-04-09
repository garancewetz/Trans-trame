import { AXES, AXES_COLORS } from '@/common/utils/categories'
import { authorName, type AuthorNode } from '@/common/utils/authorUtils'

/* ── Panorama KPIs ─────────────────────────────────────── */

export function computePanorama(
  bookNodes: { year?: number | null; authorIds?: string[] }[],
  links: unknown[],
  authorsMap: Map<string, AuthorNode>,
) {
  const years = bookNodes.map((n) => n.year).filter((y): y is number => y != null && y > 0)
  return {
    books: bookNodes.length,
    authors: authorsMap.size,
    links: links.length,
    yearMin: years.length ? Math.min(...years) : null,
    yearMax: years.length ? Math.max(...years) : null,
  }
}

/* ── Axes — stacked bar ────────────────────────────────── */

export function computeAxisStats(bookNodes: { axes?: string[] }[]) {
  const counts: Record<string, number> = {}
  for (const axis of AXES) counts[axis] = 0
  for (const node of bookNodes) {
    for (const axis of node.axes || []) {
      if (counts[axis] !== undefined) counts[axis]++
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return AXES.map((axis) => ({
    axis,
    count: counts[axis],
    pct: Math.round((counts[axis] / total) * 100),
    color: AXES_COLORS[axis],
  })).filter((s) => s.count > 0)
}

/* ── Décennies — temporal distribution ─────────────────── */

export function computeDecades(bookNodes: { year?: number | null }[]) {
  const buckets = new Map<number, number>()
  for (const node of bookNodes) {
    const y = node.year
    if (y == null || y <= 0) continue
    const decade = Math.floor(y / 10) * 10
    buckets.set(decade, (buckets.get(decade) || 0) + 1)
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0])
  const max = Math.max(1, ...sorted.map(([, c]) => c))
  return { decades: sorted.map(([decade, count]) => ({ decade, count, pct: Math.round((count / max) * 100) })), max }
}

/* ── Œuvres pivots (most cited) ────────────────────────── */

export function computeMostCitedWorks(bookNodes: { id: string; title?: string }[], links: { source: unknown; target: unknown }[]) {
  const citedByCount: Record<string, number> = {}
  for (const node of bookNodes) citedByCount[node.id] = 0
  for (const link of links) {
    const tgtId = typeof link.target === 'object' && link.target !== null ? (link.target as { id: string }).id : link.target
    if (typeof tgtId === 'string' && citedByCount[tgtId] !== undefined) citedByCount[tgtId]++
  }
  return [...bookNodes]
    .sort((a, b) => (citedByCount[b.id] || 0) - (citedByCount[a.id] || 0))
    .slice(0, 3)
    .map((n) => ({ ...n, citedBy: citedByCount[n.id] || 0 }))
}

/* ── Voix majeures (top authors) ───────────────────────── */

export function computeTopAuthors(
  bookNodes: { authorIds?: string[] }[],
  authorsMap: Map<string, AuthorNode>,
  limit = 5,
) {
  const counts = new Map<string, number>()
  for (const book of bookNodes) {
    for (const id of book.authorIds || []) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, bookCount]) => {
      const author = authorsMap.get(id)
      return { id, name: author ? authorName(author) : id, bookCount }
    })
}

/* ── Maillage (network health) ─────────────────────────── */

export function computeMaillage(bookNodes: { id: string }[], links: { source: unknown; target: unknown }[]) {
  const connected = new Set<string>()
  for (const link of links) {
    const srcId = typeof link.source === 'object' && link.source !== null ? (link.source as { id: string }).id : link.source
    const tgtId = typeof link.target === 'object' && link.target !== null ? (link.target as { id: string }).id : link.target
    if (typeof srcId === 'string') connected.add(srcId)
    if (typeof tgtId === 'string') connected.add(tgtId)
  }
  const orphans = bookNodes.filter((n) => !connected.has(n.id)).length
  const ratio = bookNodes.length > 0 ? links.length / bookNodes.length : 0
  return { ratio: ratio.toFixed(2), orphans, total: bookNodes.length, links: links.length }
}

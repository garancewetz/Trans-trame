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

export function computeMostCitedWorks(
  bookNodes: { id: string; title?: string }[],
  links: { source: unknown; target: unknown }[],
  limit = 5,
) {
  const citedByCount: Record<string, number> = {}
  for (const node of bookNodes) citedByCount[node.id] = 0
  for (const link of links) {
    const tgtId = typeof link.target === 'object' && link.target !== null ? (link.target as { id: string }).id : link.target
    if (typeof tgtId === 'string' && citedByCount[tgtId] !== undefined) citedByCount[tgtId]++
  }
  return [...bookNodes]
    .sort((a, b) => (citedByCount[b.id] || 0) - (citedByCount[a.id] || 0))
    .slice(0, limit)
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

/* ── Ponts inter-axes ──────────────────────────────────── */
/**
 * Pour chaque œuvre, compte les liens (entrants + sortants) où le·la voisin·e
 * ne partage aucun axe — indicateur de transversalité. On renvoie aussi un
 * ratio (liens transversaux / liens totaux) pour contextualiser les hubs.
 */

export function computeInterAxisBridges(
  bookNodes: { id: string; title?: string; axes?: string[]; authorIds?: string[] }[],
  links: { source: unknown; target: unknown }[],
  limit = 5,
) {
  const byId = new Map(bookNodes.map((n) => [n.id, n]))
  const totalByNode = new Map<string, number>()
  const bridgeByNode = new Map<string, number>()

  const resolveId = (ref: unknown): string | null => {
    if (typeof ref === 'string') return ref
    if (typeof ref === 'object' && ref !== null && 'id' in ref) {
      const id = (ref as { id: unknown }).id
      return typeof id === 'string' ? id : null
    }
    return null
  }

  for (const link of links) {
    const srcId = resolveId(link.source)
    const tgtId = resolveId(link.target)
    if (!srcId || !tgtId) continue
    const src = byId.get(srcId)
    const tgt = byId.get(tgtId)
    if (!src || !tgt) continue
    const srcAxes = new Set(src.axes || [])
    const tgtAxes = tgt.axes || []
    const shared = tgtAxes.some((a) => srcAxes.has(a))
    totalByNode.set(srcId, (totalByNode.get(srcId) || 0) + 1)
    totalByNode.set(tgtId, (totalByNode.get(tgtId) || 0) + 1)
    if (!shared) {
      bridgeByNode.set(srcId, (bridgeByNode.get(srcId) || 0) + 1)
      bridgeByNode.set(tgtId, (bridgeByNode.get(tgtId) || 0) + 1)
    }
  }

  const enriched = bookNodes
    .map((n) => {
      const bridges = bridgeByNode.get(n.id) || 0
      const total = totalByNode.get(n.id) || 0
      const ratio = total > 0 ? bridges / total : 0
      return { ...n, bridges, total, ratio }
    })
    .filter((n) => n.bridges > 0)
    .sort((a, b) => b.bridges - a.bridges || b.ratio - a.ratio)
    .slice(0, limit)

  return enriched
}

/* ── Archipels (composantes connexes) ──────────────────── */
/**
 * Groupe les œuvres en composantes connexes (liens traités comme non-orientés).
 * Renvoie la taille de la composante principale et les petits archipels isolés
 * (2–4 nœuds), qui sont souvent des îlots thématiques non encore rattachés.
 */

export function computeArchipelagos(
  bookNodes: { id: string }[],
  links: { source: unknown; target: unknown }[],
) {
  if (bookNodes.length === 0) {
    return { componentCount: 0, mainSize: 0, mainPct: 0, smallIslands: [] as number[], orphans: 0 }
  }

  const parent = new Map<string, string>()
  for (const n of bookNodes) parent.set(n.id, n.id)

  const find = (x: string): string => {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    // path compression
    let cur = x
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }

  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  const resolveId = (ref: unknown): string | null => {
    if (typeof ref === 'string') return ref
    if (typeof ref === 'object' && ref !== null && 'id' in ref) {
      const id = (ref as { id: unknown }).id
      return typeof id === 'string' ? id : null
    }
    return null
  }

  for (const link of links) {
    const s = resolveId(link.source)
    const t = resolveId(link.target)
    if (s && t && parent.has(s) && parent.has(t)) union(s, t)
  }

  const sizes = new Map<string, number>()
  for (const n of bookNodes) {
    const r = find(n.id)
    sizes.set(r, (sizes.get(r) || 0) + 1)
  }

  const counts = [...sizes.values()].sort((a, b) => b - a)
  const mainSize = counts[0] || 0
  const mainPct = Math.round((mainSize / bookNodes.length) * 100)
  const orphans = counts.filter((c) => c === 1).length
  const smallIslands = counts.slice(1).filter((c) => c >= 2 && c <= 4)

  return {
    componentCount: counts.length,
    mainSize,
    mainPct,
    smallIslands,
    orphans,
  }
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

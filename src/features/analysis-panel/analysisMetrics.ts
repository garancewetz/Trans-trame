import { AXES, AXES_COLORS } from '@/common/utils/categories'
import { authorName, type AuthorNode } from '@/common/utils/authorUtils'

/** Extracts a string id from a link endpoint (string or {id} object). */
function resolveId(ref: unknown): string | null {
  if (typeof ref === 'string') return ref
  if (typeof ref === 'object' && ref !== null && 'id' in ref) {
    return typeof ref.id === 'string' ? ref.id : null
  }
  return null
}

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

/* ── Sous-axes — détection des disciplines convoquées ──── */

const SUB_AXIS_PREFIX = 'UNCATEGORIZED:'

export type SubAxisStat = {
  key: string              // "philosophy" (sans préfixe)
  fullKey: string          // "UNCATEGORIZED:philosophy"
  bookCount: number        // nombre d'œuvres dans ce sous-axe
  pctOfCorpus: number      // % du corpus total
  citedByCorpus: number    // citations reçues depuis le reste du corpus
  // Score "gravité éditoriale" = combien la pensée féministe sollicite ce
  // sous-axe. Heuristique simple : bookCount + citedByCorpus (un sous-axe
  // peut peser par nombre d'œuvres ou par centralité d'un seul hub — les
  // deux comptent pour juger de la pertinence d'une promotion).
  gravity: number
  topWorks: Array<{
    id: string
    title: string
    year?: number | null
    citedBy: number
  }>
}

/**
 * Agrège les sous-axes `UNCATEGORIZED:xxx` — outil d'aide à la décision
 * éditoriale : les sous-axes avec forte gravité sont des candidats à
 * promotion au rang d'axe à part entière. Promotion = décision politique
 * (cf. context.md), pas un effet de seuil automatique.
 */
export function computeSubAxisStats(
  bookNodes: { id: string; title?: string; year?: number | null; axes?: string[] }[],
  links: { source: unknown; target: unknown }[],
  topWorksLimit = 3,
): SubAxisStat[] {
  // Regroupe les books par sous-axe. Un livre peut apparaître dans plusieurs
  // sous-axes (rare mais possible), on l'accepte pour ne pas mentir sur la
  // distribution.
  const booksBySubAxis = new Map<string, typeof bookNodes>()
  for (const book of bookNodes) {
    for (const axis of book.axes || []) {
      if (!axis.startsWith(SUB_AXIS_PREFIX)) continue
      const sub = axis.slice(SUB_AXIS_PREFIX.length)
      if (!sub) continue
      const list = booksBySubAxis.get(sub) ?? []
      list.push(book)
      booksBySubAxis.set(sub, list)
    }
  }

  const citedByCount: Record<string, number> = {}
  for (const link of links) {
    const tgt = resolveId(link.target)
    if (tgt) citedByCount[tgt] = (citedByCount[tgt] || 0) + 1
  }

  const totalCorpus = bookNodes.length || 1
  const stats: SubAxisStat[] = []
  for (const [sub, books] of booksBySubAxis) {
    const bookIds = new Set(books.map((b) => b.id))
    // "Cited by corpus" = liens entrants provenant d'un livre *hors* du
    // sous-axe (éviter de compter les citations internes — ce qu'on veut
    // mesurer, c'est à quel point la pensée féministe sollicite ce champ).
    let citedByCorpus = 0
    for (const link of links) {
      const src = resolveId(link.source)
      const tgt = resolveId(link.target)
      if (!src || !tgt) continue
      if (bookIds.has(tgt) && !bookIds.has(src)) citedByCorpus++
    }

    const topWorks = [...books]
      .map((b) => ({
        id: b.id,
        title: b.title ?? '(sans titre)',
        year: b.year ?? null,
        citedBy: citedByCount[b.id] || 0,
      }))
      .sort((a, b) => b.citedBy - a.citedBy)
      .slice(0, topWorksLimit)

    stats.push({
      key: sub,
      fullKey: `${SUB_AXIS_PREFIX}${sub}`,
      bookCount: books.length,
      pctOfCorpus: Math.round((books.length / totalCorpus) * 1000) / 10, // 1 décimale
      citedByCorpus,
      gravity: books.length + citedByCorpus,
      topWorks,
    })
  }

  return stats.sort((a, b) => b.gravity - a.gravity)
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
    const tgtId = resolveId(link.target)
    if (tgtId && citedByCount[tgtId] !== undefined) citedByCount[tgtId]++
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
    const empty: number[] = []
    return { componentCount: 0, mainSize: 0, mainPct: 0, smallIslands: empty, orphans: 0 }
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
    const srcId = resolveId(link.source)
    const tgtId = resolveId(link.target)
    if (srcId) connected.add(srcId)
    if (tgtId) connected.add(tgtId)
  }
  const orphans = bookNodes.filter((n) => !connected.has(n.id)).length
  const ratio = bookNodes.length > 0 ? links.length / bookNodes.length : 0
  return { ratio: ratio.toFixed(2), orphans, total: bookNodes.length, links: links.length }
}

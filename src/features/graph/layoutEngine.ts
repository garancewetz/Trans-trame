/**
 * Compute fixed positions for each layout mode.
 * Returns a Map<nodeId, {fx, fy, fz}> or null for constellation (free layout).
 */

export const FORCE_CHARGE_AUTHOR = -1800
export const FORCE_CHARGE_BOOK = -1200
export const FORCE_CHARGE_DIST_MAX = 1400
export const FORCE_LINK_DIST_AUTHOR_BOOK = 100
export const FORCE_LINK_DIST_CITATION = 280
export const FORCE_GENEALOGY_LINK_AUTHOR_BOOK = 52
export const FORCE_GENEALOGY_LINK_CITATION = 128
export const FORCE_X_YEAR_SPREAD = 980
export const FORCE_Y_CENTER_STRENGTH = 0.095
export const FORCE_COLLIDE_RADIUS = 25

/** Livres sans lien : répulsion plus faible pour ne pas les expulser du nuage. */
export const FORCE_CHARGE_BOOK_ISOLATE_MULT = 0.48
/** Un seul lien : intermédiaire. */
export const FORCE_CHARGE_BOOK_LOW_MULT = 0.74

/**
 * Cible X « année » atténuée : les isolés restent plus près du centre (galaxie),
 * au lieu d’être projetés au bord de la frise chronologique.
 */
export const FORCE_X_YEAR_BLEND_DEG0 = 0.26
export const FORCE_X_YEAR_BLEND_DEG1 = 0.52

type ChargeNode = { id?: string; type?: string }

export function chargeStrengthForNode(node: ChargeNode, degreeByNodeId: Map<string, number>): number {
  if (node?.type === 'author') return FORCE_CHARGE_AUTHOR
  const d = node?.id != null ? (degreeByNodeId.get(node.id) ?? 0) : 0
  if (d <= 0) return FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_ISOLATE_MULT
  if (d === 1) return FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_LOW_MULT
  return FORCE_CHARGE_BOOK
}

export function yearSpreadBlendForDegree(deg: number): number {
  if (deg <= 0) return FORCE_X_YEAR_BLEND_DEG0
  if (deg === 1) return FORCE_X_YEAR_BLEND_DEG1
  return 1
}

// ─── CONSTELLATION (default) ───────────────────────────────────────
export function constellationLayout() {
  return null // Let d3-force do its thing freely
}

// ─── GÉNÉALOGIE (Arc Diagram) ──────────────────────────────────────
// All nodes on a horizontal line sorted by year.
// Links become arcs above the line — height proportional to distance.
// The selected root node is highlighted by position.
export function genealogyLayout(graphData) {
  const positions = new Map()
  const { nodes, links } = graphData

  // Sort nodes by year, then alphabetically
  const sorted = [...nodes].sort((a, b) => {
    const ya = a.year || 0
    const yb = b.year || 0
    if (ya !== yb) return ya - yb
    return (a.title || '').localeCompare(b.title || '', 'fr')
  })

  // Compute degree (number of connections) for each node — used for vertical offset
  const degree = new Map()
  links.forEach((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    degree.set(src, (degree.get(src) || 0) + 1)
    degree.set(tgt, (degree.get(tgt) || 0) + 1)
  })

  const SPACING = 82 // horizontal space between nodes
  const totalWidth = (sorted.length - 1) * SPACING
  const Y_BASE = 0 // baseline Y for the horizontal line
  const Z_PLANE = 0

  sorted.forEach((node, i) => {
    positions.set(node.id, {
      fx: -totalWidth / 2 + i * SPACING,
      fy: Y_BASE,
      fz: Z_PLANE,
    })
  })

  return positions
}


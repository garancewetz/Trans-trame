/**
 * Compute fixed positions for each layout mode.
 * Returns a Map<nodeId, {fx, fy, fz}> or null for constellation (free layout).
 */

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

  const SPACING = 65 // horizontal space between nodes
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


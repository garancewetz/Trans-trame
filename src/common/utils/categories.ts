import { CATEGORY_THEME as CATEGORY_THEME_CONSTANTS, SUB_CLUSTERS, type Axis } from './categories.constants'

export const CATEGORY_THEME = CATEGORY_THEME_CONSTANTS
export type { Axis }
export { CLUSTER_RING_AXES, SUB_CLUSTERS, type SubCluster } from './categories.constants'

// Dérivés automatiquement de CATEGORY_THEME — rien à maintenir à la main.
export const AXES = Object.keys(CATEGORY_THEME) as Axis[]

export const AXES_COLORS = Object.fromEntries(
  AXES.map((k) => [k, CATEGORY_THEME[k].color]),
) as Record<Axis, string>

export const AXES_LABELS = Object.fromEntries(
  AXES.map((k) => [k, CATEGORY_THEME[k].label]),
) as Record<Axis, string>

const AXIS_KEY_SET = new Set<string>(AXES)

// Map des sous-clusters UNCATEGORIZED:<subKey> → couleur. Permet à
// axisColor() de colorer les livres de philo (et futurs sous-clusters)
// distinctement dans le pool "Autres disciplines".
const SUB_CLUSTER_COLOR_BY_KEY = new Map<string, string>(
  SUB_CLUSTERS.map((sc) => [`UNCATEGORIZED:${sc.subKey}`, sc.color]),
)

/** Safe lookup — returns `undefined` when `key` is not a known Axis. */
export function axisColor(key: string): string | undefined {
  if (AXIS_KEY_SET.has(key)) return AXES_COLORS[key as Axis]
  // Sous-cluster UNCATEGORIZED:xxx : hérite de la couleur du sous-cluster
  // (cf. SUB_CLUSTERS) pour que les livres rendus avec axes=['UNCAT:philo']
  // apparaissent visuellement comme philosophie dans le pool central.
  return SUB_CLUSTER_COLOR_BY_KEY.get(key)
}

/** Safe lookup — returns `undefined` when `key` is not a known Axis. */
export function axisLabel(key: string): string | undefined {
  return AXIS_KEY_SET.has(key) ? AXES_LABELS[key as Axis] : undefined
}

/** Ne garde que les axes reconnus (données livre / table / import). */
export function narrowAxes(axes: readonly string[] | undefined | null): Axis[] {
  if (!axes?.length) return []
  return [...new Set(axes.filter((a): a is Axis => AXIS_KEY_SET.has(a)))]
}

/** Sépare les axes connus et les thèmes secondaires (« UNCATEGORIZED:label »). */
export function splitBookAxes(raw: readonly string[] | undefined | null): { axes: Axis[]; themes: string[] } {
  if (!raw?.length) return { axes: [], themes: [] }
  const axesSet = new Set<Axis>()
  const themesSet = new Set<string>()
  for (const a of raw) {
    if (a.startsWith('UNCATEGORIZED:')) {
      themesSet.add(a.slice('UNCATEGORIZED:'.length))
    } else if (AXIS_KEY_SET.has(a)) {
      axesSet.add(a as Axis)
    }
  }
  return { axes: [...axesSet], themes: [...themesSet] }
}

// Migration des anciennes clés vers les nouvelles
export const AXES_MIGRATION: Record<string, Axis> = {
  ECOFEMINIST: 'UNCATEGORIZED',
  ECOFEMINISM: 'UNCATEGORIZED',
  ECOLOGY: 'UNCATEGORIZED',
  'QUEER / TRANS': 'QUEER',
  AFROFEMINISM: 'AFROFEMINIST',
  ANTIRACISM: 'ANTIRACISM',
  'HEALTH / TRAUMA': 'HEALTH',
  'CRIP / ABLEISM': 'CRIP',
}

/**
 * Blend multiple axis colours into a single hex colour.
 */
export function blendAxesColors(axes?: readonly string[] | null): string {
  const narrow = narrowAxes(axes ?? undefined)
  if (narrow.length === 0) return '#ffffff'
  if (narrow.length === 1) return AXES_COLORS[narrow[0]] || '#ffffff'

  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (const axis of narrow) {
    const hex = AXES_COLORS[axis]
    if (!hex) continue
    r += parseInt(hex.slice(1, 3), 16)
    g += parseInt(hex.slice(3, 5), 16)
    b += parseInt(hex.slice(5, 7), 16)
    count++
  }
  if (count === 0) return '#ffffff'
  r = Math.round(r / count)
  g = Math.round(g / count)
  b = Math.round(b / count)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Build a CSS linear-gradient string for multi-axis badges / dots.
 */
export function axesGradient(axes?: readonly string[] | null): string {
  const narrow = narrowAxes(axes ?? undefined)
  if (narrow.length === 0) return '#ffffff'
  if (narrow.length === 1) return AXES_COLORS[narrow[0]] || '#ffffff'
  const colors = narrow.map((a) => AXES_COLORS[a]).filter(Boolean)
  return `linear-gradient(135deg, ${colors.join(', ')})`
}

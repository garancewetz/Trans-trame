// Les 8 catégories — TRANS TRAME
export const CATEGORY_THEME = {
  ECOLOGY:      { color: '#00FF87', label: 'Ecology' },
  QUEER:        { color: '#FF2E97', label: 'Queer' },
  AFROFEMINIST: { color: '#FFD700', label: 'Afrofeminist' },
  ANTIRACISM:   { color: '#FF5F1F', label: 'Antiracism' },
  HEALTH:       { color: '#9D50BB', label: 'Health/Trauma' },
  CRIP:         { color: '#8B4513', label: 'Crip Theory' },
  HISTORY:      { color: '#00D1FF', label: 'History' },
  INSTITUTIONAL:{ color: '#B0B0CC', label: 'Institutional' },
}

// Dérivés pour la compatibilité avec le reste de l'app
export const AXES_COLORS = Object.fromEntries(
  Object.entries(CATEGORY_THEME).map(([k, v]) => [k, v.color])
)
export const AXES_LABELS = Object.fromEntries(
  Object.entries(CATEGORY_THEME).map(([k, v]) => [k, v.label])
)
export const AXES = Object.keys(CATEGORY_THEME)

// Backward-compat alias
export const CATEGORY_COLORS = AXES_COLORS

// Migration des anciennes clés vers les nouvelles
export const AXES_MIGRATION = {
  'ECOFEMINIST':   'ECOLOGY',
  'ECOFEMINISM':   'ECOLOGY',
  'QUEER / TRANS': 'QUEER',
  'AFROFEMINISM':  'AFROFEMINIST',
  'ANTIRACISM':    'ANTIRACISM',
  'HEALTH / TRAUMA': 'HEALTH',
  'CRIP / ABLEISM':  'CRIP',
}

/**
 * Blend multiple axis colours into a single hex colour.
 */
export function blendAxesColors(axes) {
  if (!axes || axes.length === 0) return '#ffffff'
  if (axes.length === 1) return AXES_COLORS[axes[0]] || '#ffffff'

  let r = 0, g = 0, b = 0, count = 0
  for (const axis of axes) {
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
export function axesGradient(axes) {
  if (!axes || axes.length === 0) return '#ffffff'
  if (axes.length === 1) return AXES_COLORS[axes[0]] || '#ffffff'
  const colors = axes.map((a) => AXES_COLORS[a]).filter(Boolean)
  return `linear-gradient(135deg, ${colors.join(', ')})`
}

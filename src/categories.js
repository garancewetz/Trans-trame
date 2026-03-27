// Les 5 Catégories — TRANS TRAME
export const AXES_COLORS = {
  'ÉCOFÉMINISTE':   '#00FF87', // Vert Menthe Électrique (plus saturé, évoque la sève)
  'QUEER':          '#FF2E97', // Rose Fuchsia Vibrant (beaucoup plus de caractère)
  'AFRO-FÉMINISTE': '#FFD700', // Or Pur (plus chaud, comme une étoile jeune)
  'HISTOIRE':       '#00D1FF', // Bleu Cyan Solaire (plus lumineux)
  'INSTITUTIONNEL': '#B0B0CC', // Gris Lavande Givré (plus clair pour ne pas disparaître)
};

export const AXES = Object.keys(AXES_COLORS)

// Backward-compat alias used by search dots & legend
export const CATEGORY_COLORS = AXES_COLORS

/**
 * Blend multiple axis colours into a single hex colour.
 * Used for the 3D sphere when a book belongs to several axes.
 */
export function blendAxesColors(axes) {
  if (!axes || axes.length === 0) return '#ffffff'
  if (axes.length === 1) return AXES_COLORS[axes[0]] || '#ffffff'

  let r = 0, g = 0, b = 0
  let count = 0
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

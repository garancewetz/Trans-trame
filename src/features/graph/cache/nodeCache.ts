// @ts-nocheck — shared with nodeObject.ts which disables strict checking
import { AXES_COLORS } from '@/common/utils/categories'

// ── Hover animation cache ────────────────────────────────────────────────────

const hoverAnimById = new Map<string, number>()

// En dessous de ce seuil, on considère le hover comme "éteint" : on libère
// l'entrée plutôt que de garder une valeur qui décroît asymptotiquement vers 0.
// Évite que la map accumule une entrée par nœud jamais survolé sur la session.
const HOVER_EPSILON = 0.001

export function clearHoverAnim(): void { hoverAnimById.clear() }

/** Smoothly interpolate hover state for a node (0 = idle, 1 = hovered) */
export function computeHover(nodeId: string, isHovered: boolean): number {
  const prev = hoverAnimById.get(nodeId) ?? 0
  // Fast path : nœud non survolé et déjà au repos. Représente 99 % des appels
  // (N nœuds × 60 fps), donc éviter Map.set ici fait disparaître ~99 % des
  // mutations. Garbage-collecte aussi les résidus de transitions terminées.
  if (!isHovered && prev < HOVER_EPSILON) {
    if (prev !== 0) hoverAnimById.delete(nodeId)
    return 0
  }
  const hover = prev + ((isHovered ? 1 : 0) - prev) * 0.22
  hoverAnimById.set(nodeId, hover)
  return hover
}

/** Read cached hover value without advancing animation */
export function getHoverValue(nodeId: string): number {
  return hoverAnimById.get(nodeId) ?? 0
}

// ── Gradient canvas cache ────────────────────────────────────────────────────

const gradientCanvasCache = new Map<string, HTMLCanvasElement>()
const GRAD_SIZE = 64

/** Get or create a cached gradient canvas for multi-axis node rendering */
export function getGradientCanvas(axes: string[] | undefined | null): HTMLCanvasElement {
  const key = (axes || []).join('|') || '_empty'
  const cached = gradientCanvasCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = GRAD_SIZE
  canvas.height = GRAD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    gradientCanvasCache.set(key, canvas)
    return canvas
  }

  let colors = (axes || [])
    .map((a) => AXES_COLORS[a])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
  if (colors.length === 0) colors = ['#ffffff']

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  } else {
    const gradient = ctx.createConicGradient(0, GRAD_SIZE / 2, GRAD_SIZE / 2)
    colors.forEach((c, i) => gradient.addColorStop(i / colors.length, c))
    gradient.addColorStop(1, colors[0])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  }

  gradientCanvasCache.set(key, canvas)
  return canvas
}

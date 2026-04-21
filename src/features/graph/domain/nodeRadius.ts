// @ts-nocheck — domain types have optional x/y (d3 adds them at runtime)

/** Calculate node radius based on citation count */
export function getNodeRadius(node: { type?: string }, citationCount: number): number {
  if (node.type === 'author') return 11
  const n = Math.max(0, Number.isFinite(citationCount) ? citationCount : 0)
  // 0 et 1 citation : petits ; 2 citations : premier palier lisible ; au-delà,
  // croissance linéaire (plus l’exponentielle 2^(n-1) qui explosait trop vite).
  const R_IDLE_0 = 3.5
  const R_IDLE_1 = 4
  const R_AT_2 = 17
  const STEP_AFTER_2 = 6
  const MAX_R = 100
  if (n === 0) return R_IDLE_0
  if (n === 1) return R_IDLE_1
  if (n === 2) return R_AT_2
  return Math.min(R_AT_2 + (n - 2) * STEP_AFTER_2, MAX_R)
}

/** Calculate hover-expanded radius with zoom fade-out */
export function hoveredRadius(baseR: number, hover: number, globalScale: number): number {
  const FADE_START = 1.5
  const FADE_END = 3
  const hoverScale = globalScale < FADE_START ? 1
    : globalScale > FADE_END ? 0
    : 1 - (globalScale - FADE_START) / (FADE_END - FADE_START)
  const minR = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  return Math.max(baseR + hover * 12 * hoverScale, minR)
}

const POINTER_PAD = 3

/** Radius for pointer hit area — at least the fully-hovered node radius */
export function getNodePointerHitRadius(
  node: { type?: string },
  citationCount: number,
  globalScale: number,
): number {
  const scale = Number.isFinite(globalScale) && globalScale > 0 ? globalScale : 1
  if (node.type === 'author') {
    const BASE_R = 9
    const maxOuterRing = BASE_R + 6 + 4
    return maxOuterRing + POINTER_PAD
  }
  const baseR = getNodeRadius(node, citationCount)
  return hoveredRadius(baseR, 1, scale) + POINTER_PAD
}

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

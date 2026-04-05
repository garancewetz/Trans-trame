/**
 * Compute fixed positions for each layout mode.
 * Returns a Map<nodeId, {fx, fy, fz}> or null for constellation (free layout).
 */

export const FORCE_CHARGE_AUTHOR = -300
export const FORCE_CHARGE_BOOK = -200
export const FORCE_CHARGE_DIST_MAX = 800
export const FORCE_LINK_DIST_AUTHOR_BOOK = 80
export const FORCE_LINK_DIST_CITATION = 120
export const FORCE_LINK_STRENGTH = 0.2
/** Amplitude horizontale de la tendance chronologique (recent -> droite), en coordonnees graphe. */
export const FORCE_X_YEAR_SPREAD = 7180
/** Strength de la tendance X vers l'annee -- faible pour laisser les noeuds s'etaler librement. */
export const FORCE_X_YEAR_STRENGTH = 0.02
/** Aplatissement vertical : force qui ramene les noeuds vers la ligne d'horizon. */
export const FORCE_Y_CENTER_STRENGTH = 0.35

export const FORCE_COLLIDE_RADIUS = 25

/** Livres sans lien : répulsion plus faible pour ne pas les expulser du nuage. */
export const FORCE_CHARGE_BOOK_ISOLATE_MULT = 0.48
/** Un seul lien : intermédiaire. */
export const FORCE_CHARGE_BOOK_LOW_MULT = 0.74

type ChargeNode = { id?: string; type?: string }

export function chargeStrengthForNode(node: ChargeNode, degreeByNodeId: Map<string, number>): number {
  if (node?.type === 'author') return FORCE_CHARGE_AUTHOR
  const d = node?.id != null ? (degreeByNodeId.get(node.id) ?? 0) : 0
  if (d <= 0) return FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_ISOLATE_MULT
  if (d === 1) return FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_LOW_MULT
  return FORCE_CHARGE_BOOK
}




/**
 * Compute fixed positions for each layout mode.
 * Returns a Map<nodeId, {fx, fy, fz}> or null for constellation (free layout).
 */

export const FORCE_CHARGE_AUTHOR = -260
export const FORCE_CHARGE_BOOK = -150
export const FORCE_CHARGE_DIST_MAX = 700
export const FORCE_LINK_DIST_AUTHOR_BOOK = 70
export const FORCE_LINK_DIST_CITATION = 150
/**
 * Strength par type de lien :
 *  - auteur→livre fort : ancre chaque livre dans sa galaxie, donne des groupes lisibles.
 *  - citation modéré : assez fort pour tirer les livres-ponts entre deux galaxies,
 *    sans collapser les citations internes à une galaxie.
 */
export const FORCE_LINK_STRENGTH_AUTHOR_BOOK = 0.55
export const FORCE_LINK_STRENGTH_CITATION = 0.35
/** Amplitude horizontale de la tendance chronologique (recent -> droite), en coordonnees graphe. */
export const FORCE_X_YEAR_SPREAD = 4800
/** Strength de la tendance X vers l'annee -- tres faible : la structure (liens) domine la chronologie. */
export const FORCE_X_YEAR_STRENGTH = 0.008
/** Aplatissement vertical : modéré pour laisser les galaxies s'étaler en 2D sans perdre l'horizon. */
export const FORCE_Y_CENTER_STRENGTH = 0.12

/**
 * Padding ajouté au rayon visuel du nœud pour la force de collision.
 * La collision se base sur le *vrai* rayon visuel (voir `getNodeRadius`) pour que
 * les nœuds très cités (rayon jusqu'à 46) ne se chevauchent pas.
 */
export const FORCE_COLLIDE_PADDING = 4

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

type LinkLike = { type?: string }

/** Distance de repos du ressort selon le type de lien. */
export function linkDistanceForType(link: LinkLike | null | undefined): number {
  return link?.type === 'author-book' ? FORCE_LINK_DIST_AUTHOR_BOOK : FORCE_LINK_DIST_CITATION
}

/** Raideur du ressort selon le type de lien. */
export function linkStrengthForType(link: LinkLike | null | undefined): number {
  return link?.type === 'author-book' ? FORCE_LINK_STRENGTH_AUTHOR_BOOK : FORCE_LINK_STRENGTH_CITATION
}




/**
 * Compute fixed positions for each layout mode.
 * Returns a Map<nodeId, {fx, fy, fz}> or null for constellation (free layout).
 */

const FORCE_CHARGE_AUTHOR = -400
const FORCE_CHARGE_BOOK = -150
export const FORCE_CHARGE_DIST_MAX = 700
/** Distance de base auteur-livre : moduléee dynamiquement par le nombre de livres de l'auteur (voir linkDistanceForType). */
const FORCE_LINK_DIST_AUTHOR_BOOK_BASE = 70
/** Facteur de croissance sqrt : +15 unités par sqrt(bookCount). 1 livre → 85, 9 → 115, 25 → 145. */
const FORCE_LINK_DIST_AUTHOR_BOOK_SCALE = 15
const FORCE_LINK_DIST_CITATION = 240
/**
 * Strength par type de lien :
 *  - auteur→livre fort : ancre chaque livre dans sa galaxie, donne des groupes lisibles.
 *  - citation modéré : assez fort pour tirer les livres-ponts entre deux galaxies,
 *    sans collapser les citations internes à une galaxie.
 */
const FORCE_LINK_STRENGTH_AUTHOR_BOOK = 0.55
const FORCE_LINK_STRENGTH_CITATION = 0.35
/** Amplitude horizontale de la tendance chronologique (recent -> droite), en coordonnees graphe. */
export const FORCE_X_YEAR_SPREAD = 4800
/**
 * Strength de la tendance X vers l'annee -- tres faible : la structure (liens)
 * domine la chronologie. Une valeur plus élevée créait une tension permanente
 * qui empêchait la simulation de se stabiliser, provoquant des freezes de
 * ~20s lors de reheats (ex: refetch TanStack). La chronologie reste lisible
 * via FORCE_X_YEAR_SPREAD et la sédimentation sur temps long.
 */
export const FORCE_X_YEAR_STRENGTH = 0.008
/** Aplatissement vertical : modéré pour laisser les galaxies s'étaler en 2D sans perdre l'horizon. */
export const FORCE_Y_CENTER_STRENGTH = 0.12

/**
 * Padding ajouté au rayon visuel du nœud pour la force de collision.
 * La collision se base sur le *vrai* rayon visuel (voir `getNodeRadius`) pour que
 * les nœuds très cités (rayon jusqu'à 46) ne se chevauchent pas.
 */
export const FORCE_COLLIDE_PADDING = 10

/** Livres sans lien : répulsion plus faible pour ne pas les expulser du nuage. */
const FORCE_CHARGE_BOOK_ISOLATE_MULT = 0.48
/** Un seul lien : intermédiaire. */
const FORCE_CHARGE_BOOK_LOW_MULT = 0.74

type ChargeNode = { id?: string; type?: string }

export function chargeStrengthForNode(
  node: ChargeNode,
  degreeByNodeId: Map<string, number>,
  citationsByNodeId?: Map<string, number>,
): number {
  if (node?.type === 'author') return FORCE_CHARGE_AUTHOR
  const d = node?.id != null ? (degreeByNodeId.get(node.id) ?? 0) : 0
  let base: number
  if (d <= 0) base = FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_ISOLATE_MULT
  else if (d === 1) base = FORCE_CHARGE_BOOK * FORCE_CHARGE_BOOK_LOW_MULT
  else base = FORCE_CHARGE_BOOK
  // Amplification par citations : un livre très cité pousse plus fort,
  // creuse un "trou" autour de lui et déforme le disque de sa galaxie.
  const cit = node?.id != null ? (citationsByNodeId?.get(node.id) ?? 0) : 0
  const citationBoost = 1 + Math.min(cit * 0.18, 0.9) // max ~1.9x à partir de 5 citations
  return base * citationBoost
}

type LinkEndpoint = string | { id?: string; type?: string } | null | undefined
type LinkLike = { type?: string; source?: LinkEndpoint; target?: LinkEndpoint }

function endpointOf(ep: LinkEndpoint): { id?: string; type?: string } {
  if (ep == null) return {}
  if (typeof ep === 'string') return { id: ep }
  return ep
}

/**
 * Repère l'auteur et le livre aux extrémités d'un lien author-book. Runtime:
 * d3 peut donner soit des IDs (début de simulation) soit des objets hydratés
 * (après résolution). On teste d'abord .type=='author'; à défaut, on se base
 * sur la présence dans bookCountByAuthorId (authors connus) pour désambiguïser.
 */
function splitAuthorBookLink(
  link: LinkLike,
  bookCountByAuthorId?: Map<string, number>,
): { authorId?: string; bookId?: string } {
  const src = endpointOf(link.source)
  const tgt = endpointOf(link.target)
  if (src.type === 'author') return { authorId: src.id, bookId: tgt.id }
  if (tgt.type === 'author') return { authorId: tgt.id, bookId: src.id }
  // Fallback : l'auteur apparaît dans la map bookCountByAuthorId
  if (bookCountByAuthorId) {
    if (src.id && bookCountByAuthorId.has(src.id)) return { authorId: src.id, bookId: tgt.id }
    if (tgt.id && bookCountByAuthorId.has(tgt.id)) return { authorId: tgt.id, bookId: src.id }
  }
  return {}
}

/**
 * Distance de repos du ressort selon le type de lien.
 * - Liens auteur-livre : distance modulée par la taille de la galaxie
 *   (nombre de livres de l'auteur) → galaxies petites compactes, galaxies
 *   populeuses plus vastes. Donne de la diversité morphologique.
 * - Liens de citation : raccourcis quand la cible est un hub (≥ 2 citations
 *   entrantes). Plus la cible est citée, plus elle attire ses citeurs près
 *   d'elle → les feux d'artifice se touchent au niveau des points de
 *   convergence (= les textes-pivots de la pensée).
 *   Paliers : 1cit→240, 2cit→200, 3cit→170, 4cit→140, 5+cit→110.
 */
export function linkDistanceForType(
  link: LinkLike | null | undefined,
  bookCountByAuthorId?: Map<string, number>,
  citationsByNodeId?: Map<string, number>,
): number {
  if (link?.type !== 'author-book') {
    if (citationsByNodeId) {
      const tgt = endpointOf(link?.target as LinkEndpoint)
      const tgtCit = tgt.id ? citationsByNodeId.get(tgt.id) ?? 0 : 0
      if (tgtCit >= 2) return Math.max(110, FORCE_LINK_DIST_CITATION - (tgtCit - 1) * 35)
    }
    return FORCE_LINK_DIST_CITATION
  }
  if (!bookCountByAuthorId) return FORCE_LINK_DIST_AUTHOR_BOOK_BASE + FORCE_LINK_DIST_AUTHOR_BOOK_SCALE
  const { authorId } = splitAuthorBookLink(link, bookCountByAuthorId)
  if (!authorId) return FORCE_LINK_DIST_AUTHOR_BOOK_BASE + FORCE_LINK_DIST_AUTHOR_BOOK_SCALE
  const bookCount = bookCountByAuthorId.get(authorId) ?? 1
  return FORCE_LINK_DIST_AUTHOR_BOOK_BASE + Math.sqrt(Math.max(1, bookCount)) * FORCE_LINK_DIST_AUTHOR_BOOK_SCALE
}

/**
 * Raideur du ressort selon le type de lien.
 * - Liens auteur-livre : strength réduite si le livre a des citations
 *   externes (vers un livre d'un autre auteur) → ces livres "passeurs" dérivent
 *   vers leurs voisins inter-galaxies au lieu de rester sur l'anneau parfait.
 *   Crée des tentacules organiques entre galaxies au lieu de disques uniformes.
 * - Liens de citation : strength légèrement renforcée quand la cible est un
 *   hub (≥ 2 citations). Force les citeurs à se rapprocher du hub partagé →
 *   tissu de filiations visible au lieu d'îlots indépendants. Boost tempéré
 *   (max 0.5) pour éviter d'ajouter trop d'énergie à la simulation — une
 *   strength élevée sur beaucoup de liens = simu qui met longtemps à se
 *   stabiliser, ce qui se voit comme des freezes au moindre reheat.
 *   Paliers : 1cit→0.35, 2cit→0.4, 3cit→0.45, 4+cit→0.5.
 */
export function linkStrengthForType(
  link: LinkLike | null | undefined,
  externalCitationsByBookId?: Map<string, number>,
  citationsByNodeId?: Map<string, number>,
): number {
  if (link?.type !== 'author-book') {
    if (citationsByNodeId) {
      const tgt = endpointOf(link?.target as LinkEndpoint)
      const tgtCit = tgt.id ? citationsByNodeId.get(tgt.id) ?? 0 : 0
      if (tgtCit >= 2) return Math.min(0.5, FORCE_LINK_STRENGTH_CITATION + (tgtCit - 1) * 0.05)
    }
    return FORCE_LINK_STRENGTH_CITATION
  }
  if (!externalCitationsByBookId) return FORCE_LINK_STRENGTH_AUTHOR_BOOK
  const { bookId } = splitAuthorBookLink(link)
  if (!bookId) return FORCE_LINK_STRENGTH_AUTHOR_BOOK
  const ext = externalCitationsByBookId.get(bookId) ?? 0
  // Seuil dur au premier livre-passeur : dès 1 citation externe, le livre
  // décroche franchement de son auteur et peut dériver vers ses voisins.
  // 0 ext → 0.55 (ancré), 1 → 0.30, 2 → 0.22, 3+ → 0.18 (quasi libre).
  if (ext === 0) return FORCE_LINK_STRENGTH_AUTHOR_BOOK
  const weakening = 0.25 + Math.min((ext - 1) * 0.08, 0.20)
  return Math.max(FORCE_LINK_STRENGTH_AUTHOR_BOOK - weakening, 0.18)
}




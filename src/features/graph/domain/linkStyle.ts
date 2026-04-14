/**
 * Visual state & style lookup for graph links.
 *
 * Un rendu de lien est entièrement déterminé par un `LinkVisualState` dérivé
 * du contexte global (sélection, hover, filtre…). Chaque propriété visuelle
 * (couleur, largeur, flèche, particules) est un lookup pur sur cet état — pas
 * de branches `if` dispersées, pas de calcul dupliqué.
 *
 * Modes (caractérisent le rendu de fond, c.-à-d. les liens NON focaux) :
 *   - idle       : pas de sélection, pas de hover → fond moyen
 *   - browsing   : hover sans sélection → fond très effacé (ghost)
 *   - selected   : un ancrage est posé → fond effacé (faint)
 *
 * Sources de focus (peuvent coexister) :
 *   - isAnchored : le lien touche l'ancre courante (selection / peek / filtre auteur)
 *   - isHovered  : le lien touche le noeud actuellement survolé
 *
 * Hiérarchie : si les deux sont vrais, l'ancre l'emporte sur le poids visuel
 * (trait plus épais, plus de particules), mais les deux déclenchent le dégradé
 * directionnel cyan→jaune. En selected mode, le hover reste actif comme une
 * surcouche de prévisualisation par-dessus la sélection.
 *
 * Les liens author-book restent passifs (pas de flèche, pas de particule).
 */

import { linkCitedByRgba, linkCitesRgba } from '@/common/constants/linkRelationColors'
import { normalizeEndpointId } from './graphDataModel'

export type LinkLike = {
  source: unknown
  target: unknown
  type?: string
  __controlPoints?: number[]
}

type LinkKind = 'citation' | 'authorBook'
type LinkMode = 'idle' | 'browsing' | 'selected'

type LinkVisualState = {
  mode: LinkMode
  kind: LinkKind
  isAnchored: boolean
  isHovered: boolean
  isStrong: boolean
  isFiltered: boolean
}

type LinkVisualContext = {
  hasSelection: boolean
  hasHover: boolean
  isFiltered: boolean
  connectedLinks: Set<string>
  hoveredLinks: Set<string>
  linkWeights: Map<string, number>
}

/**
 * Clé canonique d'un lien dirigé. Mêmes conventions que `connectedLinks` /
 * `hoveredLinks` / `linkWeights` (cf. useGraphDerivedLinkState) : A→B et B→A
 * sont deux liens distincts.
 */
export function linkKeyOf(srcId: string, tgtId: string): string {
  return `${srcId}-${tgtId}`
}

// ── Palette ──────────────────────────────────────────────────────────────────
/** Opacités nommées (cyan citer / jaune cité). */
const ALPHA = {
  ghost: 0.03, // browsing, lien d'arrière-plan
  faint: 0.1, // inactif (AB passif, citation hors focus)
  dim: 0.15, // idle pur
  medium: 0.45, // author-book focal
  arrowIdle: 0.5,
  particleIdle: 0.6,
  strong: 0.85, // flèche / particule sur lien focal
  bright: 0.9,
} as const

const TRANSPARENT = 'rgba(0,0,0,0)'
const INACTIVE_STRONG = 'rgba(255,255,255,0.05)'

// ── Géométrie nommée ─────────────────────────────────────────────────────────
/** Largeur de trait. */
const LINK_WIDTH = {
  background: 0.5, // lien d'arrière-plan
  idleStrong: 1.0, // lien strong en idle (multiplicité)
  hoverFocus: 1.0, // lien focal via hover (preview)
  authorBookFocus: 1.2,
  anchorFocus: 2.2, // lien focal via anchor (sélection)
  strongBonus: 0.6, // ajout si isStrong sur un focal citation
} as const

/** Longueur de la flèche directionnelle. */
const ARROW = {
  none: 0,
  selectedInactive: 3,
  idle: 4,
  hoverFocus: 6,
  anchorFocus: 7,
} as const

/** Particules animées (nombre) sur un lien focal. */
const PARTICLES = {
  hoverFocus: 3,
  anchorFocus: 5,
  width: 2,
} as const

/** Trait du dégradé directionnel peint en canvas. */
const GRADIENT_WIDTH = {
  hoverFocus: 1.4,
  anchorFocus: 2.0,
  strongBonus: 0.8,
} as const

// ── State derivation ─────────────────────────────────────────────────────────

export function computeLinkVisualState(link: LinkLike, ctx: LinkVisualContext): LinkVisualState {
  const kind: LinkKind = link.type === 'author-book' ? 'authorBook' : 'citation'
  const srcId = normalizeEndpointId(link.source)
  const tgtId = normalizeEndpointId(link.target)
  const key = srcId && tgtId ? linkKeyOf(srcId, tgtId) : null

  const mode: LinkMode = ctx.hasSelection ? 'selected' : ctx.hasHover ? 'browsing' : 'idle'

  // Les deux signaux de focus sont indépendants et peuvent coexister.
  // `connectedLinks` est vide hors selected mode ; `hoveredLinks` est vide hors hover.
  const isAnchored = key ? ctx.connectedLinks.has(key) : false
  const isHovered = key ? ctx.hoveredLinks.has(key) : false

  const isStrong = key ? (ctx.linkWeights.get(key) || 1) > 1 : false

  return {
    mode,
    kind,
    isAnchored,
    isHovered,
    isStrong,
    isFiltered: ctx.isFiltered,
  }
}

/** Citation mise en avant — anchor OU hover déclenchent le dégradé. */
function isEmphasized(s: LinkVisualState): boolean {
  return s.kind === 'citation' && (s.isAnchored || s.isHovered)
}

/** Le focus le plus fort qui s'applique à ce lien. */
function focusLevel(s: LinkVisualState): 'anchor' | 'hover' | 'none' {
  if (s.isAnchored) return 'anchor'
  if (s.isHovered) return 'hover'
  return 'none'
}

// ── Style lookups ────────────────────────────────────────────────────────────

export function getLinkColor(s: LinkVisualState): string {
  if (s.kind === 'authorBook') {
    const focused = s.isAnchored || s.isHovered
    return linkCitesRgba(focused ? ALPHA.medium : ALPHA.faint)
  }
  // Citation focale → trait transparent, le dégradé directionnel est peint par-dessus
  if (isEmphasized(s)) return TRANSPARENT
  if (s.mode === 'browsing') return linkCitesRgba(ALPHA.ghost)
  if (s.mode === 'selected') return linkCitesRgba(ALPHA.faint)
  return linkCitesRgba(s.isFiltered ? ALPHA.faint : ALPHA.dim)
}

export function getLinkWidth(s: LinkVisualState): number {
  if (s.kind === 'authorBook') {
    return s.isAnchored || s.isHovered ? LINK_WIDTH.authorBookFocus : LINK_WIDTH.background
  }
  const focus = focusLevel(s)
  if (focus === 'anchor') {
    return s.isStrong ? LINK_WIDTH.anchorFocus + LINK_WIDTH.strongBonus : LINK_WIDTH.anchorFocus
  }
  if (focus === 'hover') {
    return s.isStrong ? LINK_WIDTH.hoverFocus + LINK_WIDTH.strongBonus : LINK_WIDTH.hoverFocus
  }
  if (s.mode === 'idle' && s.isStrong) return LINK_WIDTH.idleStrong
  return LINK_WIDTH.background
}

export function getArrowColor(s: LinkVisualState): string {
  // Les liens author-book n'ont pas de flèche (relation non-directionnelle sémantiquement)
  if (s.kind === 'authorBook') return TRANSPARENT
  if (isEmphasized(s)) return linkCitedByRgba(ALPHA.strong)
  if (s.mode === 'selected') return INACTIVE_STRONG
  return linkCitesRgba(ALPHA.arrowIdle)
}

export function getArrowLength(s: LinkVisualState): number {
  if (s.kind === 'authorBook') return ARROW.none
  const focus = focusLevel(s)
  if (focus === 'anchor') return ARROW.anchorFocus
  if (focus === 'hover') return ARROW.hoverFocus
  if (s.mode === 'idle') return ARROW.idle
  if (s.mode === 'selected') return ARROW.selectedInactive
  return ARROW.none // browsing non focal
}

export function getParticleCount(s: LinkVisualState): number {
  if (s.kind === 'authorBook') return 0
  const focus = focusLevel(s)
  if (focus === 'anchor') return PARTICLES.anchorFocus
  if (focus === 'hover') return PARTICLES.hoverFocus
  return 0
}

export function getParticleWidth(s: LinkVisualState): number {
  return getParticleCount(s) > 0 ? PARTICLES.width : 0
}

export function getParticleColor(s: LinkVisualState): string {
  if (s.kind === 'authorBook') return TRANSPARENT
  if (isEmphasized(s)) return linkCitesRgba(ALPHA.bright)
  if (s.mode === 'selected') return INACTIVE_STRONG
  return linkCitesRgba(ALPHA.particleIdle)
}

/** Stops du dégradé directionnel (cyan source → jaune cible). */
export function getDirectionalGradientStops(s: LinkVisualState): Array<[number, string]> {
  return [
    [0, linkCitesRgba(s.isStrong ? 1.0 : 0.9)],
    [0.3, linkCitesRgba(0.7)],
    [0.6, linkCitedByRgba(0.6)],
    [1, linkCitedByRgba(s.isStrong ? 0.95 : 0.8)],
  ]
}

export function getDirectionalGradientLineWidth(s: LinkVisualState): number {
  // Anchor focus = trait plus marqué que hover preview
  const base = s.isAnchored ? GRADIENT_WIDTH.anchorFocus : GRADIENT_WIDTH.hoverFocus
  return s.isStrong ? base + GRADIENT_WIDTH.strongBonus : base
}

export function shouldPaintDirectionalGradient(s: LinkVisualState): boolean {
  return isEmphasized(s)
}

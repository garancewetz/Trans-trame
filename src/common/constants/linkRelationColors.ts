/**
 * Couleurs des relations de citation — alignées sur le panneau ouvrage
 * (NodeDetails + ReferenceRow : références citées vs cité par).
 */
export function linkCitesRgba(alpha: number): string {
  return `rgba(140,220,255,${alpha})`
}

export function linkCitedByRgba(alpha: number): string {
  return `rgba(255,171,64,${alpha})`
}

export const LINK_CITES_COLOR = 'rgba(140,220,255,0.7)'
export const LINK_CITES_COLOR_STRONG = 'rgba(140,220,255,0.85)'
export const LINK_CITES_ICON = 'rgba(140,220,255,0.8)'

export const LINK_CITED_BY_COLOR = 'rgba(255,171,64,0.7)'
export const LINK_CITED_BY_COLOR_STRONG = 'rgba(255,171,64,0.85)'
export const LINK_CITED_BY_ICON = 'rgba(255,171,64,0.8)'

/** Bordure / survol des lignes (page ouvrage, cohérent avec ReferenceRow). */
export const LINK_CITES_ROW_BORDER = 'rgba(140,220,255,0.4)'
export const LINK_CITES_ROW_HOVER_BG = 'rgba(140,220,255,0.07)'
export const LINK_CITED_BY_ROW_BORDER = 'rgba(255,171,64,0.4)'
export const LINK_CITED_BY_ROW_HOVER_BG = 'rgba(255,171,64,0.08)'

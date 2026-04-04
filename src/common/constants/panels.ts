/** Largeurs centralisées des panels — modifier ici, tout s'adapte */

/** Valeurs brutes en rem (pour calculs) */
export const PANEL_REM = {
  /** Panels latéraux par défaut (Textes, Auteurs, Analyse, SidePanel simple) */
  default: 23.75, // 380px
  /** SidePanel en mode ouvrage (node sélectionné) */
  book: 32,
  /** Panel source de liens (LinkSourcePanel) */
  linkSource: 20, // w-80 = 20rem
} as const

/**
 * Classes Tailwind — les valeurs DOIVENT correspondre à PANEL_REM.
 * `dual` = book + linkSource (maintenir à jour si on change les rem).
 *
 * ⚠️ Classes écrites en dur (pas interpolées) pour que le scanner Tailwind JIT les détecte.
 */
export const PANEL_WIDTH = {
  default: 'w-[23.75rem]',
  book: 'w-[min(100vw,32rem)]',
  dual: 'w-[min(100vw,52rem)]',
  linkSource: 'w-[20rem]',
} as const

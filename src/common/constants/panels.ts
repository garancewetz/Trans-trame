/**
 * Largeurs Tailwind centralisées des panels.
 * `dual` = book + linkSource.
 *
 * ⚠️ Classes écrites en dur (pas interpolées) pour que le scanner Tailwind JIT les détecte.
 */
export const PANEL_WIDTH = {
  default: 'w-[23.75rem]',
  analysis: 'w-[min(100vw,32rem)]',
  book: 'w-[min(100vw,32rem)]',
  dual: 'w-[min(100vw,52rem)]',
  linkSource: 'w-[20rem]',
} as const

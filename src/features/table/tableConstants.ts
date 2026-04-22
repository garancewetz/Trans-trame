import type { CSSProperties } from 'react'

export const INPUT =
  'bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[0.88rem] font-mono text-white outline-none placeholder:text-white/30 focus:border-cyan/35 focus:bg-white/8 transition-all w-full'

export const TD = 'px-3 py-2 text-ui font-mono text-white/72'

/** Shared grid template for the BooksTab header + rows + AddRow. Inline
 *  gridTemplateColumns because Tailwind arbitrary classes don't accept commas
 *  inside `minmax()` without awkward escaping. */
export const BOOKS_GRID_STYLE: CSSProperties = {
  gridTemplateColumns:
    '36px minmax(0, 3fr) minmax(0, 1.4fr) 96px 120px 160px 80px 112px 88px',
}

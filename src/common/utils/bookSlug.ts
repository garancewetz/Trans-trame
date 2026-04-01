import type { Book, BookId } from '@/types/domain'

const DIACRITICS = /[\u0300-\u036f]/g

const UUID_TAIL =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** Clés de query pour la carte (`GraphApp`). */
export const MAP_QUERY_KEYS = {
  book: 'book',
  link: 'link',
  from: 'from',
} as const

/**
 * ASCII-ish slug for URLs (Latin base + digits), suitable for English paths.
 */
export function slugifyForUrl(text: string): string {
  const t = text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return t || 'work'
}

/**
 * Segment `search` pour ouvrir la carte sur un ouvrage : `?book=<uuid>`.
 * À utiliser avec `<Link to={{ pathname: '/', search: mapBookUrlSearch(id) }} />`.
 */
export function mapBookUrlSearch(bookId: BookId): string {
  return new URLSearchParams({ [MAP_QUERY_KEYS.book]: bookId }).toString()
}

/** Extract book id from the `:slug` route param (UUID at end of segment). */
export function parseBookIdFromWorkSlugParam(param: string): BookId | null {
  const m = param.match(UUID_TAIL)
  return m ? m[1] : null
}

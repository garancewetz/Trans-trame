import type { KnownAuthor } from './hooks/useKnownData'

export interface KnownDataLower {
  editions: string[]
  editionsLower: string[]
  authorsLower: { firstName: string; lastName: string; full: string }[]
}

export function buildKnownLower(
  knownAuthors: KnownAuthor[],
  knownEditions: string[],
): KnownDataLower {
  // Sort by length descending so longest (most specific) match wins
  const sorted = [...knownEditions].sort((a, b) => b.length - a.length)
  return {
    editions: sorted,
    editionsLower: sorted.map((e) => e.toLowerCase()),
    authorsLower: knownAuthors.map((a) => ({
      firstName: a.firstName.toLowerCase(),
      lastName: a.lastName.toLowerCase(),
      full: `${a.firstName} ${a.lastName}`.toLowerCase().trim(),
    })),
  }
}

/** Returns true if `text` matches (or contains) a known edition name. */
export function isKnownEdition(text: string, editionsLower: string[]): boolean {
  const t = text.toLowerCase().trim()
  return editionsLower.some((e) => t === e || t.startsWith(e) || e.startsWith(t))
}

/** Returns true if `text` matches a known author (last name or full name). */
export function isKnownAuthor(text: string, authorsLower: KnownDataLower['authorsLower']): boolean {
  const t = text.toLowerCase().trim()
  return authorsLower.some((a) => t === a.full || t === a.lastName || t === `${a.lastName} ${a.firstName}`)
}

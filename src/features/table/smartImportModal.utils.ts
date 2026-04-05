import type { Author } from '@/types/domain'
import type { ParsedAuthor, ParsedBook } from './parseSmartInput.types'

export type AuthorMergeSuggestion = {
  id: string
  /** The author entry with only an initial (e.g. "T Lequeur") */
  initialAuthor: ParsedAuthor
  /** The author entry with the full first name (e.g. "Thomas Lequeur") */
  fullAuthor: ParsedAuthor
  /** If the full author comes from existing DB authors */
  existingAuthorId?: string
  /** Parsed item IDs that contain the initial-only author */
  affectedItemIds: string[]
}

export function isThenable(v: unknown): v is PromiseLike<unknown> {
  if (v == null) return false
  const kind = typeof v
  if (kind !== 'object' && kind !== 'function') return false
  const then = Reflect.get(v, 'then')
  return typeof then === 'function'
}

export function normStr(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

type AuthorNameParts = { firstName?: string; lastName?: string }

/**
 * Pour chaque auteur dans la liste, cherche un auteur existant (match prénom+nom normalisé).
 * Si absent, crée un nouveau nœud auteur via onAddAuthor et retourne son id.
 * Returns both the resolved IDs and any promises from author creation (to await before inserting books).
 */
export function resolveOrCreateAuthors(
  authorList: AuthorNameParts[],
  existingAuthors: Author[],
  onAddAuthor: (a: Author) => unknown
): { ids: string[]; promises: PromiseLike<unknown>[] } {
  if (!authorList?.length) return { ids: [], promises: [] }
  const ids: string[] = []
  const promises: PromiseLike<unknown>[] = []
  authorList.forEach(({ firstName, lastName }) => {
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    if (!fn && !ln) return
    const existing = existingAuthors.find(
      (a) => normStr(a.firstName) === normStr(fn) && normStr(a.lastName) === normStr(ln)
    )
    if (existing) {
      ids.push(existing.id)
    } else {
      const newId = crypto.randomUUID()
      const result = onAddAuthor({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        promises.push(result as PromiseLike<unknown>)
      }
      existingAuthors.push({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      ids.push(newId)
    }
  })
  return { ids, promises }
}

/** Returns true if `s` looks like a single initial: "T", "T.", "t" etc. */
function isInitial(s: string): boolean {
  const t = s.trim().replace('.', '')
  return t.length === 1 && /[a-zA-ZÀ-ÿ]/.test(t)
}

/**
 * Detect potential author merges where one entry has only an initial as firstName
 * and another (in the same import or existing DB) has a full firstName starting with
 * the same letter, with matching lastName.
 */
export function detectAuthorInitialMatches(
  parsed: ParsedBook[],
  existingAuthors: Author[]
): AuthorMergeSuggestion[] {
  // Collect all unique (firstName, lastName) pairs from parsed items, with item IDs
  type AuthorEntry = { firstName: string; lastName: string; itemIds: string[]; existingId?: string }
  const entryMap = new Map<string, AuthorEntry>()

  for (const item of parsed) {
    const authors = item.authors?.length > 0
      ? item.authors
      : [{ firstName: item.firstName, lastName: item.lastName }]
    for (const a of authors) {
      const fn = (a.firstName || '').trim()
      const ln = (a.lastName || '').trim()
      if (!ln) continue
      const key = `${normStr(fn)}|${normStr(ln)}`
      const existing = entryMap.get(key)
      if (existing) {
        if (!existing.itemIds.includes(item.id)) existing.itemIds.push(item.id)
      } else {
        entryMap.set(key, { firstName: fn, lastName: ln, itemIds: [item.id] })
      }
    }
  }

  // Also add existing DB authors (no itemIds — they're already in DB)
  for (const a of existingAuthors) {
    const fn = (a.firstName || '').trim()
    const ln = (a.lastName || '').trim()
    if (!ln) continue
    const key = `${normStr(fn)}|${normStr(ln)}`
    if (!entryMap.has(key)) {
      entryMap.set(key, { firstName: fn, lastName: ln, itemIds: [], existingId: a.id })
    }
  }

  const entries = [...entryMap.values()]
  const suggestions: AuthorMergeSuggestion[] = []
  const seen = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      if (normStr(a.lastName) !== normStr(b.lastName)) continue

      let initialEntry: AuthorEntry | null = null
      let fullEntry: AuthorEntry | null = null

      if (isInitial(a.firstName) && !isInitial(b.firstName) && normStr(b.firstName)[0] === normStr(a.firstName).replace('.', '')) {
        initialEntry = a
        fullEntry = b
      } else if (isInitial(b.firstName) && !isInitial(a.firstName) && normStr(a.firstName)[0] === normStr(b.firstName).replace('.', '')) {
        initialEntry = b
        fullEntry = a
      }

      if (!initialEntry || !fullEntry) continue
      // Only suggest if the initial-author is in parsed items (otherwise nothing to merge)
      if (initialEntry.itemIds.length === 0) continue

      const pairKey = `${normStr(initialEntry.firstName)}|${normStr(initialEntry.lastName)}→${normStr(fullEntry.firstName)}|${normStr(fullEntry.lastName)}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      suggestions.push({
        id: pairKey,
        initialAuthor: { firstName: initialEntry.firstName, lastName: initialEntry.lastName },
        fullAuthor: { firstName: fullEntry.firstName, lastName: fullEntry.lastName },
        existingAuthorId: fullEntry.existingId,
        affectedItemIds: initialEntry.itemIds,
      })
    }
  }

  return suggestions
}


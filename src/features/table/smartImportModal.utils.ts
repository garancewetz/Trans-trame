import type { Author } from '@/types/domain'

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


import type { Author } from '@/domain/types'

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
 */
export function resolveOrCreateAuthors(
  authorList: AuthorNameParts[],
  existingAuthors: Author[],
  onAddAuthor: (a: Author) => void
): string[] {
  if (!authorList?.length) return []
  const resolved: string[] = []
  authorList.forEach(({ firstName, lastName }) => {
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    if (!fn && !ln) return
    const existing = existingAuthors.find(
      (a) => normStr(a.firstName) === normStr(fn) && normStr(a.lastName) === normStr(ln)
    )
    if (existing) {
      resolved.push(existing.id)
    } else {
      const newId = crypto.randomUUID()
      onAddAuthor({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      existingAuthors.push({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      resolved.push(newId)
    }
  })
  return resolved
}


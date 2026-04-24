type AnyNode = Record<string, unknown>

export type AuthorNode = {
  id: string
  type?: string
  firstName?: string
  lastName?: string
  author?: string
  axes?: string[]
} & AnyNode

export type BookNode = {
  authorIds?: string[]
  firstName?: string
  lastName?: string
  author?: string
  axes?: string[]
} & AnyNode

/** Nom complet d'un nœud auteur : "Prénom NOM" (nom de famille en majuscules) */
export function authorName(node: Partial<Pick<AuthorNode, 'firstName' | 'lastName' | 'author'>>): string {
  if (node.firstName || node.lastName) {
    const ln = node.lastName ? node.lastName.toUpperCase() : ''
    return [node.firstName, ln].filter(Boolean).join(' ')
  }
  return node.author || ''
}

/**
 * Nom(s) d'auteur·ice(s) d'un livre, résolu via la liste d'entités auteurs.
 * @param {object} book — nœud livre avec authorIds
 * @param {Array|Map} authors — liste d'auteurs ou Map id→author
 * @returns {string} noms séparés par ", "
 */
export function bookAuthorDisplay(book: Partial<BookNode>, authors: AuthorNode[] | Map<string, AuthorNode>): string {
  const ids = book?.authorIds
  if (!ids || ids.length === 0) {
    // Fallback legacy : champs firstName/lastName sur le livre lui-même
    return authorName(book)
  }

  const map = authors instanceof Map ? authors : null
  const list = authors instanceof Map ? [] : authors

  const names = ids
    .map((id) => {
      const a = map ? map.get(id) : list.find((au) => au.id === id)
      return a ? authorName(a) : null
    })
    .filter(Boolean)
  return names.join(', ')
}

/** Construit une Map id→author pour lookups rapides */
export function buildAuthorsMap(authors: AuthorNode[] | null | undefined): Map<string, AuthorNode> {
  const m = new Map<string, AuthorNode>()
  ;(authors || []).forEach((a) => m.set(a.id, a))
  return m
}

/** Sort key based on lastName (lowercased, for locale compare) */
export function authorSortKey(node: Partial<Pick<AuthorNode, 'lastName' | 'author'>>): string {
  if (node.lastName) return node.lastName.toLowerCase()
  // Fallback for old data: take last word
  const parts = (node.author || '').trim().split(/\s+/)
  return (parts[parts.length - 1] || '').toLowerCase()
}

/** Sort key for a book based on its first author's lastName */
export function bookAuthorSortKey(book: Partial<BookNode>, authors: Map<string, AuthorNode>): string {
  const ids = book.authorIds
  if (ids && ids.length > 0) {
    const a = authors.get(ids[0])
    if (a) return authorSortKey(a)
  }
  return ''
}

/**
 * migrateData() — convertit les livres au format legacy (firstName/lastName directs)
 * en entités auteurs distinctes avec author_ids.
 *
 * À appeler une seule fois depuis la console ou un bouton admin pour nettoyer la base.
 *
 * @param {Array} books  — tableau de nœuds livres existants
 * @param {Array} existingAuthors — tableau d'auteurs déjà en base (pour éviter les doublons)
 * @returns {{ newAuthors: Author[], updatedBooks: Book[] }}
 *   newAuthors  : auteurs à créer (appeler handleAddAuthor sur chacun)
 *   updatedBooks : livres mis à jour avec authorIds (appeler handleUpdateBook sur chacun)
 *
 * Exemple d'usage :
 *   const { newAuthors, updatedBooks } = migrateData(books, authors)
 *   newAuthors.forEach(a => handleAddAuthor(a))
 *   updatedBooks.forEach(b => handleUpdateBook(b))
 */
export function migrateData(
  books: BookNode[],
  existingAuthors: AuthorNode[] = []
): { newAuthors: AuthorNode[]; updatedBooks: (BookNode & { authorIds: string[] })[] } {
  // Index des auteurs existants par clé "prénom|nom" normalisée
  const norm = (s: unknown) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()

  const authorMap = new Map<string, AuthorNode>() // `${fn}|${ln}` → author object
  existingAuthors.forEach((a) => {
    const key = `${norm(a.firstName)}|${norm(a.lastName)}`
    authorMap.set(key, a)
  })

  const newAuthors: AuthorNode[] = []
  const updatedBooks: (BookNode & { authorIds: string[] })[] = []

  books.forEach((book) => {
    // Livre déjà migré : a des authorIds → pas de changement nécessaire
    if (book.authorIds && book.authorIds.length > 0) {
      const authorIds = book.authorIds
      updatedBooks.push({ ...book, authorIds })
      return
    }

    const fn = (book.firstName || '').trim()
    const ln = (book.lastName || '').trim()

    // Livre sans auteur
    if (!fn && !ln) {
      updatedBooks.push({ ...book, authorIds: [] })
      return
    }

    const key = `${norm(fn)}|${norm(ln)}`
    let author = authorMap.get(key)

    if (!author) {
      // Créer un nouvel auteur
      author = {
        id: crypto.randomUUID(),
        type: 'author',
        firstName: fn,
        lastName: ln,
        axes: [],
      }
      authorMap.set(key, author)
      newAuthors.push(author)
    }

    updatedBooks.push({
      ...book,
      authorIds: [author.id],
    })
  })

  return { newAuthors, updatedBooks }
}


/** Nom complet d'un nœud auteur : "Prénom Nom" */
export function authorName(node) {
  if (node.firstName || node.lastName) {
    return [node.firstName, node.lastName].filter(Boolean).join(' ')
  }
  return node.author || ''
}

/**
 * Nom(s) d'auteur·ice(s) d'un livre, résolu via la liste d'entités auteurs.
 * @param {object} book — nœud livre avec authorIds
 * @param {Array|Map} authors — liste d'auteurs ou Map id→author
 * @returns {string} noms séparés par ", "
 */
export function bookAuthorDisplay(book, authors) {
  const ids = book?.authorIds
  if (!ids || ids.length === 0) {
    // Fallback legacy : champs firstName/lastName sur le livre lui-même
    return authorName(book)
  }
  const map = authors instanceof Map ? authors : null
  const names = ids
    .map((id) => {
      const a = map ? map.get(id) : authors.find((au) => au.id === id)
      return a ? authorName(a) : null
    })
    .filter(Boolean)
  return names.join(', ')
}

/** Construit une Map id→author pour lookups rapides */
export function buildAuthorsMap(authors) {
  const m = new Map()
  ;(authors || []).forEach((a) => m.set(a.id, a))
  return m
}

/**
 * Heuristic: first token → prénom, reste → nom (ex. « Simone de Beauvoir »).
 */
export function splitAuthorDisplayName(name) {
  const t = (name || '').trim()
  if (!t) return { firstName: '', lastName: '' }
  const i = t.indexOf(' ')
  if (i === -1) return { firstName: '', lastName: t }
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() }
}

/** Sort key based on lastName (lowercased, for locale compare) */
export function authorSortKey(node) {
  if (node.lastName) return node.lastName
  // Fallback for old data: take last word
  const parts = (node.author || '').trim().split(/\s+/)
  return parts[parts.length - 1] || ''
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
 *   updatedBooks: livres mis à jour avec authorIds (appeler handleUpdateBook sur chacun)
 *
 * Exemple d'usage :
 *   const { newAuthors, updatedBooks } = migrateData(books, authors)
 *   newAuthors.forEach(a => handleAddAuthor(a))
 *   updatedBooks.forEach(b => handleUpdateBook(b))
 */
export function migrateData(books, existingAuthors = []) {
  // Index des auteurs existants par clé "prénom|nom" normalisée
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()

  const authorMap = new Map() // `${fn}|${ln}` → author object
  existingAuthors.forEach((a) => {
    const key = `${norm(a.firstName)}|${norm(a.lastName)}`
    authorMap.set(key, a)
  })

  const newAuthors = []
  const updatedBooks = []

  books.forEach((book) => {
    // Livre déjà migré : a des authorIds → pas de changement nécessaire
    if (book.authorIds && book.authorIds.length > 0) {
      updatedBooks.push(book)
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
        id: `auth_${crypto.randomUUID()}`,
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

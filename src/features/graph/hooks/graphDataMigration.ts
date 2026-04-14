import type { Dispatch, SetStateAction } from 'react'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { migrateData } from '@/common/utils/authorUtils'
import { devWarn } from '@/common/utils/logger'
import { supabase } from '@/core/supabase'
import { insertAuthorRows, setBookAuthors } from '../api/graphDataApi'
import {
  authorToDbRow,
  type AxesColorMap,
  sanitizeBook,
} from '../domain/graphDataModel'

function authorFromMigrationNode(a: AuthorNode): Author {
  return {
    id: a.id,
    type: 'author',
    firstName: a.firstName,
    lastName: a.lastName,
    axes: a.axes,
  }
}

export type MigrationFailure = { bookId: string; title: string; author: string; error: string }

export type MigrationResult = {
  newAuthors: number
  updatedBooks: number
  failures: MigrationFailure[]
  error?: string
}

function errorMessage(err: unknown): string {
  if (!err) return 'Erreur inconnue'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  try { return JSON.stringify(err) } catch { return String(err) }
}

export async function migrateLegacyAuthorsAndBooks(params: {
  books: Book[]
  authors: Author[]
  axesColors: AxesColorMap
  setBooks: Dispatch<SetStateAction<Book[]>>
  setAuthors: Dispatch<SetStateAction<Author[]>>
}): Promise<MigrationResult> {
  const { books, authors, axesColors, setBooks, setAuthors } = params

  // Index des livres legacy (pas d'authorIds mais ont firstName/lastName)
  const legacyBookIds = new Set(
    books.filter((b) => !b.authorIds?.length && (b.firstName || b.lastName)).map((b) => b.id),
  )

  if (legacyBookIds.size === 0) {
    return { newAuthors: 0, updatedBooks: 0, failures: [] }
  }

  const { newAuthors, updatedBooks } = migrateData(books, authors)

  // 1. Créer les nouveaux auteurs en base
  if (newAuthors.length > 0) {
    const rows = newAuthors.map((a) =>
      authorToDbRow({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        axes: a.axes ?? [],
      })
    )
    const { error } = await insertAuthorRows(rows)
    if (error) {
      devWarn('Migration: erreur insert authors', error)
      return {
        newAuthors: 0,
        updatedBooks: 0,
        failures: [],
        error: `Échec de la création des auteur·ices : ${errorMessage(error)}`,
      }
    }
    setAuthors((prev) => [...prev, ...newAuthors.map(authorFromMigrationNode)])
  }

  // 2. Ne traiter QUE les livres legacy (pas tous les livres du projet)
  const booksToUpdate = updatedBooks.filter(
    (b) => legacyBookIds.has(String(b.id)) && b.authorIds?.length > 0,
  )

  const failures: MigrationFailure[] = []
  const succeededIds = new Set<string>()

  // Séquentiellement pour éviter le rate-limiting Supabase
  for (const book of booksToUpdate) {
    const bookId = String(book.id)
    const orig = books.find((b0) => b0.id === bookId)
    if (!orig) continue

    const result = await setBookAuthors(bookId, book.authorIds)
    if (result && 'error' in result && result.error) {
      devWarn('Migration: erreur set book_authors', bookId, result.error)
      failures.push({
        bookId,
        title: orig.title || '(sans titre)',
        author: [orig.firstName, orig.lastName].filter(Boolean).join(' '),
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? String((result.error as { message: string }).message)
          : JSON.stringify(result.error),
      })
    } else {
      succeededIds.add(bookId)
    }
  }

  // 3. Vérifier que les écritures ont persisté en base
  if (succeededIds.size > 0) {
    const { data: persistedRows, error: verifyError } = await supabase
      .from('book_authors')
      .select('book_id')
      .in('book_id', [...succeededIds])

    if (verifyError) {
      devWarn('Migration: impossible de vérifier les écritures book_authors', verifyError)
    } else {
      const persistedBookIds = new Set(persistedRows.map((r) => r.book_id))
      const notPersisted = [...succeededIds].filter((id) => !persistedBookIds.has(id))

      if (notPersisted.length > 0) {
        devWarn(`Migration: ${notPersisted.length} livre(s) n'ont pas persisté`, notPersisted)
        for (const bookId of notPersisted) {
          succeededIds.delete(bookId)
          const orig = books.find((b) => b.id === bookId)
          if (orig) {
            failures.push({
              bookId,
              title: orig.title || '(sans titre)',
              author: [orig.firstName, orig.lastName].filter(Boolean).join(' '),
              error: 'Écriture non persistée (vérifier les permissions RLS)',
            })
          }
        }
      }
    }
  }

  // 4. Ne mettre à jour le state que pour les livres qui ont réussi
  setBooks((prev) =>
    prev.map((orig) => {
      if (!succeededIds.has(orig.id)) return orig
      const u = updatedBooks.find((x) => String(x.id) === orig.id)
      if (!u) return orig
      return sanitizeBook({ ...orig, authorIds: u.authorIds }, axesColors)
    })
  )

  return { newAuthors: newAuthors.length, updatedBooks: succeededIds.size, failures }
}

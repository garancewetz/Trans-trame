import type { Dispatch, SetStateAction } from 'react'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { migrateData } from '@/common/utils/authorUtils'
import { devWarn } from '@/common/utils/logger'
import { insertAuthorRow, setBookAuthors } from '../api/graphDataApi'
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
}

export async function migrateLegacyAuthorsAndBooks(params: {
  books: Book[]
  authors: Author[]
  axesColors: AxesColorMap
  setBooks: Dispatch<SetStateAction<Book[]>>
  setAuthors: Dispatch<SetStateAction<Author[]>>
}): Promise<MigrationResult | null> {
  const { books, authors, axesColors, setBooks, setAuthors } = params
  const { newAuthors, updatedBooks } = migrateData(books, authors)
  if (newAuthors.length === 0 && updatedBooks.every((b) => !b.authorIds?.length)) {
    return { newAuthors: 0, updatedBooks: 0, failures: [] }
  }

  if (newAuthors.length > 0) {
    const rows = newAuthors.map((a) =>
      authorToDbRow({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        axes: a.axes ?? [],
      })
    )
    const { error } = await insertAuthorRow(rows)
    if (error) {
      devWarn('Migration: erreur insert authors', error)
      return null
    }
    setAuthors((prev) => [...prev, ...newAuthors.map(authorFromMigrationNode)])
  }

  const booksToUpdate = updatedBooks.filter((b) => b.authorIds?.length > 0)
  const failures: MigrationFailure[] = []
  const succeededIds = new Set<string>()

  await Promise.all(
    booksToUpdate.map(async (book) => {
      const bookId = String(book.id)
      const orig = books.find((b0) => b0.id === bookId)
      if (!orig) return

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
    })
  )

  // Ne mettre à jour le state que pour les livres qui ont réussi
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

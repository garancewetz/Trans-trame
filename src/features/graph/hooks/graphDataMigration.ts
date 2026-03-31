import type { Dispatch, SetStateAction } from 'react'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { migrateData } from '@/common/utils/authorUtils'
import { devWarn } from '@/common/utils/logger'
import { insertAuthorRow, updateBookRowById } from '../api/graphDataApi'
import {
  authorToDbRow,
  bookToDbRow,
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

export async function migrateLegacyAuthorsAndBooks(params: {
  books: Book[]
  authors: Author[]
  axesColors: AxesColorMap
  setBooks: Dispatch<SetStateAction<Book[]>>
  setAuthors: Dispatch<SetStateAction<Author[]>>
}): Promise<{ newAuthors: number; updatedBooks: number } | null> {
  const { books, authors, axesColors, setBooks, setAuthors } = params
  const { newAuthors, updatedBooks } = migrateData(books, authors)
  if (newAuthors.length === 0 && updatedBooks.every((b) => !b.authorIds?.length)) {
    return { newAuthors: 0, updatedBooks: 0 }
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
  await Promise.all(
    booksToUpdate.map((book) => {
      const orig = books.find((b0) => b0.id === String(book.id))
      if (!orig) {
        return Promise.resolve({ error: null })
      }
      const merged = sanitizeBook({ ...orig, authorIds: book.authorIds }, axesColors)
      const { id, ...fields } = bookToDbRow(merged)
      return updateBookRowById(id, fields).then(({ error }) => {
        if (error) devWarn('Migration: erreur update book', id, error)
      })
    })
  )
  setBooks((prev) =>
    prev.map((orig) => {
      const u = updatedBooks.find((x) => String(x.id) === orig.id)
      if (!u) return orig
      return sanitizeBook({ ...orig, authorIds: u.authorIds }, axesColors)
    })
  )

  return { newAuthors: newAuthors.length, updatedBooks: booksToUpdate.length }
}

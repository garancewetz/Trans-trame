import { supabase } from '@/core/supabase'

/** Payload générique pour insert/update Supabase (schéma non généré). */
export type DbRow = Record<string, unknown>

export async function loadGraphDataFromSupabase() {
  const [booksRes, authorsRes, linksRes, bookAuthorsRes] = await Promise.all([
    supabase.from('books').select('*').order('created_at', { ascending: true }),
    supabase.from('authors').select('*').order('created_at', { ascending: true }),
    supabase.from('links').select('*'),
    supabase.from('book_authors').select('*'),
  ])

  return { booksRes, authorsRes, linksRes, bookAuthorsRes }
}

export function insertBookRow(row: DbRow) {
  return supabase.from('books').insert(row)
}

export function updateBookRowById(id: string, fields: DbRow) {
  return supabase.from('books').update(fields).eq('id', id)
}

export function deleteBookRowById(id: string) {
  return supabase.from('books').delete().eq('id', id)
}

export function insertAuthorRow(row: DbRow | DbRow[]) {
  return supabase.from('authors').insert(row)
}

export function updateAuthorRowById(id: string, fields: DbRow) {
  return supabase.from('authors').update(fields).eq('id', id)
}

export function deleteAuthorRowById(id: string) {
  return supabase.from('authors').delete().eq('id', id)
}

export function insertLinkRow(row: DbRow) {
  return supabase.from('links').insert(row)
}

export function updateLinkRowById(id: string, fields: DbRow) {
  return supabase.from('links').update(fields).eq('id', id)
}

export function deleteLinkRowById(id: string) {
  return supabase.from('links').delete().eq('id', id)
}

export function deleteAllBooks() {
  return supabase.from('books').delete().not('id', 'is', null)
}

// ── Book-Authors junction ─────────────────────────────────────────────────

export async function setBookAuthors(bookId: string, authorIds: string[]) {
  await supabase.from('book_authors').delete().eq('book_id', bookId)
  if (authorIds.length === 0) return { error: null }
  return supabase.from('book_authors').insert(
    authorIds.map((author_id) => ({ book_id: bookId, author_id }))
  )
}

export function insertBookAuthors(bookId: string, authorIds: string[]) {
  if (authorIds.length === 0) return Promise.resolve({ error: null })
  return supabase.from('book_authors').insert(
    authorIds.map((author_id) => ({ book_id: bookId, author_id }))
  )
}

export function deleteBookAuthorsByBookId(bookId: string) {
  return supabase.from('book_authors').delete().eq('book_id', bookId)
}

// ── JSON export helpers ──────────────────────────────────────────────────

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportFilename(suffix: string) {
  return `trans-trame-${suffix}-${new Date().toISOString().slice(0, 10)}.json`
}

export async function exportFullDatabase() {
  const { booksRes, authorsRes, linksRes, bookAuthorsRes } =
    await loadGraphDataFromSupabase()

  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      books: booksRes.data ?? [],
      authors: authorsRes.data ?? [],
      links: linksRes.data ?? [],
      bookAuthors: bookAuthorsRes.data ?? [],
    },
    exportFilename('backup'),
  )
}

export async function exportBooks() {
  const { booksRes, bookAuthorsRes } = await loadGraphDataFromSupabase()
  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      books: booksRes.data ?? [],
      bookAuthors: bookAuthorsRes.data ?? [],
    },
    exportFilename('ouvrages'),
  )
}

export async function exportAuthors() {
  const { authorsRes, bookAuthorsRes } = await loadGraphDataFromSupabase()
  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      authors: authorsRes.data ?? [],
      bookAuthors: bookAuthorsRes.data ?? [],
    },
    exportFilename('auteurs'),
  )
}

export async function exportLinks() {
  const { linksRes } = await loadGraphDataFromSupabase()
  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      links: linksRes.data ?? [],
    },
    exportFilename('liens'),
  )
}

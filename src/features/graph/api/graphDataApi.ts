import { supabase } from '@/core/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

export async function loadGraphDataFromSupabase() {
  const [booksRes, authorsRes, linksRes] = await Promise.all([
    supabase.from('books').select('*, book_authors(author_id)').is('deleted_at', null).order('created_at', { ascending: true }).limit(10000),
    supabase.from('authors').select('*').is('deleted_at', null).order('created_at', { ascending: true }).limit(10000),
    supabase.from('links').select('*').is('deleted_at', null).limit(10000),
  ])

  return { booksRes, authorsRes, linksRes }
}

export function insertBookRow(row: TablesInsert<'books'>) {
  return supabase.from('books').insert(row)
}

export function updateBookRowById(id: string, fields: TablesUpdate<'books'>) {
  return supabase.from('books').update(fields).eq('id', id)
}

export function deleteBookRowById(id: string) {
  return supabase.from('books').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export function insertAuthorRow(row: TablesInsert<'authors'>) {
  return supabase.from('authors').insert(row)
}

export function insertAuthorRows(rows: TablesInsert<'authors'>[]) {
  return supabase.from('authors').insert(rows)
}

export function updateAuthorRowById(id: string, fields: TablesUpdate<'authors'>) {
  return supabase.from('authors').update(fields).eq('id', id)
}

export function deleteAuthorRowById(id: string) {
  return supabase.from('authors').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export function insertLinkRow(row: TablesInsert<'links'>) {
  return supabase.from('links').insert(row)
}

export function updateLinkRowById(id: string, fields: TablesUpdate<'links'>) {
  return supabase.from('links').update(fields).eq('id', id)
}

export function deleteLinkRowById(id: string) {
  return supabase.from('links').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export function deleteAllBooks() {
  return supabase.from('books').update({ deleted_at: new Date().toISOString() }).not('id', 'is', null)
}

// ── Book-Authors junction ─────────────────────────────────────────────────

export async function setBookAuthors(bookId: string, authorIds: string[]) {
  const delResult = await supabase.from('book_authors').delete().eq('book_id', bookId).select()
  if (delResult.error) {
    console.warn('[setBookAuthors] delete failed for', bookId, delResult.error)
    return { error: delResult.error }
  }
  if (authorIds.length === 0) return { error: null }
  const rows = authorIds.map((author_id) => ({ book_id: bookId, author_id }))
  const insResult = await supabase.from('book_authors').insert(rows).select()
  console.info(
    `[setBookAuthors] book=${bookId} sent=${rows.length} returned=${insResult.data?.length ?? 'null'} error=${insResult.error?.message ?? 'none'}`,
  )
  if (insResult.error) {
    console.warn('[setBookAuthors] insert failed for', bookId, insResult.error)
  } else if (!insResult.data?.length) {
    console.warn('[setBookAuthors] insert returned no data — RLS may be silently blocking', bookId)
    return { error: { message: 'Insert silencieux : aucune donnée retournée (vérifier RLS)' } }
  }
  return insResult
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
  const { booksRes, authorsRes, linksRes } = await loadGraphDataFromSupabase()

  const errors = [booksRes, authorsRes, linksRes]
    .map((r) => r.error)
    .filter(Boolean)
  if (errors.length > 0) {
    console.error('[export] Certaines données n\'ont pas pu être chargées :', errors)
  }

  // Extraire book_authors depuis la relation embarquée
  const bookAuthors = (booksRes.data ?? []).flatMap((b) =>
    ((b.book_authors as { author_id: string }[] | null) ?? []).map((ba) => ({
      book_id: b.id,
      author_id: ba.author_id,
    })),
  )

  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      books: booksRes.data ?? [],
      authors: authorsRes.data ?? [],
      links: linksRes.data ?? [],
      bookAuthors,
    },
    exportFilename('backup'),
  )
}

// ── Entity name lookup (for human-readable activity log) ───────────────────

export async function loadEntityNamesForLog() {
  const [books, authors, bookAuthors] = await Promise.all([
    supabase.from('books').select('id, title'),
    supabase.from('authors').select('id, first_name, last_name'),
    supabase.from('book_authors').select('book_id, author_id'),
  ])
  return {
    books: books.data ?? [],
    authors: authors.data ?? [],
    bookAuthors: bookAuthors.data ?? [],
  }
}

// ── Activity log ────────────────────────────────────────────────────────────

export async function loadActivityLog(limit = 50, offset = 0) {
  return supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
}

export async function loadProfiles() {
  return supabase.from('profiles').select('id, first_name, last_name, email')
}

const META_FIELDS = ['created_at', 'created_by', 'updated_by', 'deleted_at']

export type ActivityLogEntry = Tables<'activity_log'>

export async function rollbackActivityEntry(entry: ActivityLogEntry) {
  const { entity_type, entity_id, operation, old_values } = entry
  const table = entity_type as 'books' | 'authors' | 'links'

  switch (operation) {
    case 'INSERT':
      return supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', entity_id)

    case 'UPDATE': {
      if (!old_values || typeof old_values !== 'object' || Array.isArray(old_values)) return null
      const fields: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(old_values)) {
        if (!META_FIELDS.includes(k)) fields[k] = v
      }
      return supabase.from(table).update(fields).eq('id', entity_id)
    }

    case 'DELETE':
      return supabase.from(table).update({ deleted_at: null }).eq('id', entity_id)

    case 'RESTORE':
      return supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', entity_id)

    default:
      return null
  }
}

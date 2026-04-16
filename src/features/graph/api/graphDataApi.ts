import { supabase } from '@/core/supabase'
import { ensureOk } from '@/core/supabaseErrors'
import { devWarn } from '@/common/utils/logger'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

/**
 * Fetches ALL rows from a Supabase query, paginated via .range() to bypass
 * PostgREST's 1000-row cap. `.limit(N)` is silently clamped to that cap by the
 * server, so any unbounded SELECT silently truncates beyond 1000 rows.
 *
 * Symptom that surfaced this bug: importing a 19-row bibliography succeeded in
 * DB but the new links never appeared in refetches — they sat past row 1000,
 * the UI showed permanent orphans, and the toast still said "success".
 *
 * `buildPage(from, to)` must return a Supabase query builder set up with the
 * correct filters/ordering plus `.range(from, to)`. We loop until a page
 * returns fewer than PAGE_SIZE rows. Capped at 100k rows as a safety net
 * against a misbehaving server returning the same page forever.
 */
const PAGE_SIZE = 1000
const PAGINATION_SAFETY_CAP = 100_000

type PageResult<Row> = { data: Row[] | null; error: { message: string } | null }

export async function fetchAllPaginated<Row>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  label: string,
): Promise<PageResult<Row>> {
  const all: Row[] = []
  let offset = 0
  while (true) {
    const { data, error } = await buildPage(offset, offset + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    if (offset >= PAGINATION_SAFETY_CAP) {
      devWarn(`[fetchAllPaginated:${label}] hit ${PAGINATION_SAFETY_CAP} safety cap — dataset truncated`)
      break
    }
  }
  return { data: all, error: null }
}

export async function loadGraphDataFromSupabase() {
  const [booksRes, authorsRes, linksRes] = await Promise.all([
    fetchAllPaginated(
      (from, to) => supabase
        .from('books')
        .select('*, book_authors(author_id)')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, to),
      'books',
    ),
    fetchAllPaginated(
      (from, to) => supabase
        .from('authors')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, to),
      'authors',
    ),
    fetchAllPaginated(
      (from, to) => supabase
        .from('links')
        .select('*')
        .is('deleted_at', null)
        .range(from, to),
      'links',
    ),
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

export function insertLinkRows(rows: TablesInsert<'links'>[]) {
  // .select('id') forces PostgREST to return the persisted rows. Without it,
  // a successful HTTP response doesn't guarantee the rows were actually written
  // (silent drops, partial inserts). Count-matching the response IDs against
  // what we sent is the only reliable confirmation from the client side.
  return supabase.from('links').insert(rows).select('id')
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
    devWarn('[setBookAuthors] delete failed', { bookId, error: delResult.error })
    return { error: delResult.error }
  }
  if (authorIds.length === 0) return { error: null }
  const rows = authorIds.map((author_id) => ({ book_id: bookId, author_id }))
  const insResult = await supabase.from('book_authors').insert(rows).select()
  if (insResult.error) {
    devWarn('[setBookAuthors] insert failed', { bookId, error: insResult.error })
    return { error: insResult.error }
  }
  if (!insResult.data?.length) {
    devWarn('[setBookAuthors] insert returned no data — RLS may be silently blocking', { bookId })
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

  // Refuse to export a partial backup — silently dropping rows would lead users
  // to trust an incomplete snapshot.
  const books = ensureOk(booksRes, 'export: books')
  const authors = ensureOk(authorsRes, 'export: authors')
  const links = ensureOk(linksRes, 'export: links')

  // Extraire book_authors depuis la relation embarquée
  const bookAuthors = (books ?? []).flatMap((b) =>
    ((b.book_authors as { author_id: string }[] | null) ?? []).map((ba) => ({
      book_id: b.id,
      author_id: ba.author_id,
    })),
  )

  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      books: books ?? [],
      authors: authors ?? [],
      links: links ?? [],
      bookAuthors,
    },
    exportFilename('backup'),
  )
}

// ── Entity name lookup (for human-readable activity log) ───────────────────
// Paginated: above 1000 entities the history tab would otherwise show "[unknown]"
// for the most recent items (whose IDs landed past the truncated page).

export async function loadEntityNamesForLog() {
  const [booksRes, authorsRes, bookAuthorsRes] = await Promise.all([
    fetchAllPaginated(
      (from, to) => supabase.from('books').select('id, title').range(from, to),
      'entityNames:books',
    ),
    fetchAllPaginated(
      (from, to) => supabase.from('authors').select('id, first_name, last_name').range(from, to),
      'entityNames:authors',
    ),
    fetchAllPaginated(
      (from, to) => supabase.from('book_authors').select('book_id, author_id').range(from, to),
      'entityNames:bookAuthors',
    ),
  ])
  return {
    books: ensureOk(booksRes, 'loadEntityNamesForLog: books') ?? [],
    authors: ensureOk(authorsRes, 'loadEntityNamesForLog: authors') ?? [],
    bookAuthors: ensureOk(bookAuthorsRes, 'loadEntityNamesForLog: bookAuthors') ?? [],
  }
}

// ── Activity log ────────────────────────────────────────────────────────────

export async function loadActivityLog(limit = 50, offset = 0): Promise<ActivityLogEntry[]> {
  const res = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return ensureOk(res, 'loadActivityLog') ?? []
}

export async function loadProfiles() {
  // Whitelisted-users table — typically tiny, but paginated for consistency
  // and to survive the day someone opens the platform to a real user base.
  const res = await fetchAllPaginated(
    (from, to) => supabase.from('profiles').select('id, first_name, last_name, email').range(from, to),
    'profiles',
  )
  return ensureOk(res, 'loadProfiles') ?? []
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

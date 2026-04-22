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
  const [booksRes, authorsRes, linksRes, citationsRes, notDupPairsRes] = await Promise.all([
    fetchAllPaginated(
      (from, to) => supabase
        .from('resources')
        .select('*, resource_authors(author_id)')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, to),
      'resources',
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
    fetchAllPaginated(
      (from, to) => supabase
        .from('link_citations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, to),
      'link_citations',
    ),
    fetchAllPaginated(
      (from, to) => supabase
        .from('author_not_duplicate_pairs')
        .select('author_a_id, author_b_id')
        .range(from, to),
      'author_not_duplicate_pairs',
    ),
  ])

  return { booksRes, authorsRes, linksRes, citationsRes, notDupPairsRes }
}

export function insertResourceRow(row: TablesInsert<'resources'>) {
  return supabase.from('resources').insert(row).select('id')
}

export function updateResourceRowById(id: string, fields: TablesUpdate<'resources'>) {
  return supabase.from('resources').update(fields).eq('id', id)
}

export function deleteResourceRowById(id: string) {
  return supabase.from('resources').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export function insertAuthorRow(row: TablesInsert<'authors'>) {
  return supabase.from('authors').insert(row).select('id')
}

export function insertAuthorRows(rows: TablesInsert<'authors'>[]) {
  return supabase.from('authors').insert(rows).select('id')
}

export function updateAuthorRowById(id: string, fields: TablesUpdate<'authors'>) {
  return supabase.from('authors').update(fields).eq('id', id)
}

export function deleteAuthorRowById(id: string) {
  return supabase.from('authors').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

// ── Author not-duplicate pairs (homonym false positives) ───────────────────
// Canonical order: author_a_id < author_b_id is enforced both at insert time
// (here) and at the DB level via CHECK constraint. Callers can pass any order.

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export function insertAuthorNotDuplicatePair(a: string, b: string) {
  const [author_a_id, author_b_id] = canonicalPair(a, b)
  return supabase
    .from('author_not_duplicate_pairs')
    .insert({ author_a_id, author_b_id })
}

export function deleteAuthorNotDuplicatePair(a: string, b: string) {
  const [author_a_id, author_b_id] = canonicalPair(a, b)
  return supabase
    .from('author_not_duplicate_pairs')
    .delete()
    .eq('author_a_id', author_a_id)
    .eq('author_b_id', author_b_id)
}

export function insertLinkRow(row: TablesInsert<'links'>) {
  return supabase.from('links').insert(row).select('id')
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

/** Soft-deletes many links in a single request. */
export function deleteLinkRowsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve({ data: null, error: null })
  return supabase.from('links').update({ deleted_at: new Date().toISOString() }).in('id', ids)
}

// ── link_citations CRUD ────────────────────────────────────────────────────
//
// Multiple citations (page/edition/context/citation_text) can coexist under
// a single links row since migration 20260418_link_citations_subtable. Each
// citation is an independent row with its own audit trail and soft-delete.

export function insertLinkCitationRow(row: TablesInsert<'link_citations'>) {
  return supabase.from('link_citations').insert(row).select()
}

export function insertLinkCitationRows(rows: TablesInsert<'link_citations'>[]) {
  return supabase.from('link_citations').insert(rows).select()
}

export function updateLinkCitationRowById(id: string, fields: TablesUpdate<'link_citations'>) {
  return supabase.from('link_citations').update(fields).eq('id', id)
}

export function deleteLinkCitationRowById(id: string) {
  return supabase.from('link_citations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

/** Soft-deletes all resources. Does NOT touch links or authors — callers must
 *  handle those separately or rely on the UI clearing local state. */
export function deleteAllResources() {
  return supabase.from('resources').update({ deleted_at: new Date().toISOString() }).not('id', 'is', null)
}

// ── Resource-Authors junction ─────────────────────────────────────────────

/** Pure diff: which author IDs to add vs remove so that current → target. */
export function diffAuthorIds(current: readonly string[], target: readonly string[]) {
  const currentSet = new Set(current)
  const targetSet = new Set(target)
  const toAdd = [...targetSet].filter((id) => !currentSet.has(id))
  const toRemove = [...currentSet].filter((id) => !targetSet.has(id))
  return { toAdd, toRemove }
}

// Diff-based sync: read current, compute added/removed, INSERT first then DELETE.
// The naive delete-all-then-insert approach loses every author if the INSERT fails
// after the DELETE succeeds (network blip, transient RLS hiccup). Ordering insert
// before delete means a mid-operation failure leaves a recoverable surplus rather
// than a destructive gap — the next save self-heals.
export async function setResourceAuthors(resourceId: string, authorIds: string[]) {
  const currentRes = await supabase
    .from('resource_authors')
    .select('author_id')
    .eq('resource_id', resourceId)
  if (currentRes.error) {
    devWarn('[setResourceAuthors] read current failed', { resourceId, error: currentRes.error })
    return { error: currentRes.error }
  }

  const { toAdd, toRemove } = diffAuthorIds(
    (currentRes.data ?? []).map((r) => r.author_id),
    authorIds,
  )

  if (toAdd.length === 0 && toRemove.length === 0) return { error: null }

  if (toAdd.length > 0) {
    const rows = toAdd.map((author_id) => ({ resource_id: resourceId, author_id }))
    const insResult = await supabase.from('resource_authors').insert(rows).select()
    if (insResult.error) {
      devWarn('[setResourceAuthors] insert failed', { resourceId, error: insResult.error })
      return { error: insResult.error }
    }
    if (!insResult.data?.length) {
      devWarn('[setResourceAuthors] insert returned no data — RLS may be silently blocking', { resourceId })
      return { error: { message: 'Insert silencieux : aucune donnée retournée (vérifier RLS)' } }
    }
  }

  if (toRemove.length > 0) {
    const delResult = await supabase
      .from('resource_authors')
      .delete()
      .eq('resource_id', resourceId)
      .in('author_id', toRemove)
    if (delResult.error) {
      devWarn('[setResourceAuthors] delete failed', { resourceId, error: delResult.error })
      return { error: delResult.error }
    }
  }

  return { error: null }
}

export function insertResourceAuthors(resourceId: string, authorIds: string[]) {
  if (authorIds.length === 0) return Promise.resolve({ data: null, error: null })
  return supabase.from('resource_authors').insert(
    authorIds.map((author_id) => ({ resource_id: resourceId, author_id }))
  ).select()
}

export function deleteResourceAuthorsByResourceId(resourceId: string) {
  return supabase.from('resource_authors').delete().eq('resource_id', resourceId)
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
  const resources = ensureOk(booksRes, 'export: resources')
  const authors = ensureOk(authorsRes, 'export: authors')
  const links = ensureOk(linksRes, 'export: links')

  // Extraire resource_authors depuis la relation embarquée
  const resourceAuthors = (resources ?? []).flatMap((r) =>
    ((r.resource_authors as { author_id: string }[] | null) ?? []).map((ra) => ({
      resource_id: r.id,
      author_id: ra.author_id,
    })),
  )

  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      resources: resources ?? [],
      authors: authors ?? [],
      links: links ?? [],
      resourceAuthors,
    },
    exportFilename('backup'),
  )
}

// ── Entity name lookup (for human-readable activity log) ───────────────────
// Paginated: above 1000 entities the history tab would otherwise show "[unknown]"
// for the most recent items (whose IDs landed past the truncated page).
//
// No explicit deleted_at filter: the RLS SELECT policy already hides soft-deleted
// rows. For deleted entities, the activity log falls back to old_values/new_values
// JSONB stored in the log entry itself.

export async function loadEntityNamesForLog() {
  const [resourcesRes, authorsRes, resourceAuthorsRes] = await Promise.all([
    fetchAllPaginated(
      (from, to) => supabase.from('resources').select('id, title').range(from, to),
      'entityNames:resources',
    ),
    fetchAllPaginated(
      (from, to) => supabase.from('authors').select('id, first_name, last_name').range(from, to),
      'entityNames:authors',
    ),
    fetchAllPaginated(
      (from, to) => supabase.from('resource_authors').select('resource_id, author_id').range(from, to),
      'entityNames:resourceAuthors',
    ),
  ])
  return {
    books: ensureOk(resourcesRes, 'loadEntityNamesForLog: resources') ?? [],
    authors: ensureOk(authorsRes, 'loadEntityNamesForLog: authors') ?? [],
    bookAuthors: ensureOk(resourceAuthorsRes, 'loadEntityNamesForLog: resourceAuthors') ?? [],
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

/** Returns a map resourceId → last-known title for soft-deleted resources.
 *  The resources_select RLS policy hides soft-deleted rows from the resources
 *  table, but the audit trigger preserved the title in old_values at delete
 *  time. Checks both 'resources' (new) and 'books' (historical) entity_type.
 *  Iterates newest-first so that the first DELETE entry wins if a resource was
 *  deleted-restored-deleted again. */
export async function loadDeletedBookTitles(): Promise<Map<string, string>> {
  const res = await fetchAllPaginated(
    (from, to) =>
      supabase
        .from('activity_log')
        .select('entity_id, old_values, created_at')
        .in('entity_type', ['resources', 'books'])
        .eq('operation', 'DELETE')
        .order('created_at', { ascending: false })
        .range(from, to),
    'deletedBookTitles',
  )
  const entries = ensureOk(res, 'loadDeletedBookTitles') ?? []
  const map = new Map<string, string>()
  for (const e of entries) {
    if (map.has(e.entity_id)) continue
    const ov = e.old_values as { title?: unknown } | null
    const title = ov?.title
    if (typeof title === 'string' && title.trim()) map.set(e.entity_id, title)
  }
  return map
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
  const tableRaw = entity_type === 'books' ? 'resources' : entity_type
  const table = tableRaw as 'resources' | 'authors' | 'links'

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

/** Rolls back a batch of log entries newest-first. Continues on failure and
 *  reports per-entry outcomes so callers can tell the user exactly how many
 *  actions reverted when a partial failure occurs. Entries MUST be passed in
 *  newest-first order (the order the session struct already exposes). */
export async function rollbackActivitySession(entries: ActivityLogEntry[]) {
  const results: { entry: ActivityLogEntry; ok: boolean; error?: string }[] = []
  for (const entry of entries) {
    try {
      const res = await rollbackActivityEntry(entry)
      if (res === null) {
        results.push({ entry, ok: true })
      } else if (res.error) {
        results.push({ entry, ok: false, error: res.error.message })
      } else {
        results.push({ entry, ok: true })
      }
    } catch (e) {
      results.push({
        entry,
        ok: false,
        error: e instanceof Error ? e.message : 'Erreur inconnue',
      })
    }
  }
  return results
}

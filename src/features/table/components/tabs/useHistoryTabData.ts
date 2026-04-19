import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Link2, Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  loadActivityLog,
  loadEntityNamesForLog,
  loadProfiles,
  rollbackActivityEntry,
  rollbackActivitySession,
} from '@/features/graph/api/graphDataApi'
import type { ActivityLogEntry } from '@/features/graph/api/graphDataApi'
import type { Json } from '@/types/supabase'
import { DATASET_QUERY_KEY } from '@/features/graph/api/queryKeys'

const PAGE_SIZE = 50

// Events that land within this window and share an actor are considered part
// of the same "session" (e.g. bulk import, sequence of related edits).
const SESSION_GAP_MS = 10_000

export type ActivitySession = {
  id: string
  actor: string | null
  newestAt: string
  oldestAt: string
  entries: ActivityLogEntry[]
  counts: { books: number; authors: number; links: number }
  ops: { INSERT: number; UPDATE: number; DELETE: number; RESTORE: number }
}

/** Groups a newest-first list of entries into contiguous sessions by actor +
 *  time proximity. Works on pre-filtered entries too: the gap heuristic still
 *  holds when some events are hidden by the search query. */
export function buildActivitySessions(entries: ActivityLogEntry[]): ActivitySession[] {
  const out: ActivitySession[] = []
  for (const entry of entries) {
    const last = out[out.length - 1]
    const ts = new Date(entry.created_at).getTime()
    const canExtend =
      last !== undefined &&
      last.actor === entry.created_by &&
      new Date(last.oldestAt).getTime() - ts <= SESSION_GAP_MS
    if (canExtend) {
      last.entries.push(entry)
      last.oldestAt = entry.created_at
      if (entry.entity_type === 'books' || entry.entity_type === 'resources') last.counts.books++
      else if (entry.entity_type === 'authors') last.counts.authors++
      else if (entry.entity_type === 'links') last.counts.links++
      if (entry.operation === 'INSERT') last.ops.INSERT++
      else if (entry.operation === 'UPDATE') last.ops.UPDATE++
      else if (entry.operation === 'DELETE') last.ops.DELETE++
      else if (entry.operation === 'RESTORE') last.ops.RESTORE++
    } else {
      out.push({
        id: entry.id,
        actor: entry.created_by,
        newestAt: entry.created_at,
        oldestAt: entry.created_at,
        entries: [entry],
        counts: {
          books: (entry.entity_type === 'books' || entry.entity_type === 'resources') ? 1 : 0,
          authors: entry.entity_type === 'authors' ? 1 : 0,
          links: entry.entity_type === 'links' ? 1 : 0,
        },
        ops: {
          INSERT: entry.operation === 'INSERT' ? 1 : 0,
          UPDATE: entry.operation === 'UPDATE' ? 1 : 0,
          DELETE: entry.operation === 'DELETE' ? 1 : 0,
          RESTORE: entry.operation === 'RESTORE' ? 1 : 0,
        },
      })
    }
  }
  return out
}

export type Profile = { id: string; first_name: string; last_name: string; email: string }

// ── Config maps ─────────────────────────────────────────────────────────────

export const OP_CONFIG: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  INSERT:  { icon: Plus,      color: 'text-green/80',  label: 'a ajouté' },
  UPDATE:  { icon: Pencil,    color: 'text-cyan/80',   label: 'a modifié' },
  DELETE:  { icon: Trash2,    color: 'text-red/80',    label: 'a supprimé' },
  RESTORE: { icon: RotateCcw, color: 'text-amber/80',  label: 'a restauré' },
}

export const ENTITY_CONFIG: Record<string, { icon: typeof Plus; label: string }> = {
  resources: { icon: BookOpen, label: 'ressource' },
  books:     { icon: BookOpen, label: 'ressource' },
  authors:   { icon: Users,    label: 'auteur·ice' },
  links:     { icon: Link2,    label: 'lien' },
}

// ── Label helpers ───────────────────────────────────────────────────────────

export function bookLabel(
  bookId: string,
  namesMap: Map<string, string>,
  bookAuthorsMap: Map<string, string[]>,
): string {
  const title = namesMap.get(bookId) || '?'
  const authorIds = bookAuthorsMap.get(bookId)
  if (authorIds?.length) {
    const names = authorIds.map((id) => namesMap.get(id)).filter(Boolean)
    if (names.length) return `${title} — ${names.join(', ')}`
  }
  return title
}

export function entityTitle(
  entry: ActivityLogEntry,
  namesMap: Map<string, string>,
  bookAuthorsMap: Map<string, string[]>,
): string {
  const vals = (entry.operation === 'DELETE' ? entry.old_values : entry.new_values) as Record<string, Json> | null
  if (!vals) return entry.entity_id

  if (entry.entity_type === 'books' || entry.entity_type === 'resources') {
    const title = (vals.title as string) || entry.entity_id
    const authorIds = bookAuthorsMap.get(entry.entity_id)
    if (authorIds?.length) {
      const names = authorIds.map((id) => namesMap.get(id)).filter(Boolean)
      if (names.length) return `${title} — ${names.join(', ')}`
    }
    return title
  }
  if (entry.entity_type === 'authors') {
    const parts = [vals.first_name, vals.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : entry.entity_id
  }
  if (entry.entity_type === 'links') {
    const src = vals.source_id as string | undefined
    const tgt = vals.target_id as string | undefined
    return `${bookLabel(src ?? '', namesMap, bookAuthorsMap)} → ${bookLabel(tgt ?? '', namesMap, bookAuthorsMap)}`
  }
  return entry.entity_id
}

export function changedFields(entry: ActivityLogEntry): Array<{ field: string; from: unknown; to: unknown }> {
  if (entry.operation !== 'UPDATE') return []
  const old = entry.old_values as Record<string, Json> | null
  const cur = entry.new_values as Record<string, Json> | null
  if (!old || !cur) return []

  const META = new Set(['created_at', 'created_by', 'updated_by', 'deleted_at'])
  const diffs: Array<{ field: string; from: unknown; to: unknown }> = []
  for (const key of Object.keys(cur)) {
    if (META.has(key)) continue
    if (JSON.stringify(old[key]) !== JSON.stringify(cur[key])) {
      diffs.push({ field: key, from: old[key], to: cur[key] })
    }
  }
  return diffs
}

export function actorName(createdBy: string | null, profilesMap: Map<string, Profile>): string {
  if (!createdBy) return 'Inconnu'
  const p = profilesMap.get(createdBy)
  if (!p) return 'Utilisateur'
  const parts = [p.first_name, p.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  if (p.email) return p.email.split('@')[0]
  return 'Utilisateur'
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHistoryTabData() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [allEntries, setAllEntries] = useState<ActivityLogEntry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null)
  const [rollingBackSessionId, setRollingBackSessionId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: logData, isLoading: logLoading, error: logError } = useQuery({
    queryKey: ['activity_log', page],
    queryFn: () => loadActivityLog(PAGE_SIZE, page * PAGE_SIZE),
  })

  const { data: profilesData, error: profilesError } = useQuery({
    queryKey: ['profiles_all'],
    queryFn: loadProfiles,
    staleTime: 5 * 60 * 1000,
  })

  const { data: entityNamesData, error: entityNamesError } = useQuery({
    queryKey: ['entity_names_for_log'],
    queryFn: loadEntityNamesForLog,
    staleTime: 5 * 60 * 1000,
  })

  // Surface query failures to the user. Each `toast.error` is keyed by its
  // message so retries don't spam duplicate toasts.
  useEffect(() => {
    if (logError) toast.error(`Impossible de charger l'historique : ${logError.message}`, { id: 'history-log-error' })
  }, [logError])
  useEffect(() => {
    if (profilesError) toast.error('Impossible de charger les profils', { id: 'history-profiles-error' })
  }, [profilesError])
  useEffect(() => {
    if (entityNamesError) toast.error('Impossible de charger les noms des entités', { id: 'history-entity-names-error' })
  }, [entityNamesError])

  useEffect(() => {
    if (!logData) return
    setAllEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id))
      const newEntries = logData.filter((e) => !existingIds.has(e.id))
      return [...prev, ...newEntries]
    })
    if (logData.length < PAGE_SIZE) setHasMore(false)
  }, [logData])

  const profilesMap = useMemo(() => {
    const map = new Map<string, Profile>()
    if (profilesData) {
      for (const p of profilesData) map.set(p.id, p)
    }
    return map
  }, [profilesData])

  const entityNamesMap = useMemo(() => {
    const map = new Map<string, string>()
    if (entityNamesData) {
      for (const b of entityNamesData.books) map.set(b.id, b.title || b.id)
      for (const a of entityNamesData.authors) {
        const name = [a.first_name, a.last_name].filter(Boolean).join(' ')
        map.set(a.id, name || a.id)
      }
    }
    return map
  }, [entityNamesData])

  const bookAuthorsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (entityNamesData) {
      for (const ba of entityNamesData.bookAuthors) {
        const list = map.get(ba.resource_id) ?? []
        list.push(ba.author_id)
        map.set(ba.resource_id, list)
      }
    }
    return map
  }, [entityNamesData])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allEntries
    return allEntries.filter((entry) => {
      const actor = actorName(entry.created_by, profilesMap).toLowerCase()
      const title = entityTitle(entry, entityNamesMap, bookAuthorsMap).toLowerCase()
      const op = OP_CONFIG[entry.operation]?.label ?? ''
      const entity = ENTITY_CONFIG[entry.entity_type]?.label ?? entry.entity_type
      return (
        actor.includes(q) ||
        title.includes(q) ||
        op.includes(q) ||
        entity.includes(q)
      )
    })
  }, [allEntries, search, profilesMap, entityNamesMap, bookAuthorsMap])

  const filteredSessions = useMemo(
    () => buildActivitySessions(filteredEntries),
    [filteredEntries],
  )

  const handleRollback = useCallback(async (entry: ActivityLogEntry) => {
    if (confirmingId !== entry.id) {
      setConfirmingId(entry.id)
      return
    }
    setConfirmingId(null)
    setRollingBackId(entry.id)
    try {
      const result = await rollbackActivityEntry(entry)
      if (result?.error) {
        toast.error(`Echec du rollback : ${result.error.message}`)
        return
      }
      toast.success('Action annulée')
      queryClient.invalidateQueries({ queryKey: ['activity_log'] })
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })
      setAllEntries([])
      setPage(0)
      setHasMore(true)
    } catch {
      toast.error('Echec du rollback')
    } finally {
      setRollingBackId(null)
    }
  }, [confirmingId, queryClient])

  // Reset confirm state when clicking elsewhere
  useEffect(() => {
    if (!confirmingId) return
    const timer = setTimeout(() => setConfirmingId(null), 4000)
    return () => clearTimeout(timer)
  }, [confirmingId])

  useEffect(() => {
    if (!confirmingSessionId) return
    const timer = setTimeout(() => setConfirmingSessionId(null), 4000)
    return () => clearTimeout(timer)
  }, [confirmingSessionId])

  const handleRollbackSession = useCallback(async (session: ActivitySession) => {
    if (confirmingSessionId !== session.id) {
      setConfirmingSessionId(session.id)
      return
    }
    setConfirmingSessionId(null)
    setRollingBackSessionId(session.id)
    try {
      const results = await rollbackActivitySession(session.entries)
      const failed = results.filter((r) => !r.ok)
      const ok = results.length - failed.length
      if (failed.length === 0) {
        toast.success(`Session annulée (${ok} action${ok > 1 ? 's' : ''})`)
      } else {
        toast.error(
          `Session annulée partiellement : ${ok}/${results.length} réussies, ${failed.length} échec${failed.length > 1 ? 's' : ''}`,
          { duration: 8000 },
        )
      }
      queryClient.invalidateQueries({ queryKey: ['activity_log'] })
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })
      setAllEntries([])
      setPage(0)
      setHasMore(true)
    } catch {
      toast.error("Echec du rollback de la session")
    } finally {
      setRollingBackSessionId(null)
    }
  }, [confirmingSessionId, queryClient])

  return {
    search,
    setSearch,
    filteredEntries,
    filteredSessions,
    allEntries,
    logLoading,
    hasMore,
    page,
    setPage,
    confirmingId,
    rollingBackId,
    handleRollback,
    confirmingSessionId,
    rollingBackSessionId,
    handleRollbackSession,
    profilesMap,
    entityNamesMap,
    bookAuthorsMap,
  }
}

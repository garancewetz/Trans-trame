import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Link2, Loader2, Pencil, Plus, RotateCcw, Trash2, Undo2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/Button'
import { timeAgo } from '@/common/utils/timeAgo'
import {
  loadActivityLog,
  loadEntityNamesForLog,
  loadProfiles,
  rollbackActivityEntry,
} from '@/features/graph/api/graphDataApi'
import type { ActivityLogEntry } from '@/features/graph/api/graphDataApi'
import type { Json } from '@/types/supabase'
import { DATASET_QUERY_KEY } from '@/features/graph/api/queryKeys'

const PAGE_SIZE = 50

type Profile = { id: string; first_name: string; last_name: string; email: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

const OP_CONFIG: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  INSERT:  { icon: Plus,      color: 'text-green/80',  label: 'a ajouté' },
  UPDATE:  { icon: Pencil,    color: 'text-cyan/80',   label: 'a modifié' },
  DELETE:  { icon: Trash2,    color: 'text-red/80',    label: 'a supprimé' },
  RESTORE: { icon: RotateCcw, color: 'text-amber/80',  label: 'a restauré' },
}

const ENTITY_CONFIG: Record<string, { icon: typeof Plus; label: string }> = {
  books:   { icon: BookOpen, label: 'ouvrage' },
  authors: { icon: Users,    label: 'auteur·ice' },
  links:   { icon: Link2,    label: 'lien' },
}

function entityTitle(entry: ActivityLogEntry, namesMap: Map<string, string>): string {
  const vals = (entry.operation === 'DELETE' ? entry.old_values : entry.new_values) as Record<string, Json> | null
  if (!vals) return entry.entity_id

  if (entry.entity_type === 'books') {
    return (vals.title as string) || entry.entity_id
  }
  if (entry.entity_type === 'authors') {
    const parts = [vals.first_name, vals.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : entry.entity_id
  }
  if (entry.entity_type === 'links') {
    const src = vals.source_id as string | undefined
    const tgt = vals.target_id as string | undefined
    return `${(src && namesMap.get(src)) || '?'} → ${(tgt && namesMap.get(tgt)) || '?'}`
  }
  return entry.entity_id
}

function changedFields(entry: ActivityLogEntry): Array<{ field: string; from: unknown; to: unknown }> {
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

function actorName(createdBy: string | null, profilesMap: Map<string, Profile>): string {
  if (!createdBy) return 'Inconnu'
  const p = profilesMap.get(createdBy)
  if (!p) return 'Utilisateur'
  const parts = [p.first_name, p.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  if (p.email) return p.email.split('@')[0]
  return 'Utilisateur'
}

// ── Component ────────────────────────────────────────────────────────────────

export function HistoryTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [allEntries, setAllEntries] = useState<ActivityLogEntry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ['activity_log', page],
    queryFn: () => loadActivityLog(PAGE_SIZE, page * PAGE_SIZE),
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles_all'],
    queryFn: loadProfiles,
    staleTime: 5 * 60 * 1000,
  })

  const { data: entityNamesData } = useQuery({
    queryKey: ['entity_names_for_log'],
    queryFn: loadEntityNamesForLog,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!logData?.data) return
    setAllEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id))
      const newEntries = logData.data.filter((e) => !existingIds.has(e.id))
      return [...prev, ...newEntries]
    })
    if (logData.data.length < PAGE_SIZE) setHasMore(false)
  }, [logData])

  const profilesMap = useMemo(() => {
    const map = new Map<string, Profile>()
    if (profilesData?.data) {
      for (const p of profilesData.data) map.set(p.id, p)
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

  if (logLoading && allEntries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/40">
        <Loader2 size={20} className="animate-spin" />
        <span className="ml-2">Chargement de l'historique...</span>
      </div>
    )
  }

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/30 text-sm">
        Aucun événement enregistré.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        {allEntries.map((entry) => {
          const config = OP_CONFIG[entry.operation] ?? OP_CONFIG.UPDATE
          const Icon = config.icon
          const diffs = changedFields(entry)
          const isConfirming = confirmingId === entry.id
          const isRollingBack = rollingBackId === entry.id

          return (
            <div
              key={entry.id}
              className="group flex gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3 transition-colors hover:bg-white/5"
            >
              <div className={`mt-0.5 shrink-0 ${config.color}`}>
                <Icon size={14} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[0.85rem]">
                  <span className="font-medium text-white/70">
                    {actorName(entry.created_by, profilesMap)}
                  </span>
                  <span className={config.color}>{config.label}</span>
                  {(() => {
                    const ec = ENTITY_CONFIG[entry.entity_type]
                    if (!ec) return <span className="text-white/40">{entry.entity_type}</span>
                    const EntityIcon = ec.icon
                    return (
                      <span className="inline-flex items-center gap-1 text-white/40">
                        <EntityIcon size={12} />
                        {ec.label}
                      </span>
                    )
                  })()}
                </div>

                <div className="text-[0.8rem] font-medium text-white/55">
                  {entityTitle(entry, entityNamesMap)}
                </div>

                {diffs.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5 text-[0.75rem]">
                    {diffs.slice(0, 5).map((d) => {
                      const resolveVal = (v: unknown) => {
                        const s = String(v ?? '')
                        return entityNamesMap.get(s) ?? s
                      }
                      return (
                        <div key={d.field} className="flex flex-wrap items-baseline gap-1 text-white/35">
                          <span className="font-mono text-white/25">{d.field}</span>
                          <span className="text-red/50 line-through break-all">
                            {resolveVal(d.from)}
                          </span>
                          <span className="text-white/15">{'\u2192'}</span>
                          <span className="text-green/50 break-all">
                            {resolveVal(d.to)}
                          </span>
                        </div>
                      )
                    })}
                    {diffs.length > 5 && (
                      <span className="text-white/20">+{diffs.length - 5} autre(s)</span>
                    )}
                  </div>
                )}

                <div className="mt-1 text-[0.72rem] text-white/20">
                  {timeAgo(entry.created_at)}
                </div>
              </div>

              <div className="flex shrink-0 items-start">
                <Button
                  type="button"
                  variant="outline"
                  outlineWeight="muted"
                  tone={isConfirming ? 'warning' : 'neutral'}
                  icon={isRollingBack ? <Loader2 size={11} className="animate-spin" /> : <Undo2 size={11} />}
                  onClick={() => handleRollback(entry)}
                  disabled={isRollingBack}
                  className="text-[0.75rem] opacity-0 transition-opacity group-hover:opacity-100 data-confirming:opacity-100"
                  data-confirming={isConfirming || undefined}
                >
                  {isConfirming ? 'Confirmer ?' : 'Annuler'}
                </Button>
              </div>
            </div>
          )
        })}

        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            tone="muted"
            className="mx-auto mt-2 text-[0.8rem]"
            onClick={() => setPage((p) => p + 1)}
            disabled={logLoading}
          >
            {logLoading ? 'Chargement...' : 'Charger plus'}
          </Button>
        )}
      </div>
    </div>
  )
}

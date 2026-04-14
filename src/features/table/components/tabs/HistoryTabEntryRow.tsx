import { Loader2, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/common/components/ui/Button'
import { timeAgo } from '@/common/utils/timeAgo'
import type { ActivityLogEntry } from '@/features/graph/api/graphDataApi'
import {
  OP_CONFIG,
  ENTITY_CONFIG,
  actorName,
  bookLabel,
  changedFields,
  entityTitle,
} from './useHistoryTabData'
import type { Profile } from './useHistoryTabData'

type HistoryTabEntryRowProps = {
  entry: ActivityLogEntry
  profilesMap: Map<string, Profile>
  entityNamesMap: Map<string, string>
  bookAuthorsMap: Map<string, string[]>
  isConfirming: boolean
  isRollingBack: boolean
  onRollback: (entry: ActivityLogEntry) => void
}

export function HistoryTabEntryRow({
  entry,
  profilesMap,
  entityNamesMap,
  bookAuthorsMap,
  isConfirming,
  isRollingBack,
  onRollback,
}: HistoryTabEntryRowProps) {
  const config = OP_CONFIG[entry.operation] ?? OP_CONFIG.UPDATE
  const Icon = config.icon
  const diffs = changedFields(entry)

  return (
    <div className="group flex gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3 transition-colors hover:bg-white/5">
      <div className={clsx('mt-0.5 shrink-0', config.color)}>
        <Icon size={14} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-ui">
          <span className="font-medium text-white/70">
            {actorName(entry.created_by, profilesMap)}
          </span>
          <span className={config.color}>{config.label}</span>
          <EntityBadge entityType={entry.entity_type} />
        </div>

        <div className="text-[0.8rem] font-medium text-white/55">
          {entityTitle(entry, entityNamesMap, bookAuthorsMap)}
        </div>

        {diffs.length > 0 && (
          <DiffList diffs={diffs} entityNamesMap={entityNamesMap} bookAuthorsMap={bookAuthorsMap} />
        )}

        <div className="mt-1 text-micro text-white/20">
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
          onClick={() => onRollback(entry)}
          disabled={isRollingBack}
          className="text-caption opacity-0 transition-opacity group-hover:opacity-100 data-confirming:opacity-100"
          data-confirming={isConfirming || undefined}
        >
          {isConfirming ? 'Confirmer ?' : 'Annuler'}
        </Button>
      </div>
    </div>
  )
}

// ── Small sub-parts ─────────────────────────────────────────────────────────

function EntityBadge({ entityType }: { entityType: string }) {
  const ec = ENTITY_CONFIG[entityType]
  if (!ec) return <span className="text-white/40">{entityType}</span>
  const EntityIcon = ec.icon
  return (
    <span className="inline-flex items-center gap-1 text-white/40">
      <EntityIcon size={12} />
      {ec.label}
    </span>
  )
}

type DiffListProps = {
  diffs: Array<{ field: string; from: unknown; to: unknown }>
  entityNamesMap: Map<string, string>
  bookAuthorsMap: Map<string, string[]>
}

function DiffList({ diffs, entityNamesMap, bookAuthorsMap }: DiffListProps) {
  const resolveVal = (v: unknown) => {
    const s = String(v ?? '')
    if (bookAuthorsMap.has(s)) return bookLabel(s, entityNamesMap, bookAuthorsMap)
    return entityNamesMap.get(s) ?? s
  }

  return (
    <div className="mt-1 flex flex-col gap-0.5 text-caption">
      {diffs.slice(0, 5).map((d) => (
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
      ))}
      {diffs.length > 5 && (
        <span className="text-white/20">+{diffs.length - 5} autre(s)</span>
      )}
    </div>
  )
}

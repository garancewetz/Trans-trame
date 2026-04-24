import { useState } from 'react'
import type { MouseEvent } from 'react'
import { BookOpen, ChevronRight, Link2, Loader2, Undo2, Users } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/common/components/ui/Button'
import { timeAgo } from '@/common/utils/timeAgo'
import type { ActivityLogEntry } from '@/features/graph/api/graphDataApi'
import { HistoryTabEntryRow } from './HistoryTabEntryRow'
import { actorName, OP_CONFIG } from './useHistoryTabData'
import type { ActivitySession, Profile } from './useHistoryTabData'

type HistoryTabSessionProps = {
  session: ActivitySession
  profilesMap: Map<string, Profile>
  entityNamesMap: Map<string, string>
  bookAuthorsMap: Map<string, string[]>
  confirmingEntryId: string | null
  rollingBackEntryId: string | null
  onRollbackEntry: (entry: ActivityLogEntry) => void
  isConfirmingSession: boolean
  isRollingBackSession: boolean
  onRollbackSession: (session: ActivitySession) => void
}

export function HistoryTabSession({
  session,
  profilesMap,
  entityNamesMap,
  bookAuthorsMap,
  confirmingEntryId,
  rollingBackEntryId,
  onRollbackEntry,
  isConfirmingSession,
  isRollingBackSession,
  onRollbackSession,
}: HistoryTabSessionProps) {
  const [expanded, setExpanded] = useState(false)

  if (session.entries.length === 1) {
    const entry = session.entries[0]
    return (
      <HistoryTabEntryRow
        entry={entry}
        profilesMap={profilesMap}
        entityNamesMap={entityNamesMap}
        bookAuthorsMap={bookAuthorsMap}
        isConfirming={confirmingEntryId === entry.id}
        isRollingBack={rollingBackEntryId === entry.id}
        onRollback={onRollbackEntry}
      />
    )
  }

  const dominantOp = dominantOperation(session.ops)
  const toneColor = OP_CONFIG[dominantOp]?.color ?? 'text-white/60'

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-default bg-white/4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5"
      >
        <ChevronRight
          size={14}
          className={clsx(
            'mt-0.5 shrink-0 text-white/40 transition-transform',
            expanded && 'rotate-90',
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui">
            <span className="font-medium text-white/70">
              {actorName(session.actor, profilesMap)}
            </span>
            <span className={toneColor}>
              {session.entries.length} actions
            </span>
            <SessionCounters counts={session.counts} ops={session.ops} />
          </div>
          <div className="text-micro text-white/20">{timeAgo(session.newestAt)}</div>
        </div>

        <div className="shrink-0">
          <Button
            type="button"
            variant="outline"
            outlineWeight="muted"
            tone={isConfirmingSession ? 'warning' : 'neutral'}
            icon={
              isRollingBackSession
                ? <Loader2 size={11} className="animate-spin" />
                : <Undo2 size={11} />
            }
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              onRollbackSession(session)
            }}
            disabled={isRollingBackSession}
            className="text-caption opacity-0 transition-opacity group-hover:opacity-100 data-confirming:opacity-100"
            data-confirming={isConfirmingSession || undefined}
          >
            {isConfirmingSession ? 'Confirmer ?' : 'Annuler la session'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border-subtle bg-black/15 p-2">
          {session.entries.map((entry) => (
            <HistoryTabEntryRow
              key={entry.id}
              entry={entry}
              profilesMap={profilesMap}
              entityNamesMap={entityNamesMap}
              bookAuthorsMap={bookAuthorsMap}
              isConfirming={confirmingEntryId === entry.id}
              isRollingBack={rollingBackEntryId === entry.id}
              onRollback={onRollbackEntry}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function dominantOperation(ops: ActivitySession['ops']): keyof ActivitySession['ops'] {
  let best: keyof ActivitySession['ops'] = 'UPDATE'
  let bestN = -1
  for (const k of ['INSERT', 'UPDATE', 'DELETE', 'RESTORE'] as const) {
    if (ops[k] > bestN) {
      best = k
      bestN = ops[k]
    }
  }
  return best
}

function SessionCounters({
  counts,
  ops,
}: {
  counts: ActivitySession['counts']
  ops: ActivitySession['ops']
}) {
  const entityItems: { icon: typeof BookOpen; n: number }[] = []
  if (counts.books) entityItems.push({ icon: BookOpen, n: counts.books })
  if (counts.authors) entityItems.push({ icon: Users, n: counts.authors })
  if (counts.links) entityItems.push({ icon: Link2, n: counts.links })

  return (
    <span className="inline-flex items-center gap-2 text-caption text-white/40">
      {entityItems.map(({ icon: Icon, n }, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          <Icon size={11} />
          <span>{n}</span>
        </span>
      ))}
      {(ops.INSERT > 0 || ops.UPDATE > 0 || ops.DELETE > 0 || ops.RESTORE > 0) && (
        <span className="inline-flex items-center gap-1.5 border-l border-border-default pl-2">
          {ops.INSERT > 0 && <span className="text-green/60">+{ops.INSERT}</span>}
          {ops.UPDATE > 0 && <span className="text-cyan/60">~{ops.UPDATE}</span>}
          {ops.DELETE > 0 && <span className="text-red/60">-{ops.DELETE}</span>}
          {ops.RESTORE > 0 && <span className="text-amber/60">↺{ops.RESTORE}</span>}
        </span>
      )}
    </span>
  )
}

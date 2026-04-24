import { Loader2 } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { useHistoryTabData } from './useHistoryTabData'
import { HistoryTabSession } from './HistoryTabSession'
import { HistoryTabAnomalies } from './HistoryTabAnomalies'

type HistoryTabProps = {
  onOpenAIOrphanReconcile?: () => void
}

export function HistoryTab({ onOpenAIOrphanReconcile }: HistoryTabProps = {}) {
  const {
    search,
    setSearch,
    filteredSessions,
    allEntries,
    logLoading,
    hasMore,
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
  } = useHistoryTabData()

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
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm">
        Aucun événement enregistré.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <HistoryTabAnomalies onOpenAIReconcile={onOpenAIOrphanReconcile} />

        <SearchInputWithClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans l'historique…"
          focusTone="cyan"
          className="mb-2"
        />

        {filteredSessions.map((session) => (
          <HistoryTabSession
            key={session.id}
            session={session}
            profilesMap={profilesMap}
            entityNamesMap={entityNamesMap}
            bookAuthorsMap={bookAuthorsMap}
            confirmingEntryId={confirmingId}
            rollingBackEntryId={rollingBackId}
            onRollbackEntry={handleRollback}
            isConfirmingSession={confirmingSessionId === session.id}
            isRollingBackSession={rollingBackSessionId === session.id}
            onRollbackSession={handleRollbackSession}
          />
        ))}

        {filteredSessions.length === 0 && search && (
          <div className="py-8 text-center text-sm text-text-muted">
            Aucun résultat pour « {search} »
          </div>
        )}

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

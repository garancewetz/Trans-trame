import { AlertTriangle, Check, Info, Link2, Merge, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../../tableConstants'
import { TH } from '../TH'
import { TableMergeAuthorsModal } from '../TableMergeAuthorsModal'
import { BatchInfoModal } from '../BatchInfoModal'
import { AuthorTableRow } from '../AuthorTableRow'
import { useAuthorsTabState } from '../../hooks/useAuthorsTabState'
import type { Author, AuthorId, Book } from '@/types/domain'
import type { MigrationResult } from '@/features/graph/hooks/graphDataMigration'

type AuthorsTabProps = {
  authors: Author[]
  books: Book[]
  search?: string
  onAddAuthor: (author: Author) => unknown
  onUpdateAuthor: (author: Author) => unknown
  onDeleteAuthor: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<MigrationResult> | MigrationResult
  onAddBookForAuthor?: (author: Author) => unknown
  focusAuthorId?: AuthorId | null
  onMergeAuthors?: (fromAuthorId: AuthorId, keepAuthorId: AuthorId) => unknown
  authorDuplicateGroups?: Author[][]
  onOpenAuthorDedupeModal?: () => void
  orphanedAuthorCount?: number
  onOpenAuthorReconcileModal?: () => void
}

export function AuthorsTab({
  authors,
  books,
  search = '',
  onAddAuthor,
  onUpdateAuthor,
  onDeleteAuthor,
  onMigrateData,
  onAddBookForAuthor,
  focusAuthorId,
  onMergeAuthors,
  authorDuplicateGroups = [],
  onOpenAuthorDedupeModal,
  orphanedAuthorCount = 0,
  onOpenAuthorReconcileModal,
}: AuthorsTabProps) {
  const [batchInfoModal, setBatchInfoModal] = useState(false)

  const authorsMap = useMemo(
    () => new Map(authors.map((a) => [a.id, a])),
    [authors],
  )

  const {
    editingCell, setEditingCell,
    editingValue, setEditingValue,
    selectedIds, setSelectedIds,
    bulkConfirm, setBulkConfirm,
    migrating,
    migrateResult,
    mergeModal, setMergeModal,
    mergeKeepId, setMergeKeepId,
    mergeConfirm, setMergeConfirm,
    sortCol, sortDir,
    inputFirstName, setInputFirstName,
    inputLastName, setInputLastName,
    firstNameRef,
    legacyCount,
    legacyBooks,
    bookCountByAuthor,
    booksByAuthor,
    mergeAuthorsList,
    filteredAuthors,
    allSelected, someSelected,
    handleMigrate,
    handleSort,
    toggleAll,
    toggleRow,
    handleBulkDelete,
    handleAddAuthor,
    commitEdit,
    handleConfirmMerge,
    justAddedAuthorId,
  } = useAuthorsTabState({
    authors, books, search,
    onAddAuthor, onUpdateAuthor, onDeleteAuthor,
    onMigrateData, onMergeAuthors, focusAuthorId,
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* Bandeau de migration */}
      {legacyCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-cyan/12 bg-cyan/4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={13} className="shrink-0 text-cyan/65" />
            <p className="text-label text-white/55">
              <span className="font-semibold text-white/80">{legacyCount} ressource{legacyCount > 1 ? 's' : ''}</span>
              {' '}utilisent encore l'ancien format (auteur·ice intégré·e au livre).
              Lance la migration pour créer les entités auteur·ices correspondantes.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleMigrate}
            disabled={migrating}
            className="shrink-0 cursor-pointer rounded-lg border border-cyan/30 bg-cyan/8 px-3 py-1.5 text-[0.8rem] font-semibold text-cyan/80 transition-all hover:bg-cyan/15 disabled:cursor-wait disabled:opacity-40"
          >
            {migrating ? 'Migration…' : 'Migrer les données'}
          </Button>
        </div>
      )}
      {legacyCount > 0 && (
        <div className="shrink-0 border-b border-cyan/8 bg-cyan/2 px-5 py-2.5">
          <p className="mb-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-white/30">
            Ressources concernés
          </p>
          <ul className="flex flex-col gap-1">
            {legacyBooks.map((b) => (
              <li key={b.id} className="flex items-baseline gap-2 font-mono text-caption">
                <span className="text-white/55">{b.title || '(sans titre)'}</span>
                <span className="text-white/25">—</span>
                <span className="text-amber/50">
                  {[b.firstName, b.lastName].filter(Boolean).join(' ') || '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Résultat de la migration */}
      {migrateResult && (
        <div
          className={[
            'shrink-0 border-b px-5 py-2.5',
            migrateResult.error
              ? 'border-red/15 bg-red/4'
              : legacyCount > 0
                ? 'border-amber/15 bg-amber/4'
                : 'border-green/12 bg-green/4',
          ].join(' ')}
        >
          {migrateResult.error ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red/70" />
                <div>
                  <p className="text-label font-semibold text-red/75">
                    Migration échouée
                  </p>
                  <p className="mt-0.5 font-mono text-caption text-red/55">
                    {migrateResult.error}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleMigrate}
                disabled={migrating}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red/25 bg-red/8 px-3 py-1.5 text-[0.8rem] font-semibold text-red/70 transition-all hover:bg-red/15 disabled:cursor-wait disabled:opacity-40"
              >
                <RotateCcw size={11} />
                {migrating ? 'Retry…' : 'Réessayer'}
              </Button>
            </div>
          ) : legacyCount > 0 ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="shrink-0 text-amber/70" />
                <p className="text-label text-amber/75">
                  Migration effectuée mais {legacyCount} ressource{legacyCount > 1 ? 's' : ''} n'{legacyCount > 1 ? 'ont' : 'a'} pas été mis à jour.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleMigrate}
                disabled={migrating}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber/25 bg-amber/8 px-3 py-1.5 text-[0.8rem] font-semibold text-amber/70 transition-all hover:bg-amber/15 disabled:cursor-wait disabled:opacity-40"
              >
                <RotateCcw size={11} />
                {migrating ? 'Retry…' : 'Réessayer'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check size={12} className="shrink-0 text-green" />
              <p className="text-label text-green/80">
                Migration terminée — {migrateResult.newAuthors} auteur·ice{migrateResult.newAuthors > 1 ? 's' : ''} créé·e{migrateResult.newAuthors > 1 ? 's' : ''},
                {' '}{migrateResult.updatedBooks} ressource{migrateResult.updatedBooks > 1 ? 's' : ''} mis à jour.
              </p>
            </div>
          )}
          {migrateResult.failures.length > 0 && (
            <div className="mt-2.5 rounded-lg border border-red/15 bg-red/4 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="shrink-0 text-red/70" />
                  <p className="text-label font-semibold text-red/70">
                    {migrateResult.failures.length} ressource{migrateResult.failures.length > 1 ? 's' : ''} en échec
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red/25 bg-red/8 px-3 py-1.5 text-[0.8rem] font-semibold text-red/70 transition-all hover:bg-red/15 disabled:cursor-wait disabled:opacity-40"
                >
                  <RotateCcw size={11} />
                  {migrating ? 'Retry…' : 'Réessayer'}
                </Button>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {migrateResult.failures.map((f) => (
                  <li key={f.bookId} className="flex flex-col gap-0.5 font-mono text-caption">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white/55">{f.title}</span>
                      <span className="text-white/25">—</span>
                      <span className="text-amber/50">{f.author || '—'}</span>
                    </div>
                    <span className="text-[0.7rem] text-red/40">{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(authorDuplicateGroups.length > 0 || orphanedAuthorCount > 0) && (
        <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-5 py-2">
          {authorDuplicateGroups.length > 0 && (
            <Button
              variant="outline"
              outlineWeight="faint"
              tone="warning"
              emphasis
              icon={<Merge size={11} />}
              onClick={onOpenAuthorDedupeModal}
              type="button"
              title={`${authorDuplicateGroups.length} groupe${authorDuplicateGroups.length > 1 ? 's' : ''} de doublons`}
            >
              Doublons
              <span className="tabular-nums">({authorDuplicateGroups.length})</span>
            </Button>
          )}
          {orphanedAuthorCount > 0 && (
            <>
              <Button
                variant="outline"
                outlineWeight="faint"
                tone="orphan"
                emphasis
                icon={<Link2 size={11} />}
                onClick={onOpenAuthorReconcileModal}
                type="button"
                title={`${orphanedAuthorCount} auteur·ice${orphanedAuthorCount > 1 ? 's' : ''} sans ressource`}
              >
                Orphelin·es
                <span className="tabular-nums">({orphanedAuthorCount})</span>
              </Button>
            </>
          )}
        </div>
      )}

      {/* Barre de sélection */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
          <span className="font-mono text-label text-white/45">
            {selectedIds.size} sélectionné·e{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button
            type="button"
            onClick={() => setBatchInfoModal(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/4 px-3 py-1.5 text-[0.8rem] font-semibold text-white/50 transition-all hover:bg-white/8"
          >
            <Info size={11} /> Informations
          </Button>
          {selectedIds.size === 2 && (
            <Button
              type="button"
              onClick={() => {
                setMergeKeepId(mergeAuthorsList[0]?.id || null)
                setMergeConfirm(false)
                setMergeModal(true)
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber/30 bg-amber/[0.07] px-3 py-1.5 text-[0.8rem] font-semibold text-amber/75 transition-all hover:bg-amber/[0.14]"
            >
              <Merge size={12} /> Fusionner
            </Button>
          )}
          <Button
            type="button"
            onClick={handleBulkDelete}
            onBlur={() => setBulkConfirm(false)}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold transition-all',
              bulkConfirm
                ? 'border-red/[0.55] bg-red/10 text-red/90'
                : 'border-red/22 text-red/55 hover:bg-red/[0.07]',
            ].join(' ')}
          >
            <Trash2 size={11} />
            {bulkConfirm ? `Confirmer (${selectedIds.size})` : `Supprimer (${selectedIds.size})`}
          </Button>
          <Button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setBulkConfirm(false) }}
            className="cursor-pointer text-[0.8rem] text-white/25 hover:text-white/60"
          >
            Annuler
          </Button>
        </div>
      )}

      {authors.length === 0 && legacyCount === 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-ui text-white/22">Aucun·e auteur·ice</p>
        </div>
      )}

      {filteredAuthors.length === 0 && authors.length > 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-ui text-white/22">Aucun résultat pour « {search} »</p>
        </div>
      )}

      {filteredAuthors.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-bg-overlay">
              <tr className="border-b border-white/6">
                <th className="w-9 px-3 py-2.5">
                  <Button
                    type="button"
                    onClick={toggleAll}
                    className={[
                      'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                      allSelected ? 'border-green bg-green/18 text-green'
                        : someSelected ? 'border-green/38 bg-green/[0.07] text-green/[0.55]'
                        : 'border-white/14 text-transparent hover:border-white/28',
                    ].join(' ')}
                  >
                    <Check size={9} />
                  </Button>
                </th>
                <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="min-w-[140px]">Nom</TH>
                <TH col="firstName" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="min-w-[140px]">Prénom</TH>
                <TH col="bookCount" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-20">Ressources</TH>
                <TH col="createdAt" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-28">Ajouté</TH>
                <th className="w-24 px-3 py-2.5" />
              </tr>

              {/* Ligne d'ajout */}
              <tr className="border-b border-cyan/20 bg-bg-overlay shadow-[0_-1px_0_var(--color-bg-overlay)]">
                <td className="bg-cyan/6 px-3 py-1.5 align-bottom">
                  <Plus size={11} className="mb-1.5 text-cyan/60" />
                </td>
                <td className="bg-cyan/6 px-2 py-1.5 align-bottom">
                  <span className="mb-0.5 block text-[0.65rem] font-semibold uppercase tracking-[1.2px] text-cyan/50">Nouvel·le auteur·ice</span>
                  <TextInput
                    variant="table"
                    className={INPUT}
                    placeholder="Saisir un nom…"
                    value={inputLastName}
                    onChange={(e) => setInputLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                  />
                </td>
                <td className="bg-cyan/6 px-2 py-1.5 align-bottom">
                  <TextInput
                    variant="table"
                    ref={firstNameRef}
                    className={INPUT}
                    placeholder="Prénom"
                    value={inputFirstName}
                    onChange={(e) => setInputFirstName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                  />
                </td>
                <td className="bg-cyan/6" />
                <td className="bg-cyan/6" />
                <td className="bg-cyan/6 px-2 py-1.5 align-bottom">
                  <Button
                    type="button"
                    onClick={handleAddAuthor}
                    disabled={!inputLastName.trim()}
                    className="shrink-0 cursor-pointer rounded-md border border-cyan/35 bg-cyan/12 px-2 py-1 text-caption font-semibold text-cyan/85 transition-all hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    + Ajouter
                  </Button>
                </td>
              </tr>
            </thead>

            <tbody>
              {filteredAuthors.map((author, i) => (
                <AuthorTableRow
                  key={author.id}
                  author={author}
                  index={i}
                  justAdded={justAddedAuthorId === author.id}
                  isSelected={selectedIds.has(author.id)}
                  focusAuthorId={focusAuthorId}
                  bookCount={bookCountByAuthor.get(author.id) || 0}
                  books={booksByAuthor.get(author.id)}
                  editingCell={editingCell}
                  editingValue={editingValue}
                  setEditingValue={setEditingValue}
                  setEditingCell={setEditingCell}
                  commitEdit={commitEdit}
                  toggleRow={toggleRow}
                  onAddBookForAuthor={onAddBookForAuthor}
                  onUpdateAuthor={onUpdateAuthor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TableMergeAuthorsModal
        open={mergeModal}
        authorsToMerge={mergeAuthorsList}
        keepId={mergeKeepId}
        setKeepId={setMergeKeepId}
        confirm={mergeConfirm}
        setConfirm={setMergeConfirm}
        onConfirm={handleConfirmMerge}
        onClose={() => { setMergeModal(false); setMergeKeepId(null) }}
        bookCountByAuthor={bookCountByAuthor}
        booksByAuthor={booksByAuthor}
      />

      <BatchInfoModal
        open={batchInfoModal}
        onClose={() => setBatchInfoModal(false)}
        selectedAuthors={authors.filter((a) => selectedIds.has(a.id))}
        allBooks={books}
        allAuthors={authors}
        authorsMap={authorsMap}
      />
    </div>
  )
}

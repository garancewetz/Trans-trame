import { Check, Merge, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../../tableConstants'
import { TH } from '../TableSubcomponents'
import { TableMergeAuthorsModal } from '../TableMergeAuthorsModal'
import { AuthorTableRow } from '../AuthorTableRow'
import { useAuthorsTabState } from '../../hooks/useAuthorsTabState'
import type { Author, AuthorId, Book } from '@/types/domain'
import { Plus } from 'lucide-react'

type AuthorsTabProps = {
  authors: Author[]
  books: Book[]
  search?: string
  onAddAuthor: (author: Author) => unknown
  onUpdateAuthor: (author: Author) => unknown
  onDeleteAuthor: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<{ newAuthors: number; updatedBooks: number } | null> | { newAuthors: number; updatedBooks: number } | null
  onAddBookForAuthor?: (author: Author) => unknown
  focusAuthorId?: AuthorId | null
  onMergeAuthors?: (fromAuthorId: AuthorId, keepAuthorId: AuthorId) => unknown
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
}: AuthorsTabProps) {
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
    bookCountByAuthor,
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
  } = useAuthorsTabState({
    authors, books, search,
    onAddAuthor, onUpdateAuthor, onDeleteAuthor,
    onMigrateData, onMergeAuthors, focusAuthorId,
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* Bandeau de migration */}
      {legacyCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[rgba(140,220,255,0.12)] bg-[rgba(140,220,255,0.04)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={13} className="shrink-0 text-[rgba(140,220,255,0.65)]" />
            <p className="text-[0.72rem] text-white/55">
              <span className="font-semibold text-white/80">{legacyCount} ouvrage{legacyCount > 1 ? 's' : ''}</span>
              {' '}utilisent encore l'ancien format (auteur intégré au livre).
              Lance la migration pour créer les entités auteurs correspondantes.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleMigrate}
            disabled={migrating}
            className="shrink-0 cursor-pointer rounded-lg border border-[rgba(140,220,255,0.3)] bg-[rgba(140,220,255,0.08)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(140,220,255,0.8)] transition-all hover:bg-[rgba(140,220,255,0.15)] disabled:cursor-wait disabled:opacity-40"
          >
            {migrating ? 'Migration…' : 'Migrer les données'}
          </Button>
        </div>
      )}

      {/* Résultat de la migration */}
      {migrateResult && (
        <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(0,255,135,0.12)] bg-[rgba(0,255,135,0.04)] px-5 py-2.5">
          <Check size={12} className="shrink-0 text-[#00FF87]" />
          <p className="text-[0.72rem] text-[rgba(0,255,135,0.8)]">
            Migration terminée — {migrateResult.newAuthors} auteur{migrateResult.newAuthors > 1 ? 's' : ''} créé{migrateResult.newAuthors > 1 ? 's' : ''},
            {' '}{migrateResult.updatedBooks} ouvrage{migrateResult.updatedBooks > 1 ? 's' : ''} mis à jour.
          </p>
        </div>
      )}

      {/* Barre de sélection */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
          <span className="font-mono text-[0.72rem] text-white/45">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          {selectedIds.size === 2 && (
            <Button
              type="button"
              onClick={() => {
                setMergeKeepId(mergeAuthorsList[0]?.id || null)
                setMergeConfirm(false)
                setMergeModal(true)
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(255,200,60,0.3)] bg-[rgba(255,200,60,0.07)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(255,210,100,0.75)] transition-all hover:bg-[rgba(255,200,60,0.14)]"
            >
              <Merge size={12} /> Fusionner
            </Button>
          )}
          <Button
            type="button"
            onClick={handleBulkDelete}
            onBlur={() => setBulkConfirm(false)}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              bulkConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
                : 'border-[rgba(255,70,70,0.22)] text-[rgba(255,90,90,0.55)] hover:bg-[rgba(255,70,70,0.07)]',
            ].join(' ')}
          >
            <Trash2 size={11} />
            {bulkConfirm ? `Confirmer (${selectedIds.size})` : `Supprimer (${selectedIds.size})`}
          </Button>
          <Button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setBulkConfirm(false) }}
            className="cursor-pointer text-[0.7rem] text-white/25 hover:text-white/60"
          >
            Annuler
          </Button>
        </div>
      )}

      {authors.length === 0 && legacyCount === 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-[0.75rem] text-white/22">Aucun auteur·ice</p>
        </div>
      )}

      {filteredAuthors.length === 0 && authors.length > 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-[0.75rem] text-white/22">Aucun résultat pour « {search} »</p>
        </div>
      )}

      {filteredAuthors.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-[rgba(4,6,20,0.98)]">
              <tr className="border-b border-white/6">
                <th className="w-9 px-3 py-2.5">
                  <Button
                    type="button"
                    onClick={toggleAll}
                    className={[
                      'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                      allSelected ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                        : someSelected ? 'border-[rgba(0,255,135,0.38)] bg-[rgba(0,255,135,0.07)] text-[rgba(0,255,135,0.55)]'
                        : 'border-white/14 text-transparent hover:border-white/28',
                    ].join(' ')}
                  >
                    <Check size={9} />
                  </Button>
                </th>
                <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="min-w-[140px]">Nom</TH>
                <TH col="firstName" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="min-w-[140px]">Prénom</TH>
                <TH col="bookCount" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-20">Ouvrages</TH>
                <th className="w-24 px-3 py-2.5" />
              </tr>

              {/* Ligne d'ajout */}
              <tr className="border-b border-[rgba(140,220,255,0.1)] bg-[rgba(140,220,255,0.02)]">
                <td className="px-3 py-1.5 text-center">
                  <Plus size={11} className="text-[rgba(140,220,255,0.35)]" />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    variant="table"
                    className={INPUT}
                    placeholder="Nom *"
                    value={inputLastName}
                    onChange={(e) => setInputLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                  />
                </td>
                <td className="px-2 py-1.5">
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
                <td />
                <td className="px-2 py-1.5">
                  <Button
                    type="button"
                    onClick={handleAddAuthor}
                    disabled={!inputLastName.trim()}
                    className="shrink-0 cursor-pointer rounded-md border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] px-2 py-1 text-[0.65rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
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
                  isSelected={selectedIds.has(author.id)}
                  focusAuthorId={focusAuthorId}
                  bookCount={bookCountByAuthor.get(author.id) || 0}
                  editingCell={editingCell}
                  editingValue={editingValue}
                  setEditingValue={setEditingValue}
                  setEditingCell={setEditingCell}
                  commitEdit={commitEdit}
                  toggleRow={toggleRow}
                  onAddBookForAuthor={onAddBookForAuthor}
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
      />
    </div>
  )
}

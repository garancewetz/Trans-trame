import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, Check, GitMerge, Info, Link2, Loader2, Plus, X, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import type { Book } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'
import type { ParsedBook } from '../parseSmartInput.types'
import type { AuthorMergeSuggestion } from '../smartImportModal.utils'
import { SmartImportPreviewRow } from './SmartImportPreviewRow'

type EditingCell = { id: string; field: string } | null
type EditingAuthor = { id: string; authorIndex: number | null; firstName: string; lastName: string } | null

type Props = {
  parsed: ParsedBook[]
  checked: Set<string>
  mergedIds: Set<string>
  editingCell: EditingCell
  editingValue: string
  setEditingValue: (value: string) => void
  editingAuthor: EditingAuthor
  setEditingAuthor: Dispatch<SetStateAction<EditingAuthor>>
  toggleItem: (id: string) => void
  commitCellEdit: () => void
  setEditingCell: (cell: EditingCell) => void
  commitAuthorEdit: () => void
  handleMerge: (item: ParsedBook) => void
  handleUnmerge: (item: ParsedBook) => void
  onDismissDuplicate: (id: string) => void
  onInsertRow: (index: number) => void
  onAddCoAuthor: (id: string) => void
  onUpdateAxes: (id: string, axes: Axis[]) => void
  onSwapFields: (id: string, field: 'title' | 'edition') => void
  onUpdateField: (id: string, field: string, value: string) => void
  authorMergeSuggestions: AuthorMergeSuggestion[]
  onAuthorMerge: (suggestion: AuthorMergeSuggestion) => void
  onDismissAuthorMerge: (id: string) => void
  masterNode: Book | null
  linkDirection: string
  selectedCount: number
  injected: boolean
  inserting: boolean
  handleClose: () => void
  knownEditions: string[]
}

export function SmartImportPreviewPhase({
  parsed,
  checked,
  mergedIds,
  editingCell,
  editingValue,
  setEditingValue,
  editingAuthor,
  setEditingAuthor,
  toggleItem,
  commitCellEdit,
  setEditingCell,
  commitAuthorEdit,
  handleMerge,
  handleUnmerge,
  onDismissDuplicate,
  onInsertRow,
  onAddCoAuthor,
  onUpdateAxes,
  onSwapFields,
  onUpdateField,
  authorMergeSuggestions,
  onAuthorMerge,
  onDismissAuthorMerge,
  masterNode,
  linkDirection,
  selectedCount,
  injected,
  inserting,
  handleClose,
  knownEditions,
}: Props) {
  const exactCount = parsed.filter((r) => r.isDuplicate).length
  const fuzzyCount = parsed.filter((r) => r.isFuzzyDuplicate).length

  return (
    <>
      {/* Stats bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.82rem]">
        <span className="text-white/40">
          {parsed.length} ligne{parsed.length > 1 ? 's' : ''} détectée{parsed.length > 1 ? 's' : ''}
        </span>
        {exactCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-red/30 bg-red/[0.07] px-2 py-0.5 text-red/80">
            <AlertTriangle size={9} />
            {exactCount} doublon{exactCount > 1 ? 's' : ''} exact{exactCount > 1 ? 's' : ''}
          </span>
        )}
        {fuzzyCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-amber/30 bg-amber/[0.07] px-2 py-0.5 text-amber/80">
            <AlertTriangle size={9} />
            {fuzzyCount} doublon{fuzzyCount > 1 ? 's' : ''} possible{fuzzyCount > 1 ? 's' : ''}
          </span>
        )}
        {masterNode && (
          <span className="flex items-center gap-1 rounded-full border border-cyan/25 bg-cyan/6 px-2 py-0.5 text-cyan/65">
            <Link2 size={9} />
            {linkDirection === 'imported-cites-master' ? ' ← ' : ' → '}
            {masterNode.title}
          </span>
        )}
        <span className="ml-auto text-[0.75rem] text-white/22">Cliquer pour modifier</span>
      </div>

      {/* Author initial-match suggestions */}
      {authorMergeSuggestions.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl border border-violet/20 bg-violet/3">
          <div className="flex items-center gap-1.5 border-b border-violet/10 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[1.3px] text-violet/45">
            <GitMerge size={10} />
            Auteur·ices à fusionner ?
          </div>
          {authorMergeSuggestions.map((s: AuthorMergeSuggestion) => (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-3 border-b border-violet/8 px-3 py-1.5 last:border-0"
            >
              {/* Initial author (left) */}
              <div className="min-w-0 font-mono text-[0.82rem]">
                <span className="text-white/45">{s.initialAuthor.firstName}</span>
                {' '}
                <span className="font-semibold text-white/65">{s.initialAuthor.lastName.toUpperCase()}</span>
                <span className="ml-1.5 text-[0.7rem] text-white/20">
                  ({s.affectedItemIds.length} ouvrage{s.affectedItemIds.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* Arrow */}
              <span className="text-[0.8rem] text-violet/40">→</span>

              {/* Full author (right) */}
              <div className="min-w-0 font-mono text-[0.82rem]">
                <span className="text-white/60">{s.fullAuthor.firstName}</span>
                {' '}
                <span className="font-semibold text-white/80">{s.fullAuthor.lastName.toUpperCase()}</span>
                {s.existingAuthorId && (
                  <span className="ml-1.5 text-[0.7rem] text-violet/35">existant</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  onClick={() => onAuthorMerge(s)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-violet/25 bg-violet/8 px-2 py-0.5 text-[0.72rem] font-semibold text-violet/70 transition-all hover:bg-violet/18 hover:text-violet/95"
                >
                  <GitMerge size={9} /> Fusionner
                </Button>
                <button
                  type="button"
                  onClick={() => onDismissAuthorMerge(s.id)}
                  className="cursor-pointer rounded p-0.5 text-white/20 transition-colors hover:text-white/50"
                  title="Ignorer"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mb-4 overflow-hidden rounded-xl border border-white/8">
        <div className="grid grid-cols-[28px_2fr_1.2fr_0.5fr_1fr_48px_28px_54px] border-b border-white/6 bg-white/2.5 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[1.3px] text-white/28">
          <span />
          <span>Titre</span>
          <span>Auteur·ice</span>
          <span>Axes</span>
          <span className="group/tip relative flex items-center gap-1">
            Édition
            <Info size={10} className="text-white/25 transition-colors group-hover/tip:text-white/50" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2.5 py-1.5 text-[0.72rem] font-normal normal-case tracking-normal text-white/65 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100">
              Info du lien, pas de l'ouvrage
            </span>
          </span>
          <span>Page</span>
          <span />
          <span>Année</span>
        </div>
        <div className="max-h-[min(55vh,480px)] overflow-y-auto">
          {parsed.length === 0 && (
            <p className="p-4 text-center text-[0.82rem] text-white/50">Aucun ouvrage reconnu.</p>
          )}
          {parsed.map((item, idx) => (
            <div key={item.id}>
              <SmartImportPreviewRow
                item={item}
                checked={checked}
                mergedIds={mergedIds}
                editingCell={editingCell}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                editingAuthor={editingAuthor}
                setEditingAuthor={setEditingAuthor}
                toggleItem={toggleItem}
                commitCellEdit={commitCellEdit}
                setEditingCell={setEditingCell}
                commitAuthorEdit={commitAuthorEdit}
                handleMerge={handleMerge}
                handleUnmerge={handleUnmerge}
                onDismissDuplicate={onDismissDuplicate}
                onAddCoAuthor={onAddCoAuthor}
                onUpdateAxes={onUpdateAxes}
                onSwapFields={onSwapFields}
                onUpdateField={onUpdateField}
                masterNode={masterNode}
                knownEditions={knownEditions}
              />
              <div
                className="group/insert relative flex h-2 items-center justify-center transition-[height] hover:h-5"
              >
                <button
                  type="button"
                  onClick={() => onInsertRow(idx)}
                  className="z-10 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/0 opacity-0 transition-all hover:border-cyan/40 hover:bg-cyan/15 hover:text-cyan group-hover/insert:text-white/40 group-hover/insert:opacity-100"
                  title="Insérer une ligne"
                >
                  <Plus size={10} />
                </button>
                <div className="absolute inset-x-3 h-px bg-white/0 transition-colors group-hover/insert:bg-white/8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleClose}
          variant="surface"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={selectedCount === 0 || injected || inserting}
          className={[
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-[0.85rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
            injected
              ? 'border-green/50 bg-green/10 text-green'
              : 'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
          ].join(' ')}
        >
          {injected ? (
            <><Check size={13} /> Injecté !</>
          ) : inserting ? (
            <><Loader2 size={13} className="animate-spin" /> Insertion en cours…</>
          ) : (
            <>
              <Zap size={13} />
              Injecter dans la Trame ({selectedCount})
              {masterNode && selectedCount > 0 && (
                <span className="opacity-65"> + {selectedCount} lien{selectedCount > 1 ? 's' : ''}</span>
              )}
            </>
          )}
        </Button>
      </div>
    </>
  )
}

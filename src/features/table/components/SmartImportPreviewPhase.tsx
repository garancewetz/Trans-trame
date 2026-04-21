import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, Check, GitMerge, Info, Link2, Loader2, X, Zap } from 'lucide-react'
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
  onAddCoAuthor: (id: string) => void
  onUpdateAxes: (id: string, axes: Axis[]) => void
  onRemoveTheme: (id: string, theme: string) => void
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
  onAddCoAuthor,
  onUpdateAxes,
  onRemoveTheme,
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
      <div className="mb-3 flex flex-wrap items-center gap-2 text-label">
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
        <span className="ml-auto text-caption text-white/22">Cliquer pour modifier</span>
      </div>

      {/* Author initial-match suggestions */}
      {authorMergeSuggestions.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl border border-violet/20 bg-violet/3">
          <div className="flex items-center gap-1.5 border-b border-violet/10 px-3 py-1.5 text-micro font-semibold uppercase tracking-[1.3px] text-violet/45">
            <GitMerge size={10} />
            Auteur·ices à fusionner ?
          </div>
          {authorMergeSuggestions.map((s: AuthorMergeSuggestion) => (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-3 border-b border-violet/8 px-3 py-1.5 last:border-0"
            >
              {/* Initial author (left) */}
              <div className="min-w-0 font-mono text-label">
                <span className="text-white/45">{s.initialAuthor.firstName}</span>
                {' '}
                <span className="font-semibold text-white/65">{s.initialAuthor.lastName.toUpperCase()}</span>
                <span className="ml-1.5 text-[0.7rem] text-white/20">
                  ({s.affectedItemIds.length} ressource{s.affectedItemIds.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* Arrow */}
              <span className="text-[0.8rem] text-violet/40">→</span>

              {/* Full author (right) */}
              <div className="min-w-0 font-mono text-label">
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
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-violet/25 bg-violet/8 px-2 py-0.5 text-micro font-semibold text-violet/70 transition-all hover:bg-violet/18 hover:text-violet/95"
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
        <div className="grid grid-cols-[28px_2fr_1.2fr_minmax(5.25rem,0.35fr)_0.5fr_1fr_48px_28px_54px] border-b border-white/6 bg-white/2.5 px-3 py-1.5 text-micro font-semibold uppercase tracking-[1.3px] text-white/28">
          <span />
          <span>Titre</span>
          <span>Auteur·ice</span>
          <span className="group/tip relative flex items-center gap-1">
            Type
            <Info size={10} className="text-white/25 transition-colors group-hover/tip:text-white/50" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2.5 py-1.5 text-micro font-normal normal-case tracking-normal text-white/65 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100">
              Livre, article, podcast… — prérempli par l’IA si elle est sûre ; sinon vide (défaut livre à l’injection).
            </span>
          </span>
          <span>Axes</span>
          <span className="group/tip relative flex items-center gap-1">
            Édition
            <Info size={10} className="text-white/25 transition-colors group-hover/tip:text-white/50" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2.5 py-1.5 text-micro font-normal normal-case tracking-normal text-white/65 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100">
              Info du lien, pas de la ressource
            </span>
          </span>
          <span>Page</span>
          <span />
          <span>Année</span>
        </div>
        <div className="max-h-[min(55vh,480px)] overflow-y-auto">
          {parsed.length === 0 && (
            <p className="p-4 text-center text-label text-white/50">Aucune ressource reconnue.</p>
          )}
          {parsed.map((item) => (
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
                onRemoveTheme={onRemoveTheme}
                onSwapFields={onSwapFields}
                onUpdateField={onUpdateField}
                masterNode={masterNode}
                knownEditions={knownEditions}
              />
            </div>
          ))}
        </div>
      </div>

      {/* No-masterNode warning: importing without a source creates orphans.
          Common root cause of "38 orphelins" après import — show it loud. */}
      {!masterNode && selectedCount > 0 && !injected && !inserting && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/6 p-3 text-label">
          <AlertTriangle size={13} className="mt-px shrink-0 text-amber/80" />
          <div className="flex-1">
            <p className="font-semibold text-amber/90">
              Aucune ressource-source sélectionné
            </p>
            <p className="mt-0.5 text-caption text-white/55">
              Les {selectedCount} ressource{selectedCount > 1 ? 's' : ''} importé{selectedCount > 1 ? 's' : ''} {selectedCount > 1 ? 'arriveront' : 'arrivera'} sans aucun lien — {selectedCount > 1 ? 'iels apparaîtront' : 'iel apparaîtra'} en orphelin{selectedCount > 1 ? 's' : ''} dans la galaxie. Reviens à l'étape précédente pour relier cette bibliographie à la ressource dont elle provient, ou confirme ci-dessous si c'est intentionnel (import catalogue).
            </p>
          </div>
        </div>
      )}

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
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-ui font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
            injected
              ? 'border-green/50 bg-green/10 text-green'
              : !masterNode
                ? 'border-amber/40 bg-amber/8 text-amber/85 hover:bg-amber/15'
                : 'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
          ].join(' ')}
        >
          {injected ? (
            <><Check size={13} /> Injecté !</>
          ) : inserting ? (
            <><Loader2 size={13} className="animate-spin" /> Insertion en cours…</>
          ) : !masterNode ? (
            <>
              <AlertTriangle size={13} />
              Injecter comme orphelins ({selectedCount})
            </>
          ) : (
            <>
              <Zap size={13} />
              Injecter dans la Trame ({selectedCount})
              {selectedCount > 0 && (
                <span className="opacity-65"> + {selectedCount} lien{selectedCount > 1 ? 's' : ''}</span>
              )}
            </>
          )}
        </Button>
      </div>
    </>
  )
}

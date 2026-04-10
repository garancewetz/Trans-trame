import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, ArrowRightLeft, Check, GitMerge, Info, Link2, MessageSquare, Plus, X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { EditionPicker } from '@/features/add-book-form/components/EditionPicker'
import type { Book } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'
import type { ParsedBook } from '../parseSmartInput.types'
import { AxisDots } from './TableSubcomponents'

type EditingCell = { id: string; field: string } | null
type EditingAuthor = { id: string; authorIndex: number | null; firstName: string; lastName: string } | null

type Props = {
  item: ParsedBook
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
  onSwapFields: (id: string, field: 'title' | 'edition') => void
  onUpdateField: (id: string, field: string, value: string) => void
  masterNode: Book | null
  knownEditions: string[]
}

export function SmartImportPreviewRow({
  item,
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
  onSwapFields,
  onUpdateField,
  masterNode,
  knownEditions,
}: Props) {
  const isEditTitle = editingCell?.id === item.id && editingCell?.field === 'title'
  const isEditEdition = editingCell?.id === item.id && editingCell?.field === 'edition'
  const isEditPage = editingCell?.id === item.id && editingCell?.field === 'page'
  const isEditYear = editingCell?.id === item.id && editingCell?.field === 'year'
  const isEditCitation = editingCell?.id === item.id && editingCell?.field === 'citation'
  const editingAuthorIndex = editingAuthor?.id === item.id ? editingAuthor.authorIndex : null
  const isMerged = mergedIds.has(item.id)
  const isExact = item.isDuplicate
  const isFuzzy = item.isFuzzyDuplicate
  const isDup = isExact || isFuzzy

  return (
    <div>
      <div
        className={[
          'group/row grid grid-cols-[28px_2fr_1.2fr_0.5fr_1fr_48px_28px_54px] items-start gap-x-1 border-b border-white/4 px-3 py-1.5 transition-colors',
          '',
          isExact && !isMerged ? 'bg-red/3' : '',
          isFuzzy && !isMerged ? 'bg-amber/3' : '',
          !isDup && checked.has(item.id) ? 'bg-white/2' : '',
        ].join(' ')}
      >
        {/* Checkbox */}
        {isExact && !isMerged ? (
          <AlertTriangle size={12} className="text-red/70" />
        ) : isMerged ? (
          <Check size={12} className="text-green/60" />
        ) : (
          <Button
            type="button"
            onClick={() => toggleItem(item.id)}
            className={[
              'flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
              checked.has(item.id)
                ? 'border-green/60 bg-green/15'
                : isFuzzy
                  ? 'border-amber/45 hover:border-amber/70'
                  : 'border-white/20 hover:border-white/38',
            ].join(' ')}
          >
            {checked.has(item.id) && <Check size={10} className="text-green" />}
          </Button>
        )}

        {/* Title */}
        <div className="relative min-w-0 pr-2">
          {isEditTitle ? (
            <TextInput
              variant="table"
              autoFocus
              className="w-full rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 text-[0.85rem] focus:border-cyan/35 focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => commitCellEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'cursor-text wrap-break-word font-mono text-[0.85rem] leading-snug',
                isDup ? 'text-white/55' : 'text-white hover:text-white/80',
              ].join(' ')}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'title' })
                setEditingValue(item.title)
              }}
            >
              {item.title || <em className="text-white/30">Sans titre</em>}
              {item.parsedByLLM && (
                <span className="ml-1.5 inline-block rounded bg-cyan/15 px-1 py-px align-middle font-sans text-[0.6rem] font-medium tracking-wide text-cyan/80" title="Enrichi par Gemini">AI</span>
              )}
            </span>
          )}
          {/* Swap title ↔ author */}
          {!isMerged && !isEditTitle && (
            <button
              type="button"
              onClick={() => onSwapFields?.(item.id, 'title')}
              className="absolute -right-0.5 top-0 cursor-pointer rounded p-0.5 text-white/0 transition-colors group-hover/row:text-white/15 group-hover/row:hover:bg-white/8 group-hover/row:hover:text-cyan/70"
              title="Inverser titre ↔ auteur"
            >
              <ArrowRightLeft size={10} />
            </button>
          )}
        </div>

        {/* Author */}
        <div className="relative min-w-0 pr-1">
          <div className="flex flex-col gap-0.5 font-mono text-[0.8rem]">
            {(item.authors?.length > 0 ? item.authors : [{ firstName: item.firstName, lastName: item.lastName }]).map((a, i) => (
              editingAuthorIndex === i ? (
                <div
                  key={`${a.firstName}-${a.lastName}-${i}`}
                  className="flex gap-0.5"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) commitAuthorEdit()
                  }}
                >
                  <TextInput
                    variant="table"
                    autoFocus
                    className="w-[45%] rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 text-[0.8rem] focus:border-cyan/35 focus:bg-white/8"
                    placeholder="Prénom"
                    value={editingAuthor!.firstName}
                    onChange={(e) => setEditingAuthor((p) => p ? { ...p, firstName: e.target.value } : p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAuthorEdit()
                      if (e.key === 'Escape') setEditingAuthor(null)
                    }}
                  />
                  <TextInput
                    variant="table"
                    className="w-[55%] rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 text-[0.8rem] focus:border-cyan/35 focus:bg-white/8"
                    placeholder="Nom"
                    value={editingAuthor!.lastName}
                    onChange={(e) => setEditingAuthor((p) => p ? { ...p, lastName: e.target.value } : p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAuthorEdit()
                      if (e.key === 'Escape') setEditingAuthor(null)
                    }}
                  />
                </div>
              ) : (
                <span
                  key={`${a.firstName}-${a.lastName}-${i}`}
                  className={[
                    'cursor-text truncate',
                    isDup ? 'text-white/35' : 'text-white/42 hover:text-white/75',
                  ].join(' ')}
                  onClick={() => {
                    if (isMerged) return
                    setEditingAuthor({ id: item.id, authorIndex: i, firstName: a.firstName || '', lastName: a.lastName || '' })
                  }}
                >
                  {[a.firstName, a.lastName ? a.lastName.toUpperCase() : ''].filter(Boolean).join(' ') || '—'}
                </span>
              )
            ))}
            {!isMerged && editingAuthorIndex == null && (
              <Button
                type="button"
                onClick={() => onAddCoAuthor?.(item.id)}
                className="mt-0.5 invisible inline-flex w-fit cursor-pointer items-center gap-0.5 rounded border border-white/10 bg-white/4 px-1.5 py-0.5 text-[0.72rem] text-white/35 transition-colors hover:border-cyan/30 hover:bg-cyan/[0.07] hover:text-cyan/70 group-hover/row:visible"
                title="Ajouter un·e co-auteur·ice"
              >
                <Plus size={9} /> co-auteur·ice
              </Button>
            )}
          </div>
          {/* Swap author ↔ edition */}
          {!isMerged && editingAuthorIndex == null && (
            <button
              type="button"
              onClick={() => onSwapFields?.(item.id, 'edition')}
              className="absolute -right-0.5 top-0 cursor-pointer rounded p-0.5 text-white/0 transition-colors group-hover/row:text-white/15 group-hover/row:hover:bg-white/8 group-hover/row:hover:text-cyan/70"
              title="Inverser auteur ↔ édition"
            >
              <ArrowRightLeft size={10} />
            </button>
          )}
        </div>

        {/* Axes */}
        <div className="py-0.5">
          <AxisDots
            axes={item.axes || []}
            onChange={(newAxes) => onUpdateAxes?.(item.id, newAxes)}
          />
        </div>

        {/* Edition */}
        <div className="min-w-0">
          {isEditEdition ? (
            <EditionPicker
              value={editingValue}
              onChange={(v) => setEditingValue(v)}
              knownEditions={knownEditions || []}
              className="w-full rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 font-mono text-[0.8rem] leading-snug text-white outline-none focus:border-cyan/35 focus:bg-white/8"
              placeholder="Édition"
              autoFocus
              onBlur={commitCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingCell(null)
              }}
              onCommit={commitCellEdit}
            />
          ) : (
            <span
              className={[
                'group/ed relative flex cursor-text items-center gap-1 wrap-break-word font-mono text-[0.8rem] leading-snug',
                item.edition ? (isDup ? 'text-white/30' : 'text-white/42 hover:text-white/75') : 'text-white/15',
              ].join(' ')}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'edition' })
                setEditingValue(item.edition || '')
              }}
            >
              {item.edition || '—'}
              {item.edition && (
                <>
                  <Info size={8} className="shrink-0 text-white/20" />
                  <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2 py-1 text-[0.72rem] font-normal text-white/55 opacity-0 shadow-lg transition-opacity group-hover/ed:opacity-100">
                    Apparaîtra sur le lien
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Page */}
        <div className="min-w-0">
          {isEditPage ? (
            <TextInput
              variant="table"
              autoFocus
              className="w-full rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 text-[0.8rem] focus:border-cyan/35 focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => commitCellEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'cursor-text font-mono text-[0.8rem]',
                item.page ? (isDup ? 'text-white/30' : 'text-white/42 hover:text-white/75') : 'text-white/15',
              ].join(' ')}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'page' })
                setEditingValue(item.page || '')
              }}
            >
              {item.page || '—'}
            </span>
          )}
        </div>

        {/* Citation bubble */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (isMerged) return
              if (isEditCitation) {
                setEditingCell(null)
              } else {
                setEditingCell({ id: item.id, field: 'citation' })
                setEditingValue(item.citation || '')
              }
            }}
            className={[
              'group/cit relative flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors',
              item.citation
                ? 'text-cyan/60 hover:text-cyan/90'
                : 'text-white/12 hover:text-white/35',
            ].join(' ')}
            title={item.citation || 'Ajouter une citation'}
          >
            <MessageSquare size={11} className={item.citation ? 'fill-cyan/20' : ''} />
            {item.citation && (
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 max-w-48 -translate-x-1/2 truncate whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2 py-1 text-[0.72rem] font-normal text-white/55 opacity-0 shadow-lg transition-opacity group-hover/cit:opacity-100">
                {item.citation}
              </span>
            )}
          </button>
        </div>

        {/* Year */}
        <div>
          {isEditYear ? (
            <TextInput
              variant="table"
              autoFocus
              type="number"
              className="w-full rounded border border-cyan/35 bg-white/8 px-1.5 py-0.5 text-[0.8rem] focus:border-cyan/35 focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => commitCellEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'flex cursor-text items-center gap-0.5 font-mono text-[0.8rem] tabular-nums',
                item.yearMissing
                  ? 'text-amber/85'
                  : item.year
                    ? (isDup ? 'text-white/30' : 'text-white/42 hover:text-white/75')
                    : 'text-white/15',
              ].join(' ')}
              title={item.yearMissing ? 'Année estimée — cliquer pour corriger' : undefined}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'year' })
                setEditingValue(item.year ? String(item.year) : '')
              }}
            >
              {item.yearMissing && <AlertTriangle size={9} className="shrink-0" />}
              {item.year || '—'}
            </span>
          )}
        </div>
      </div>

      {/* Citation input row */}
      {isEditCitation && (
        <div className="flex items-center gap-2 border-b border-white/4 bg-cyan/3 px-3 py-1.5">
          <MessageSquare size={10} className="shrink-0 text-cyan/40" />
          <TextInput
            variant="table"
            autoFocus
            className="flex-1 rounded border border-cyan/25 bg-white/6 px-2 py-0.5 text-[0.8rem] text-white/70 placeholder:text-white/20 focus:border-cyan/40 focus:bg-white/8"
            placeholder="Citation — ex: « Declaration of Sentiments » (cité dans Women Together)"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => commitCellEdit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCellEdit()
              if (e.key === 'Escape') setEditingCell(null)
            }}
          />
        </div>
      )}

      {/* Merge banner — duplicate not yet merged */}
      {isDup && !isMerged && (
        <div
          className={[
            'flex items-center justify-between gap-3 border-b border-white/4 px-3 py-1.5',
            isExact ? 'bg-red/5' : 'bg-amber/4',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <AlertTriangle
              size={10}
              className={isExact ? 'shrink-0 text-red/70' : 'shrink-0 text-amber/80'}
            />
            <span className={['text-[0.75rem]', isExact ? 'text-red/70' : 'text-amber/75'].join(' ')}>
              {isExact ? 'Doublon exact' : 'Doublon possible'} —
            </span>
            <span className="truncate font-mono text-[0.75rem] italic text-white/38">
              {[item.existingNode?.firstName, item.existingNode?.lastName].filter(Boolean).join(' ')}
              {item.existingNode?.firstName || item.existingNode?.lastName ? ', ' : ''}
              {item.existingNode?.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              onClick={() => handleMerge(item)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-cyan/20 bg-cyan/5 px-2 py-0.5 text-[0.72rem] font-semibold text-cyan/60 transition-all hover:bg-cyan/12 hover:text-cyan/90"
            >
              <GitMerge size={9} /> Fusionner
            </Button>
            <button
              type="button"
              onClick={() => onDismissDuplicate(item.id)}
              className="cursor-pointer rounded p-0.5 text-white/20 transition-colors hover:text-white/50"
              title="Ignorer"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Merged banner — book merged, link info still editable */}
      {isMerged && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-white/4 bg-green/3 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <Check size={10} className="shrink-0 text-green/55" />
            <span className="text-[0.75rem] text-green/50">Ouvrage fusionné</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {masterNode && (
              <>
                <Link2 size={9} className="shrink-0 text-cyan/40" />
                <EditionPicker
                  value={item.edition || ''}
                  onChange={(v) => onUpdateField(item.id, 'edition', v)}
                  knownEditions={knownEditions || []}
                  className="w-28 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.75rem] leading-snug text-white/55 outline-none placeholder:text-white/20 transition-colors focus:border-cyan/30 focus:bg-white/8"
                  placeholder="Édition"
                  onCommit={() => {}}
                />
                <TextInput
                  variant="table"
                  value={item.page || ''}
                  onChange={(e) => onUpdateField(item.id, 'page', e.target.value)}
                  className="w-14 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.75rem] leading-snug text-white/55 outline-none placeholder:text-white/20 transition-colors focus:border-cyan/30 focus:bg-white/8"
                  placeholder="page / vol."
                />
              </>
            )}
            <button
              type="button"
              onClick={() => handleUnmerge(item)}
              className="cursor-pointer rounded px-1.5 py-0.5 text-[0.72rem] text-white/30 transition-colors hover:bg-white/5 hover:text-white/55"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

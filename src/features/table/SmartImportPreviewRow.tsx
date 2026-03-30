import { AlertTriangle, Check, GitMerge, Info, Plus } from 'lucide-react'
import Button from '../../components/ui/Button'
import TextInput from '../../components/ui/TextInput'
import { AxisDots } from './TableSubcomponents'

export default function SmartImportPreviewRow({
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
  onAddCoAuthor,
  onUpdateAxes,
}) {
  const isEditTitle = editingCell?.id === item.id && editingCell?.field === 'title'
  const isEditEdition = editingCell?.id === item.id && editingCell?.field === 'edition'
  const isEditYear = editingCell?.id === item.id && editingCell?.field === 'year'
  const editingAuthorIndex = editingAuthor?.id === item.id ? editingAuthor.authorIndex : null
  const isMerged = mergedIds.has(item.id)
  const isExact = item.isDuplicate
  const isFuzzy = item.isFuzzyDuplicate
  const isDup = isExact || isFuzzy

  return (
    <div>
      <div
        className={[
          'grid grid-cols-[28px_1fr_150px_100px_120px_64px] items-start gap-x-1 border-b border-white/4 px-3 py-1.5 transition-colors',
          isMerged ? 'opacity-40' : '',
          isExact && !isMerged ? 'bg-[rgba(255,70,70,0.03)]' : '',
          isFuzzy && !isMerged ? 'bg-[rgba(255,180,60,0.03)]' : '',
          !isDup && checked.has(item.id) ? 'bg-white/2' : '',
        ].join(' ')}
      >
        {/* Checkbox */}
        {isExact && !isMerged ? (
          <AlertTriangle size={12} className="text-[rgba(255,90,90,0.7)]" />
        ) : isMerged ? (
          <Check size={12} className="text-[rgba(0,255,135,0.6)]" />
        ) : (
          <Button
            type="button"
            onClick={() => toggleItem(item.id)}
            className={[
              'flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
              checked.has(item.id)
                ? 'border-[rgba(0,255,135,0.6)] bg-[rgba(0,255,135,0.15)]'
                : isFuzzy
                  ? 'border-[rgba(255,180,60,0.45)] hover:border-[rgba(255,180,60,0.7)]'
                  : 'border-white/20 hover:border-white/38',
            ].join(' ')}
          >
            {checked.has(item.id) && <Check size={10} className="text-[#00FF87]" />}
          </Button>
        )}

        {/* Title */}
        <div className="min-w-0 pr-2">
          {isEditTitle ? (
            <TextInput
              variant="table"
              autoFocus
              className="w-full rounded border border-[rgba(140,220,255,0.35)] bg-white/8 px-1.5 py-0.5 text-[0.75rem] focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={commitCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'cursor-text truncate font-mono text-[0.76rem]',
                isDup ? 'text-white/55' : 'text-white hover:text-white/80',
              ].join(' ')}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'title' })
                setEditingValue(item.title)
              }}
            >
              {item.title || <em className="text-white/30">Sans titre</em>}
            </span>
          )}
        </div>

        {/* Author */}
        <div className="min-w-0 pr-1">
          <div className="flex flex-col gap-0.5 font-mono text-[0.7rem]">
            {(item.authors?.length > 0 ? item.authors : [{ firstName: item.firstName, lastName: item.lastName }]).map((a, i) => (
              editingAuthorIndex === i ? (
                <div
                  key={i}
                  className="flex gap-0.5"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) commitAuthorEdit()
                  }}
                >
                  <TextInput
                    variant="table"
                    autoFocus
                    className="w-[45%] rounded border border-[rgba(140,220,255,0.35)] bg-white/8 px-1.5 py-0.5 text-[0.7rem] focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8"
                    placeholder="Prénom"
                    value={editingAuthor.firstName}
                    onChange={(e) => setEditingAuthor((p) => ({ ...p, firstName: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAuthorEdit()
                      if (e.key === 'Escape') setEditingAuthor(null)
                    }}
                  />
                  <TextInput
                    variant="table"
                    className="w-[55%] rounded border border-[rgba(140,220,255,0.35)] bg-white/8 px-1.5 py-0.5 text-[0.7rem] focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8"
                    placeholder="Nom"
                    value={editingAuthor.lastName}
                    onChange={(e) => setEditingAuthor((p) => ({ ...p, lastName: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAuthorEdit()
                      if (e.key === 'Escape') setEditingAuthor(null)
                    }}
                  />
                </div>
              ) : (
                <span
                  key={i}
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
                className="mt-0.5 inline-flex w-fit cursor-pointer items-center gap-0.5 rounded border border-white/10 bg-white/4 px-1.5 py-0.5 text-[0.58rem] text-white/35 transition-colors hover:border-[rgba(140,220,255,0.3)] hover:bg-[rgba(140,220,255,0.07)] hover:text-[rgba(140,220,255,0.7)]"
                title="Ajouter un·e co-auteur·ice"
              >
                <Plus size={9} /> co-auteur·ice
              </Button>
            )}
          </div>
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
            <TextInput
              variant="table"
              autoFocus
              className="w-full rounded border border-[rgba(140,220,255,0.35)] bg-white/8 px-1.5 py-0.5 text-[0.7rem] focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={commitCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'group/ed relative flex cursor-text items-center gap-1 truncate font-mono text-[0.7rem]',
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
                  <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-white/10 bg-[rgba(10,8,30,0.95)] px-2 py-1 text-[0.58rem] font-normal text-white/55 opacity-0 shadow-lg transition-opacity group-hover/ed:opacity-100">
                    Apparaîtra sur le lien
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Year */}
        <div>
          {isEditYear ? (
            <TextInput
              variant="table"
              autoFocus
              type="number"
              className="w-full rounded border border-[rgba(140,220,255,0.35)] bg-white/8 px-1.5 py-0.5 text-[0.7rem] focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={commitCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCellEdit()
                if (e.key === 'Escape') setEditingCell(null)
              }}
            />
          ) : (
            <span
              className={[
                'flex cursor-text items-center gap-0.5 font-mono text-[0.7rem] tabular-nums',
                item.yearMissing
                  ? 'text-[rgba(255,180,60,0.85)]'
                  : isDup ? 'text-white/30' : 'text-white/42 hover:text-white/75',
              ].join(' ')}
              title={item.yearMissing ? 'Année estimée — cliquer pour corriger' : undefined}
              onClick={() => {
                if (isMerged) return
                setEditingCell({ id: item.id, field: 'year' })
                setEditingValue(String(item.year))
              }}
            >
              {item.yearMissing && <AlertTriangle size={9} className="shrink-0" />}
              {item.year}
            </span>
          )}
        </div>
      </div>

      {/* Duplicate warning banner */}
      {isDup && !isMerged && (
        <div
          className={[
            'flex items-center justify-between gap-3 border-b border-white/4 px-3 py-1.5 last:border-0',
            isExact ? 'bg-[rgba(255,70,70,0.05)]' : 'bg-[rgba(255,180,60,0.04)]',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <AlertTriangle
              size={10}
              className={isExact ? 'shrink-0 text-[rgba(255,90,90,0.7)]' : 'shrink-0 text-[rgba(255,200,80,0.8)]'}
            />
            <span className={[
              'text-[0.65rem]',
              isExact ? 'text-[rgba(255,110,110,0.7)]' : 'text-[rgba(255,200,100,0.75)]',
            ].join(' ')}>
              {isExact ? 'Doublon exact' : 'Doublon possible'} —
            </span>
            <span className="truncate font-mono text-[0.65rem] italic text-white/38">
              {item.existingNode?.title}
            </span>
          </div>
          <Button
            type="button"
            onClick={() => handleMerge(item)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[rgba(140,220,255,0.2)] bg-[rgba(140,220,255,0.05)] px-2 py-0.5 text-[0.62rem] font-semibold text-[rgba(140,220,255,0.6)] transition-all hover:bg-[rgba(140,220,255,0.12)] hover:text-[rgba(140,220,255,0.9)]"
          >
            <GitMerge size={9} /> Fusionner
          </Button>
        </div>
      )}
    </div>
  )
}

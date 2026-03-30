import { AlertTriangle, Check, Link2, Loader2, Zap } from 'lucide-react'
import SmartImportPreviewRow from './SmartImportPreviewRow'

export default function SmartImportPreviewPhase({
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
  onAddCoAuthor,
  onUpdateAxes,
  masterNode,
  selectedCount,
  injected,
  inserting,
  handleClose,
}) {
  const exactCount = parsed.filter((r) => r.isDuplicate).length
  const fuzzyCount = parsed.filter((r) => r.isFuzzyDuplicate).length

  return (
    <>
      {/* Stats bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.72rem]">
        <span className="text-white/40">
          {parsed.length} ligne{parsed.length > 1 ? 's' : ''} détectée{parsed.length > 1 ? 's' : ''}
        </span>
        {exactCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-[rgba(255,70,70,0.3)] bg-[rgba(255,70,70,0.07)] px-2 py-0.5 text-[rgba(255,110,110,0.8)]">
            <AlertTriangle size={9} />
            {exactCount} doublon{exactCount > 1 ? 's' : ''} exact{exactCount > 1 ? 's' : ''}
          </span>
        )}
        {fuzzyCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-[rgba(255,180,60,0.3)] bg-[rgba(255,180,60,0.07)] px-2 py-0.5 text-[rgba(255,200,100,0.8)]">
            <AlertTriangle size={9} />
            {fuzzyCount} doublon{fuzzyCount > 1 ? 's' : ''} possible{fuzzyCount > 1 ? 's' : ''}
          </span>
        )}
        {masterNode && (
          <span className="flex items-center gap-1 rounded-full border border-[rgba(140,220,255,0.25)] bg-[rgba(140,220,255,0.06)] px-2 py-0.5 text-[rgba(140,220,255,0.65)]">
            <Link2 size={9} /> → {masterNode.title}
          </span>
        )}
        <span className="ml-auto text-[0.65rem] text-white/22">Cliquer pour modifier</span>
      </div>

      {/* Table */}
      <div className="mb-4 overflow-hidden rounded-xl border border-white/8">
        <div className="grid grid-cols-[28px_1fr_150px_100px_64px] border-b border-white/6 bg-white/2.5 px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[1.3px] text-white/28">
          <span />
          <span>Titre</span>
          <span>Auteur·ice</span>
          <span>Axes</span>
          <span>Année</span>
        </div>
        <div className="max-h-[min(55vh,480px)] overflow-y-auto">
          {parsed.length === 0 && (
            <p className="p-4 text-center text-[0.73rem] text-white/30">Aucun ouvrage reconnu.</p>
          )}
          {parsed.map((item) => (
            <SmartImportPreviewRow
              key={item.id}
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
              onAddCoAuthor={onAddCoAuthor}
              onUpdateAxes={onUpdateAxes}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={selectedCount === 0 || injected || inserting}
          className={[
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
            injected
              ? 'border-[rgba(0,255,135,0.5)] bg-[rgba(0,255,135,0.1)] text-[#00FF87]'
              : 'border-[rgba(0,255,135,0.3)] bg-[rgba(0,255,135,0.06)] text-[rgba(0,255,135,0.75)] hover:bg-[rgba(0,255,135,0.12)]',
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
        </button>
      </div>
    </>
  )
}

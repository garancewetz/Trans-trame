import NodePicker from './NodePicker'

export default function LinkForm({
  onSubmit,
  onRequestBack,
  sourceId,
  setSourceId,
  targetId,
  setTargetId,
  selectedSource,
  selectedTarget,
  sourceSearch,
  setSourceSearch,
  targetSearch,
  setTargetSearch,
  sourceResults,
  targetResults,
  onRequestAddBook,
  inputClass,
  citationText,
  setCitationText,
  page,
  setPage,
  context,
  setContext,
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      {typeof onRequestBack === 'function' && (
        <button
          type="button"
          onClick={() => onRequestBack()}
          className="cursor-pointer bg-transparent text-left text-[0.78rem] font-semibold text-white/50 transition-colors hover:text-white"
        >
          &larr; Retour
        </button>
      )}
      <h3 className="border-b border-white/10 pb-2.5 text-[0.82rem] font-bold uppercase tracking-[2px] text-white/50">
        Nouveau lien
      </h3>
      <p className="-mt-2 text-[0.82rem] leading-relaxed text-white/35">
        Le livre <strong className="text-white/60">source</strong> cite le livre{' '}
        <strong className="text-white/60">cible</strong>.
      </p>

      <NodePicker
        label="Ce livre cite..."
        value={sourceSearch || (selectedSource ? `${selectedSource.title} — ${selectedSource.author}` : '')}
        query={sourceSearch}
        onChange={(e) => {
          if (sourceId) setSourceId('')
          setSourceSearch(e.target.value)
        }}
        placeholder={sourceId ? 'Changer le livre source…' : 'Rechercher le livre source…'}
        results={sourceResults}
        onPick={(n) => {
          setSourceId(n.id)
          setSourceSearch('')
        }}
        addButtonVisible
        onRequestAddBook={onRequestAddBook}
      />

      <div className="-my-2 text-center text-[1.2rem] tracking-[2px] text-[rgba(140,220,255,0.5)]">
        &darr;
      </div>

      <NodePicker
        label="...ce livre"
        value={targetSearch || (selectedTarget ? `${selectedTarget.title} — ${selectedTarget.author}` : '')}
        query={targetSearch}
        onChange={(e) => {
          if (targetId) setTargetId('')
          setTargetSearch(e.target.value)
        }}
        placeholder={targetId ? 'Changer le livre cible…' : 'Rechercher le livre cible…'}
        results={targetResults}
        onPick={(n) => {
          setTargetId(n.id)
          setTargetSearch('')
        }}
        addButtonVisible
        onRequestAddBook={onRequestAddBook}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Extrait / Lien
        </span>
        <textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="&laquo; L'extrait qui justifie le lien... &raquo;"
          value={citationText}
          onChange={(e) => setCitationText(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Page
          </span>
          <input className={inputClass} placeholder="p. 42" value={page} onChange={(e) => setPage(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Contexte
          </span>
          <input
            className={inputClass}
            placeholder="Chapitre 3..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-[rgba(140,220,255,0.7)] to-[rgba(80,160,255,0.9)] px-5 py-3.5 text-[0.85rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-[rgba(140,220,255,0.9)] hover:to-[rgba(80,160,255,1)] hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0"
      >
        Cr&eacute;er un lien
      </button>
    </form>
  )
}

import { ArrowLeft, Merge, Search, Sparkles, Trash2, X, Zap } from 'lucide-react'

export default function TableTopbar({
  onClose,
  tab,
  setTab,
  nodes,
  links,
  search,
  setSearch,
  linkSearch,
  setLinkSearch,
  selectedIds,
  mergeNodes,
  setMergeKeepId,
  setMergeConfirm,
  setMergeModal,
  handleBulkDelete,
  bulkDeleteConfirm,
  setBulkDeleteConfirm,
  orphans,
  setOrphanModal,
  setOrphanConfirm,
  duplicateGroups,
  setDedupeModal,
  setDedupeConfirm,
  onSmartImport,
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/8 px-5 py-2.5">
      <button
        onClick={onClose}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[0.7rem] font-semibold text-white/50 transition-all hover:border-white/20 hover:text-white"
        type="button"
      >
        <ArrowLeft size={12} /> Graph
      </button>

      <div className="flex rounded-lg border border-white/8 bg-white/3 p-0.5">
        {[
          { id: 'books', label: 'Ouvrages', count: nodes.length },
          { id: 'links', label: 'Liens', count: links.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setSearch(''); setLinkSearch('') }}
            className={[
              'cursor-pointer rounded-md px-3 py-1 text-[0.72rem] font-semibold transition-all',
              tab === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/38 hover:text-white/70',
            ].join(' ')}
          >
            {t.label}
            <span
              className={[
                'ml-1.5 rounded-full px-1.5 py-px text-[0.58rem] tabular-nums',
                tab === t.id ? 'bg-white/15 text-white/75' : 'bg-white/5 text-white/30',
              ].join(' ')}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-xs flex-1">
        <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/22" />
        <input
          className="w-full rounded-lg border border-white/8 bg-white/4 py-1.5 pl-7 pr-6 font-mono text-[0.75rem] text-white outline-none placeholder:text-white/18 focus:border-[rgba(140,220,255,0.28)] focus:bg-white/6 transition-all"
          placeholder={tab === 'books' ? 'Filtrer les ouvrages…' : 'Filtrer les liens…'}
          value={tab === 'books' ? search : linkSearch}
          onChange={(e) =>
            tab === 'books' ? setSearch(e.target.value) : setLinkSearch(e.target.value)
          }
        />
        {(tab === 'books' ? search : linkSearch) && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-white/22 hover:text-white"
            onClick={() => (tab === 'books' ? setSearch('') : setLinkSearch(''))}
            type="button"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {tab === 'books' && (
          <button
            type="button"
            onClick={onSmartImport}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(140,220,255,0.22)] bg-[rgba(140,220,255,0.05)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(140,220,255,0.6)] transition-all hover:border-[rgba(140,220,255,0.38)] hover:bg-[rgba(140,220,255,0.1)] hover:text-[rgba(140,220,255,0.9)]"
          >
            <Zap size={11} /> Import Magique
          </button>
        )}

        {tab === 'books' && selectedIds.size === 2 && (
          <button
            onClick={() => {
              setMergeKeepId(mergeNodes[0]?.id || null)
              setMergeConfirm(false)
              setMergeModal(true)
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(255,200,60,0.3)] bg-[rgba(255,200,60,0.07)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(255,210,100,0.75)] transition-all hover:bg-[rgba(255,200,60,0.14)]"
            type="button"
          >
            <Merge size={12} /> Fusionner les identités
          </button>
        )}

        {tab === 'books' && selectedIds.size > 0 && selectedIds.size !== 2 && (
          <button
            onClick={handleBulkDelete}
            onBlur={() => setBulkDeleteConfirm(false)}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              bulkDeleteConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
                : 'border-[rgba(255,70,70,0.22)] text-[rgba(255,90,90,0.55)] hover:bg-[rgba(255,70,70,0.07)]',
            ].join(' ')}
            type="button"
          >
            <Trash2 size={11} />
            {bulkDeleteConfirm ? `Confirmer (${selectedIds.size})` : `Supprimer (${selectedIds.size})`}
          </button>
        )}

        {tab === 'books' && (
          <button
            onClick={() => { setDedupeModal(true); setDedupeConfirm(false) }}
            disabled={duplicateGroups.length === 0}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              duplicateGroups.length > 0
                ? 'border-[rgba(255,180,60,0.28)] text-[rgba(255,200,100,0.65)] hover:bg-[rgba(255,180,60,0.08)] hover:text-[rgba(255,200,100,0.9)]'
                : 'cursor-default border-white/5 text-white/18',
            ].join(' ')}
            type="button"
            title={duplicateGroups.length > 0 ? `${duplicateGroups.length} groupe${duplicateGroups.length > 1 ? 's' : ''} de doublons` : 'Aucun doublon'}
          >
            <Merge size={11} />
            Doublons
            {duplicateGroups.length > 0 && <span className="tabular-nums">({duplicateGroups.length})</span>}
          </button>
        )}

        <button
          onClick={() => { setOrphanModal(true); setOrphanConfirm(false) }}
          disabled={orphans.length === 0}
          className={[
            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
            orphans.length > 0
              ? 'border-white/10 text-white/40 hover:border-[rgba(255,210,0,0.28)] hover:text-[rgba(255,210,100,0.75)]'
              : 'cursor-default border-white/5 text-white/18',
          ].join(' ')}
          type="button"
          title={orphans.length > 0 ? `${orphans.length} ouvrage${orphans.length > 1 ? 's' : ''} sans lien` : 'Aucun orphelin'}
        >
          <Sparkles size={11} />
          Orphelins
          {orphans.length > 0 && <span className="tabular-nums">({orphans.length})</span>}
        </button>
      </div>
    </div>
  )
}

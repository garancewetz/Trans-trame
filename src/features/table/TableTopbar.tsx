import { ArrowLeft, Merge, Search, Sparkles, X, Zap } from 'lucide-react'
import Button from '../../components/ui/Button'
import TextInput from '../../components/ui/TextInput'

export default function TableTopbar({
  onClose,
  tab,
  setTab,
  nodes,
  links,
  authors,
  search,
  setSearch,
  linkSearch,
  setLinkSearch,
  authorSearch,
  setAuthorSearch,
  selectedIds: _selectedIds,
  orphans,
  setOrphanModal,
  setOrphanConfirm,
  duplicateGroups,
  authorDuplicateGroups,
  setDedupeModal,
  setDedupeConfirm,
  setAuthorDedupeModal,
  setAuthorDedupeConfirm,
  onSmartImport,
}) {
  void _selectedIds
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/8 px-5 py-2.5">
      <Button
        onClick={onClose}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[0.7rem] font-semibold text-white/50 transition-all hover:border-white/20 hover:text-white"
        type="button"
      >
        <ArrowLeft size={12} /> Graph
      </Button>

      <div className="flex rounded-lg border border-white/8 bg-white/3 p-0.5">
        {[
          { id: 'books', label: 'Ouvrages', count: nodes.length },
          { id: 'authors', label: 'Auteur·ices', count: authors.length },
          { id: 'links', label: 'Liens', count: links.length },
        ].map((t) => (
          <Button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setSearch(''); setLinkSearch(''); setAuthorSearch('') }}
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
          </Button>
        ))}
      </div>

      <div className="relative max-w-xs flex-1">
        <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/22" />
        <TextInput
          variant="table"
          className="rounded-lg border-white/8 bg-white/4 py-1.5 pl-7 pr-6 text-[0.75rem] focus:border-[rgba(140,220,255,0.28)] focus:bg-white/6"
          placeholder={tab === 'books' ? 'Filtrer les ouvrages…' : tab === 'authors' ? 'Filtrer les auteur·ices…' : 'Filtrer les liens…'}
          value={tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch}
          onChange={(e) => tab === 'books' ? setSearch(e.target.value) : tab === 'authors' ? setAuthorSearch(e.target.value) : setLinkSearch(e.target.value)}
        />
        {(tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch) && (
          <Button
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-white/22 hover:text-white"
            onClick={() => tab === 'books' ? setSearch('') : tab === 'authors' ? setAuthorSearch('') : setLinkSearch('')}
            type="button"
          >
            <X size={11} />
          </Button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          onClick={onSmartImport}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(140,220,255,0.22)] bg-[rgba(140,220,255,0.05)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(140,220,255,0.6)] transition-all hover:border-[rgba(140,220,255,0.38)] hover:bg-[rgba(140,220,255,0.1)] hover:text-[rgba(140,220,255,0.9)]"
        >
          <Zap size={11} /> Import Magique
        </Button>

        {tab === 'books' && (
          <Button
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
          </Button>
        )}

        {tab === 'authors' && (
          <Button
            onClick={() => { setAuthorDedupeModal?.(true); setAuthorDedupeConfirm?.(false) }}
            disabled={(authorDuplicateGroups || []).length === 0}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              (authorDuplicateGroups || []).length > 0
                ? 'border-[rgba(255,180,60,0.28)] text-[rgba(255,200,100,0.65)] hover:bg-[rgba(255,180,60,0.08)] hover:text-[rgba(255,200,100,0.9)]'
                : 'cursor-default border-white/5 text-white/18',
            ].join(' ')}
            type="button"
            title={(authorDuplicateGroups || []).length > 0 ? `${authorDuplicateGroups.length} groupe${authorDuplicateGroups.length > 1 ? 's' : ''} de doublons` : 'Aucun doublon'}
          >
            <Merge size={11} />
            Doublons
            {(authorDuplicateGroups || []).length > 0 && <span className="tabular-nums">({authorDuplicateGroups.length})</span>}
          </Button>
        )}

        <Button
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
        </Button>
      </div>
    </div>
  )
}

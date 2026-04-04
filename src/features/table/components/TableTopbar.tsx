import { ArrowLeft, Merge, Search, Sparkles, X, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'

export function TableTopbar({
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
        variant="outline"
        outlineWeight="muted"
        icon={<ArrowLeft size={12} />}
        onClick={onClose}
        type="button"
      >
        Graph
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
            variant="chip"
            selected={tab === t.id}
            onClick={() => { setTab(t.id); setSearch(''); setLinkSearch(''); setAuthorSearch('') }}
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
          className="rounded-lg border-white/8 bg-white/4 py-1.5 pl-7 pr-6 text-[0.75rem] focus:border-cyan/[0.28] focus:bg-white/6"
          placeholder={tab === 'books' ? 'Filtrer les ouvrages…' : tab === 'authors' ? 'Filtrer les auteur·ices…' : 'Filtrer les liens…'}
          value={tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch}
          onChange={(e) => tab === 'books' ? setSearch(e.target.value) : tab === 'authors' ? setAuthorSearch(e.target.value) : setLinkSearch(e.target.value)}
        />
        {(tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch) && (
          <Button
            variant="ghost"
            layout="inline"
            tone="muted"
            className="absolute right-2 top-1/2 -translate-y-1/2"
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
          variant="outline"
          outlineWeight="accent"
          tone="magic"
          icon={<Zap size={11} />}
          onClick={onSmartImport}
        >
          Import Magique
        </Button>

        {tab === 'books' && (
          <Button
            variant="outline"
            outlineWeight="faint"
            tone="warning"
            emphasis={duplicateGroups.length > 0}
            icon={<Merge size={11} />}
            onClick={() => { setDedupeModal(true); setDedupeConfirm(false) }}
            disabled={duplicateGroups.length === 0}
            type="button"
            title={duplicateGroups.length > 0 ? `${duplicateGroups.length} groupe${duplicateGroups.length > 1 ? 's' : ''} de doublons` : 'Aucun doublon'}
          >
            Doublons
            {duplicateGroups.length > 0 && <span className="tabular-nums">({duplicateGroups.length})</span>}
          </Button>
        )}

        {tab === 'authors' && (
          <Button
            variant="outline"
            outlineWeight="faint"
            tone="warning"
            emphasis={(authorDuplicateGroups || []).length > 0}
            icon={<Merge size={11} />}
            onClick={() => { setAuthorDedupeModal?.(true); setAuthorDedupeConfirm?.(false) }}
            disabled={(authorDuplicateGroups || []).length === 0}
            type="button"
            title={(authorDuplicateGroups || []).length > 0 ? `${authorDuplicateGroups.length} groupe${authorDuplicateGroups.length > 1 ? 's' : ''} de doublons` : 'Aucun doublon'}
          >
            Doublons
            {(authorDuplicateGroups || []).length > 0 && <span className="tabular-nums">({authorDuplicateGroups.length})</span>}
          </Button>
        )}

        <Button
          variant="outline"
          outlineWeight="faint"
          tone="orphan"
          emphasis={orphans.length > 0}
          icon={<Sparkles size={11} />}
          onClick={() => { setOrphanModal(true); setOrphanConfirm(false) }}
          disabled={orphans.length === 0}
          type="button"
          title={orphans.length > 0 ? `${orphans.length} ouvrage${orphans.length > 1 ? 's' : ''} sans lien` : 'Aucun orphelin'}
        >
          Orphelins
          {orphans.length > 0 && <span className="tabular-nums">({orphans.length})</span>}
        </Button>
      </div>
    </div>
  )
}

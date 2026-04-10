import { useState } from 'react'
import { ArrowLeft, Download, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { exportFullDatabase } from '@/features/graph/api/graphDataApi'
import type { Author, Book, Link } from '@/types/domain'

type TabId = 'books' | 'authors' | 'links'

type Props = {
  onClose: () => void
  tab: TabId | undefined
  setTab: (tab: TabId | undefined) => void
  nodes: Book[]
  links: Link[]
  authors: Author[]
  setSearch: (value: string) => void
  setLinkSearch: (value: string) => void
  setAuthorSearch: (value: string) => void
  onSmartImport: () => void
}

export function TableTopbar({
  onClose,
  tab,
  setTab,
  nodes,
  links,
  authors,
  setSearch,
  setLinkSearch,
  setAuthorSearch,
  onSmartImport,
}: Props) {
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
        {([
          { id: 'books' as const, label: 'Ouvrages', count: nodes.length },
          { id: 'authors' as const, label: 'Auteur·ices', count: authors.length },
          { id: 'links' as const, label: 'Liens', count: links.length },
        ]).map((t) => (
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
                'ml-1.5 rounded-full px-1.5 py-px text-[0.72rem] tabular-nums',
                tab === t.id ? 'bg-white/15 text-white/75' : 'bg-white/5 text-white/30',
              ].join(' ')}
            >
              {t.count}
            </span>
          </Button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ExportButton />
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
      </div>
    </div>
  )
}

function ExportButton() {
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      await exportFullDatabase()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      outlineWeight="muted"
      icon={<Download size={11} />}
      onClick={handleExport}
      disabled={busy}
    >
      {busy ? 'Export...' : 'Exporter tout (JSON)'}
    </Button>
  )
}

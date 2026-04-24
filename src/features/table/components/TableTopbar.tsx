import { useState } from 'react'
import { ArrowLeft, Clock, Download, Flag, Layers, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/Button'
import { exportFullDatabase } from '@/features/graph/api/graphDataApi'
import { formatSupabaseError } from '@/core/supabaseErrors'
import { devWarn } from '@/common/utils/logger'
import { countReviewItems } from './tabs/ReviewTab'
import type { TableTabId, DrawerTool } from '@/core/TableUiContext'
import type { Author, Book, Link } from '@/types/domain'

type Props = {
  onClose: () => void
  tab: TableTabId
  setTab: (tab: TableTabId) => void
  nodes: Book[]
  links: Link[]
  authors: Author[]
  setSearch: (value: string) => void
  setLinkSearch: (value: string) => void
  setAuthorSearch: (value: string) => void
  onSmartImport: () => void
  drawerTool: DrawerTool
  setDrawerTool: (t: DrawerTool) => void
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
  drawerTool,
  setDrawerTool,
}: Props) {
  const reviewCount = countReviewItems(nodes, authors)
  const toggleDrawer = (next: Exclude<DrawerTool, null>) =>
    setDrawerTool(drawerTool === next ? null : next)

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle px-5 py-2.5">
      <Button
        variant="outline"
        outlineWeight="muted"
        icon={<ArrowLeft size={12} />}
        onClick={onClose}
        type="button"
      >
        Graph
      </Button>

      <div className="flex rounded-lg border border-border-subtle bg-white/3 p-0.5">
        {([
          { id: 'books' as const, label: 'Ressources', count: nodes.length },
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
                'ml-1.5 rounded-full px-1.5 py-px text-micro tabular-nums',
                tab === t.id ? 'bg-white/15 text-white/75' : 'bg-white/5 text-text-muted',
              ].join(' ')}
            >
              {t.count}
            </span>
          </Button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          outlineWeight="muted"
          icon={<Layers size={12} />}
          selected={drawerTool === 'subaxes'}
          onClick={() => toggleDrawer('subaxes')}
          title="Autres disciplines — sous-axes convoqués par le corpus (philo, socio, littérature…)"
          aria-label="Ouvrir le panneau des autres disciplines"
          aria-pressed={drawerTool === 'subaxes'}
        >
          Disciplines
        </Button>

        <Button
          type="button"
          variant="outline"
          outlineWeight="muted"
          icon={<Clock size={12} />}
          selected={drawerTool === 'history'}
          onClick={() => toggleDrawer('history')}
          title="Historique — audit log et rollback"
          aria-label="Ouvrir l'historique"
          aria-pressed={drawerTool === 'history'}
        >
          Historique
        </Button>

        <Button
          type="button"
          variant="outline"
          outlineWeight="muted"
          icon={<Flag size={12} className={reviewCount > 0 ? 'text-amber/80' : undefined} />}
          selected={drawerTool === 'review'}
          onClick={() => toggleDrawer('review')}
          title={reviewCount > 0 ? `${reviewCount} élément${reviewCount > 1 ? 's' : ''} à relire` : 'Aucun élément à relire'}
          aria-label="Ouvrir la liste à relire"
          aria-pressed={drawerTool === 'review'}
        >
          À relire
          {reviewCount > 0 && (
            <span
              className={[
                'ml-1 rounded-full px-1.5 py-px text-micro tabular-nums',
                drawerTool === 'review' ? 'bg-amber/25 text-amber' : 'bg-amber/12 text-amber/70',
              ].join(' ')}
            >
              {reviewCount}
            </span>
          )}
        </Button>

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
      toast.success('Export JSON téléchargé')
    } catch (err) {
      devWarn('[export] Failed to export database', err)
      toast.error(`Export échoué : ${formatSupabaseError(err, 'erreur inconnue')}`)
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

import { Eye, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import type { Book } from '@/types/domain'
import { bookAuthorDisplay, bookAuthorSortKey, buildAuthorsMap } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { PANEL_WIDTH } from '@/common/constants/panels'
import { useAppData } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'
import { useFilter } from '@/core/FilterContext'
import { usePanelVisibility } from '@/core/PanelVisibilityContext'

type TextsPanelProps = {
  open: boolean
  onClose?: () => void
}

export function TextsPanel({
  open,
  onClose,
}: TextsPanelProps) {
  const { graphData, authors } = useAppData()
  const selection = useSelection()
  const filter = useFilter()
  const panels = usePanelVisibility()

  const nodes = graphData.nodes
  const peekNodeId = selection.peekNodeId

  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setQ(''))
  }, [open])

  const authorsMap = useMemo(() => buildAuthorsMap(authors ?? []), [authors])

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    const list = !query
      ? nodes
      : nodes.filter((n) => {
      const title = (n.title || '').toLowerCase()
      const author = bookAuthorDisplay(n, authorsMap).toLowerCase()
      const year = String(n.year ?? '')
      return title.includes(query) || author.includes(query) || year.includes(query)
    })
    return [...list].sort((a, b) =>
      bookAuthorSortKey(a, authorsMap).localeCompare(bookAuthorSortKey(b, authorsMap), 'fr', { sensitivity: 'base' })
    )
  }, [q, nodes, authorsMap])

  const onSelectNode = useCallback((node: Book) => {
    selection.selectNode(node)
    filter.setSelectedAuthor(null)
    panels.setTextsPanelOpen(false)
  }, [selection, filter, panels])

  const onPeekNode = useCallback((node: Book) => {
    selection.setPeekNodeId(node.id)
    filter.setSelectedAuthor(null)
    selection.setSelectedNode(null)
    selection.setSelectedLink(null)
    selection.setLinkContextNode(null)
    selection.setPanelTab('details')
  }, [selection, filter])

  const onOpenWorkDetail = useCallback((bookId: string) => {
    const node = nodes.find((n) => n.id === bookId)
    if (node) {
      selection.selectNode(node)
      panels.setTextsPanelOpen(false)
    }
  }, [nodes, selection, panels])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <aside
      className={[
        `fixed left-0 top-0 z-50 h-screen ${PANEL_WIDTH.default} overflow-hidden border-r border-white/10 bg-bg-overlay/92 backdrop-blur-2xl transition-transform duration-300 ease-in-out`,
        open ? 'translate-x-0' : '-translate-x-[420px]',
      ].join(' ')}
    >
      <div className="flex h-full flex-col px-4 pt-4">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[1rem] font-semibold text-white/90">Textes</h2>
            <p className="text-[0.8rem] text-white/40">{nodes.length} au total</p>
          </div>

          <Button
            type="button"
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </Button>
        </div>

        <SearchInputWithClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un texte..."
          focusTone="violet"
          className="mb-4 shrink-0"
        />

        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-[0.9rem] text-white/40">Aucun texte trouvé.</p>
        ) : (
          <Virtuoso
            className="flex-1 pb-6"
            totalCount={filtered.length}
            itemContent={(index) => {
              const n = filtered[index]
              const isPeeked = peekNodeId === n.id
              return (
                <div
                  className={[
                    'mb-2 flex w-full items-stretch gap-1 rounded-lg border backdrop-blur-xl transition-all',
                    isPeeked
                      ? 'border-violet/45 bg-violet/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8',
                  ].join(' ')}
                >
                  <Button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
                    onClick={() => onSelectNode(n)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full backdrop-blur-md"
                      style={{ background: axesGradient(n.axes) }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[0.95rem] font-semibold text-white/85">{n.title}</div>
                      <div className="truncate text-label text-white/35">
                        {bookAuthorDisplay(n, authorsMap)}
                        {n.year ? ` — ${n.year}` : ''}
                      </div>
                    </div>
                  </Button>
                  <div className="flex shrink-0 flex-col border-l border-white/10 sm:flex-row">
                    <Button
                      type="button"
                      className="cursor-pointer px-2.5 py-2 text-white/35 transition-colors hover:bg-white/10 hover:text-violet/95 sm:py-0"
                      aria-label={`Voir ce nœud sur la carte (${n.title})`}
                      title="Voir le nœud sur la carte (aperçu)"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPeekNode(n)
                      }}
                    >
                      <Eye size={18} strokeWidth={2} />
                    </Button>
                    <Button
                      type="button"
                      title="Grande fiche ouvrage"
                      className="inline-flex cursor-pointer items-center justify-center gap-1 border-t border-white/10 px-2 py-2 text-caption font-semibold text-white/40 transition-colors hover:bg-white/10 hover:text-violet/95 sm:border-l sm:border-t-0 sm:px-2.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenWorkDetail(n.id)
                      }}
                    >
                      Détails
                    </Button>
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>
    </aside>
  )
}

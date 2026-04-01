import { Eye, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Author, Book } from '@/types/domain'
import { bookAuthorDisplay, buildAuthorsMap } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'

type TextsPanelProps = {
  open: boolean
  onClose?: () => void
  nodes: Book[]
  authors?: Author[]
  onSelectNode?: (node: Book) => void
  onPeekNode?: (node: Book) => void
  peekNodeId?: string | null
  onOpenWorkDetail?: (bookId: string) => void
}

export function TextsPanel({
  open,
  onClose,
  nodes,
  authors = [],
  onSelectNode,
  onPeekNode,
  peekNodeId,
  onOpenWorkDetail,
}: TextsPanelProps) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setQ(''))
  }, [open])

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

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
      bookAuthorDisplay(a, authorsMap).localeCompare(bookAuthorDisplay(b, authorsMap), 'fr', { sensitivity: 'base' })
    )
  }, [q, nodes, authorsMap])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <aside
      className={[
        'fixed left-0 top-0 z-50 h-screen w-[380px] overflow-hidden border-r border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-2xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-[420px]',
      ].join(' ')}
    >
      <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[0.9rem] font-semibold text-white/90">Textes</h2>
            <p className="text-[0.7rem] text-white/40">{nodes.length} au total</p>
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
          className="mb-4"
        />

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun texte trouvé.</p>
          ) : (
            filtered.map((n) => {
              const isPeeked = peekNodeId === n.id
              return (
                <div
                  key={n.id}
                  className={[
                    'flex w-full items-stretch gap-1 rounded-lg border backdrop-blur-xl transition-all',
                    isPeeked
                      ? 'border-[rgba(168,130,255,0.45)] bg-[rgba(168,130,255,0.1)]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8',
                  ].join(' ')}
                >
                  <Button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
                    onClick={() => onSelectNode?.(n)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full backdrop-blur-md"
                      style={{ background: axesGradient(n.axes) }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[0.86rem] font-semibold text-white/85">{n.title}</div>
                      <div className="truncate text-[0.72rem] text-white/35">
                        {bookAuthorDisplay(n, authorsMap)}
                        {n.year ? ` — ${n.year}` : ''}
                      </div>
                    </div>
                  </Button>
                  <div className="flex shrink-0 flex-col border-l border-white/10 sm:flex-row">
                    {typeof onPeekNode === 'function' && (
                      <Button
                        type="button"
                        className="cursor-pointer px-2.5 py-2 text-white/35 transition-colors hover:bg-white/10 hover:text-[rgba(168,130,255,0.95)] sm:py-0"
                        aria-label={`Voir ce nœud sur la carte (${n.title})`}
                        title="Voir le nœud sur la carte (aperçu)"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPeekNode(n)
                        }}
                      >
                        <Eye size={18} strokeWidth={2} />
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={!onOpenWorkDetail}
                      title="Grande fiche ouvrage"
                      className={[
                        'inline-flex cursor-pointer items-center justify-center gap-1 border-t border-white/10 px-2 py-2 text-[0.65rem] font-semibold transition-colors sm:border-l sm:border-t-0 sm:px-2.5',
                        onOpenWorkDetail
                          ? 'text-white/40 hover:bg-white/10 hover:text-[rgba(200,170,255,0.95)]'
                          : 'cursor-not-allowed text-white/15',
                      ].join(' ')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenWorkDetail?.(n.id)
                      }}
                    >
                      Détails
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}


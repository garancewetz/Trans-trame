import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { authorName, authorSortKey } from '../../authorUtils'
import { axesGradient } from '../../categories'

export default function TextsPanel({ open, onClose, nodes, onSelectNode }) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    setQ('')
  }, [open])

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    const list = !query
      ? nodes
      : nodes.filter((n) => {
      const title = (n.title || '').toLowerCase()
      const author = authorName(n).toLowerCase()
      const year = String(n.year ?? '')
      return title.includes(query) || author.includes(query) || year.includes(query)
    })
    return [...list].sort((a, b) => authorSortKey(a).localeCompare(authorSortKey(b), 'fr', { sensitivity: 'base' }))
  }, [q, nodes])

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
        'fixed left-0 top-0 z-40 h-screen w-[380px] overflow-hidden border-r border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-2xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-[420px]',
      ].join(' ')}
    >
      <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[0.9rem] font-semibold text-white/90">Textes</h2>
            <p className="text-[0.7rem] text-white/40">{nodes.length} au total</p>
          </div>

          <button
            type="button"
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un texte..."
            className="w-full rounded-[10px] border border-white/10 bg-white/5 px-9 py-[9px] text-[0.82rem] text-white outline-none placeholder:text-white/25 backdrop-blur-lg transition-all focus:border-[rgba(168,130,255,0.4)] focus:bg-white/10"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun texte trouvé.</p>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/8"
                onClick={() => onSelectNode?.(n)}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full backdrop-blur-md"
                    style={{ background: axesGradient(n.axes) }}
                  />
                  <div className="min-w-0">
                  <div className="truncate text-[0.86rem] font-semibold text-white/85">{n.title}</div>
                  <div className="truncate text-[0.72rem] text-white/35">
                    {authorName(n)}
                    {n.year ? ` — ${n.year}` : ''}
                  </div>
                </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}


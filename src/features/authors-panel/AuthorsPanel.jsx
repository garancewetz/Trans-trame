import { Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { authorName } from '../../authorUtils'
import { axesGradient } from '../../categories'

export default function AuthorsPanel({
  open,
  onClose,
  nodes,
  selectedAuthor,
  onSelectAuthor,
  onAddWorkForAuthor,
  onOpenAddBookFromSearch,
}) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) queueMicrotask(() => setQ(''))
  }, [open])

  // Build sorted list of unique authors with their books
  const authors = useMemo(() => {
    const map = new Map()
    nodes.forEach((n) => {
      const name = authorName(n)
      if (!name) return
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(n)
    })
    return [...map.entries()]
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [nodes])

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return authors
    return authors.filter((a) => a.name.toLowerCase().includes(query))
  }, [q, authors])

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
            <h2 className="text-[0.9rem] font-semibold text-white/90">Auteur·ices</h2>
            <p className="text-[0.7rem] text-white/40">{authors.length} au total</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedAuthor && (
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-[rgba(255,180,130,0.3)] bg-[rgba(255,180,130,0.1)] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[rgba(255,200,160,0.9)] transition-colors hover:bg-[rgba(255,180,130,0.2)]"
                onClick={() => onSelectAuthor?.(null)}
              >
                Retirer le filtre
              </button>
            )}
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un·e auteur·ice..."
            className="w-full rounded-[10px] border border-white/10 bg-white/5 px-9 py-[9px] text-[0.82rem] text-white outline-none placeholder:text-white/25 backdrop-blur-lg transition-all focus:border-[rgba(255,180,130,0.4)] focus:bg-white/10"
          />
        </div>

        <div className="space-y-1">
          {filtered.length === 0 && q.trim() ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun·e auteur·ice trouvé·e pour cette recherche.</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun·e auteur·ice dans le graphe.</p>
          ) : (
            filtered.map((a) => {
              const isSelected = selectedAuthor === a.name
              return (
                <div key={a.name}>
                  <div
                    className={[
                      'flex w-full items-center gap-1 rounded-lg border px-2 py-1.5 backdrop-blur-xl transition-all',
                      isSelected
                        ? 'border-[rgba(255,180,130,0.35)] bg-[rgba(255,180,130,0.12)]'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      className={[
                        'flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1 text-left transition-colors',
                        isSelected ? 'hover:bg-[rgba(255,180,130,0.08)]' : 'hover:bg-white/5',
                      ].join(' ')}
                      onClick={() => onSelectAuthor?.(isSelected ? null : a.name)}
                    >
                      <span className={['truncate text-[0.86rem] font-semibold', isSelected ? 'text-[rgba(255,210,170,0.95)]' : 'text-white/85'].join(' ')}>
                        {a.name}
                      </span>
                      <span className={['shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums', isSelected ? 'bg-[rgba(255,180,130,0.2)] text-[rgba(255,200,160,0.8)]' : 'bg-white/10 text-white/50'].join(' ')}>
                        {a.books.length}
                      </span>
                    </button>
                    {typeof onAddWorkForAuthor === 'function' && (
                      <button
                        type="button"
                        className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-white/5 p-2 text-[rgba(255,200,160,0.85)] transition-colors hover:border-[rgba(255,180,130,0.4)] hover:bg-[rgba(255,180,130,0.12)] hover:text-white"
                        aria-label={`Ajouter un ouvrage pour ${a.name}`}
                        title="Ajouter un ouvrage pour cet auteur"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddWorkForAuthor(a.name)
                        }}
                      >
                        <Plus size={18} strokeWidth={2.25} />
                      </button>
                    )}
                  </div>

                  {/* Show books when author is selected */}
                  {isSelected && (
                    <div className="ml-3 mt-1 space-y-1 border-l border-white/8 pl-3">
                      {a.books
                        .slice()
                        .sort((x, y) => (x.year || 0) - (y.year || 0))
                        .map((n) => (
                          <div
                            key={n.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5"
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: axesGradient(n.axes) }}
                            />
                            <span className="truncate text-[0.76rem] text-white/55">
                              {n.title}
                              {n.year ? ` (${n.year})` : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {typeof onOpenAddBookFromSearch === 'function' && (
            <div className="mt-4">
              <button
                type="button"
                className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-[0.82rem] font-semibold text-white/70 transition-colors hover:border-[rgba(168,85,247,0.45)] hover:bg-[rgba(168,85,247,0.15)] hover:text-white"
                onClick={() => onOpenAddBookFromSearch(q)}
              >
                Ajouter un·e auteur·ice (nouvel ouvrage)
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

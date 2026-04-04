import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Author, Book } from '@/types/domain'
import { authorName } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'

type Props = {
  open: boolean
  onClose: () => void
  authors?: Author[]
  books?: Book[]
  selectedAuthorId: string | null
  onSelectAuthor?: (authorId: string | null) => void
  onAddWorkForAuthor?: (authorName?: string) => void
  onOpenAddBookFromSearch?: (searchQuery?: string) => void
}

export function AuthorsPanel({
  open,
  onClose,
  authors = [],
  books = [],
  selectedAuthorId,
  onSelectAuthor,
  onAddWorkForAuthor,
  onOpenAddBookFromSearch,
}: Props) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) queueMicrotask(() => setQ(''))
  }, [open])

  // Build sorted list of authors with their books (via authorIds)
  const authorEntries = useMemo(() => {
    return authors
      .map((a) => {
        const name = authorName(a)
        const authorBooks = books.filter((b) => b.authorIds?.includes(a.id))
        return { id: a.id, name, books: authorBooks, author: a }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [authors, books])

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return authorEntries
    return authorEntries.filter((a) => a.name.toLowerCase().includes(query))
  }, [q, authorEntries])

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
        'fixed left-0 top-0 z-50 h-screen w-[380px] overflow-hidden border-r border-white/10 bg-bg-overlay/92 backdrop-blur-2xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-[420px]',
      ].join(' ')}
    >
      <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[0.9rem] font-semibold text-white/90">Auteur·ices</h2>
            <p className="text-[0.7rem] text-white/40">{authorEntries.length} au total</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedAuthorId && (
              <Button
                type="button"
                className="cursor-pointer rounded-lg border border-peach/30 bg-peach/10 px-2.5 py-1.5 text-[0.72rem] font-semibold text-peach/90 transition-colors hover:bg-peach/20"
                onClick={() => onSelectAuthor?.(null)}
              >
                Retirer le filtre
              </Button>
            )}
            <Button
              type="button"
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <SearchInputWithClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un·e auteur·ice..."
          focusTone="amber"
          className="mb-4"
        />

        <div className="space-y-1">
          {filtered.length === 0 && q.trim() ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun·e auteur·ice trouvé·e pour cette recherche.</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-[0.8rem] text-white/40">Aucun·e auteur·ice dans le graphe.</p>
          ) : (
            filtered.map((a) => {
              const isSelected = selectedAuthorId === a.id
              return (
                <div key={a.id}>
                  <div
                    className={[
                      'flex w-full items-center gap-1 rounded-lg border px-2 py-1.5 backdrop-blur-xl transition-all',
                      isSelected
                        ? 'border-peach/35 bg-peach/12'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8',
                    ].join(' ')}
                  >
                    <Button
                      type="button"
                      className={[
                        'flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1 text-left transition-colors',
                        isSelected ? 'hover:bg-peach/8' : 'hover:bg-white/5',
                      ].join(' ')}
                      onClick={() => onSelectAuthor?.(isSelected ? null : a.id)}
                    >
                      <span className={['truncate text-[0.86rem] font-semibold', isSelected ? 'text-peach/95' : 'text-white/85'].join(' ')}>
                        {a.name}
                      </span>
                      <span className={['shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums', isSelected ? 'bg-peach/20 text-peach/80' : 'bg-white/10 text-white/50'].join(' ')}>
                        {a.books.length}
                      </span>
                    </Button>
                    {typeof onAddWorkForAuthor === 'function' && (
                      <Button
                        type="button"
                        className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-white/5 p-2 text-peach/80 transition-colors hover:border-peach/40 hover:bg-peach/12 hover:text-white"
                        aria-label={`Ajouter un ouvrage pour ${a.name}`}
                        title="Ajouter un ouvrage pour cet auteur"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddWorkForAuthor(a.name)
                        }}
                      >
                        <Plus size={18} strokeWidth={2.25} />
                      </Button>
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
              <Button
                type="button"
                className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-[0.82rem] font-semibold text-white/70 transition-colors hover:border-violet/45 hover:bg-violet/15 hover:text-white"
                onClick={() => onOpenAddBookFromSearch(q)}
              >
                Ajouter un·e auteur·ice (nouvel ouvrage)
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

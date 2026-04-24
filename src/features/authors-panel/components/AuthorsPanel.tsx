import clsx from 'clsx'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { authorName, authorSortKey } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { PanelHeader } from '@/common/components/ui/PanelHeader'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { PANEL_WIDTH } from '@/common/constants/panels'
import { ADMIN_ROUTE } from '@/common/utils/adminUrl'
import { useAppData } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'
import { useFilter } from '@/core/FilterContext'
import { usePanelVisibility } from '@/core/PanelVisibilityContext'

type Props = {
  open: boolean
  onClose: () => void
}

export function AuthorsPanel({
  open,
  onClose,
}: Props) {
  const { authors = [], books = [] } = useAppData()
  const selection = useSelection()
  const filter = useFilter()
  const panels = usePanelVisibility()
  const navigate = useNavigate()

  const selectedAuthorId = filter.selectedAuthor

  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) queueMicrotask(() => setQ(''))
  }, [open])

  const handleSelectAuthor = useCallback((authorId: string | null) => {
    selection.closePanel()
    if (authorId === null) { filter.setSelectedAuthor(null); return }
    filter.toggleSelectedAuthor(authorId)
  }, [selection, filter])

  const handleAddWorkForAuthor = useCallback(() => {
    navigate(ADMIN_ROUTE)
    panels.setAuthorsPanelOpen(false)
  }, [navigate, panels])

  const handleOpenAddBookFromSearch = useCallback(() => {
    navigate(ADMIN_ROUTE)
    panels.setAuthorsPanelOpen(false)
  }, [navigate, panels])

  // Build sorted list of authors with their books (via authorIds)
  const authorEntries = useMemo(() => {
    return authors
      .map((a) => {
        const name = authorName(a)
        const authorBooks = books.filter((b) => b.authorIds?.includes(a.id))
        return { id: a.id, name, books: authorBooks, author: a }
      })
      .sort((a, b) => authorSortKey(a.author).localeCompare(authorSortKey(b.author), 'fr', { sensitivity: 'base' }))
  }, [authors, books])

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return authorEntries
    return authorEntries.filter((a) => a.name.toLowerCase().includes(query))
  }, [q, authorEntries])

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
      className={clsx(
        `fixed left-0 top-0 z-50 h-screen ${PANEL_WIDTH.default} overflow-hidden border-r border-border-default bg-bg-overlay/92 backdrop-blur-2xl transition-transform duration-300 ease-in-out`,
        open ? 'translate-x-0' : '-translate-x-[420px]',
      )}
    >
      <div className="flex h-full flex-col px-4 pt-4">
        <PanelHeader
          title="Auteur·ices"
          subtitle={`${authorEntries.length} au total`}
          onClose={onClose}
          actions={
            selectedAuthorId && (
              <Button
                type="button"
                className="cursor-pointer rounded-lg border border-peach/30 bg-peach/10 px-2.5 py-1.5 text-label font-semibold text-peach/90 transition-colors hover:bg-peach/20"
                onClick={() => handleSelectAuthor(null)}
              >
                Retirer le filtre
              </Button>
            )
          }
        />

        <SearchInputWithClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un·e auteur·ice..."
          focusTone="amber"
          className="mb-4 shrink-0"
        />

        {filtered.length === 0 && q.trim() ? (
          <p className="px-3 py-3 text-[0.9rem] text-white/40">Aucun·e auteur·ice trouvé·e pour cette recherche.</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-3 text-[0.9rem] text-white/40">Aucun·e auteur·ice dans le graphe.</p>
        ) : (
          <Virtuoso
            className="flex-1 pb-6"
            totalCount={filtered.length}
            itemContent={(index) => {
              const a = filtered[index]
              const isSelected = selectedAuthorId === a.id
              return (
                <div className="mb-1">
                  <div
                    className={clsx(
                      'flex w-full items-center gap-1 rounded-lg border px-2 py-1.5 backdrop-blur-xl transition-all',
                      isSelected
                        ? 'border-peach/35 bg-peach/12'
                        : 'border-border-default bg-white/5 hover:border-white/20 hover:bg-white/8',
                    )}
                  >
                    <Button
                      type="button"
                      className={clsx(
                        'flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1 text-left transition-colors',
                        isSelected ? 'hover:bg-peach/8' : 'hover:bg-white/5',
                      )}
                      onClick={() => handleSelectAuthor(isSelected ? null : a.id)}
                    >
                      <span className={clsx('truncate text-[0.95rem] font-semibold', isSelected ? 'text-peach/95' : 'text-white/85')}>
                        {a.name}
                      </span>
                      <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[0.8rem] font-bold tabular-nums', isSelected ? 'bg-peach/20 text-peach/80' : 'bg-white/10 text-text-soft')}>
                        {a.books.length}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      className="shrink-0 cursor-pointer rounded-md border border-border-default bg-white/5 p-2 text-peach/80 transition-colors hover:border-peach/40 hover:bg-peach/12 hover:text-white"
                      aria-label={`Ajouter une ressource pour ${a.name}`}
                      title="Ajouter une ressource pour cet·te auteur·ice"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddWorkForAuthor()
                      }}
                    >
                      <Plus size={18} strokeWidth={2.25} />
                    </Button>
                  </div>

                  {/* Show books when author is selected */}
                  {isSelected && (
                    <div className="ml-3 mt-1 space-y-1 border-l border-border-subtle pl-3">
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
                            <span className="truncate text-ui text-text-soft">
                              {n.title}
                              {n.year ? ` (${n.year})` : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )
            }}
            components={{
              Footer: () => (
                <div className="mt-4 pb-6">
                  <Button
                    type="button"
                    className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-body font-semibold text-white/70 transition-colors hover:border-violet/45 hover:bg-violet/15 hover:text-white"
                    onClick={() => handleOpenAddBookFromSearch()}
                  >
                    Ajouter un·e auteur·ice (nouvel ressource)
                  </Button>
                </div>
              ),
            }}
          />
        )}
      </div>
    </aside>
  )
}

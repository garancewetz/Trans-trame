import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Modal } from '@/common/components/ui/Modal'
import type { Author, AuthorId, Book } from '@/types/domain'

type Item = { type: 'book'; data: Book } | { type: 'author'; data: Author }

type Props = {
  open: boolean
  onClose: () => void
  /** Selected books to show info for */
  selectedBooks?: Book[]
  /** Selected authors to show info for */
  selectedAuthors?: Author[]
  /** All books in dataset — used to find siblings from same batch */
  allBooks: Book[]
  /** All authors in dataset — used to find siblings from same batch */
  allAuthors: Author[]
  /** Author lookup for display */
  authorsMap: Map<AuthorId, Author>
}

/** Truncate ISO timestamp to the minute for batch grouping. */
function minuteKey(iso: string): string {
  return iso.slice(0, 16) // "2026-03-12T14:05"
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function authorDisplayName(a: Author): string {
  return [a.firstName, a.lastName].filter(Boolean).join(' ') || '(sans nom)'
}

function bookDisplayName(b: Book, authorsMap: Map<AuthorId, Author>): string {
  const authorNames = (b.authorIds || [])
    .map((id) => authorsMap.get(id))
    .filter(Boolean)
    .map((a) => authorDisplayName(a!))
    .join(', ')
  const parts = [b.title || '(sans titre)']
  if (authorNames) parts.push(authorNames)
  if (b.year) parts.push(String(b.year))
  return parts.join(' — ')
}

export function BatchInfoModal({
  open,
  onClose,
  selectedBooks = [],
  selectedAuthors = [],
  allBooks,
  allAuthors,
  authorsMap,
}: Props) {
  // Collect selected items with their timestamps
  const selectedItems = useMemo<Item[]>(() => [
    ...selectedBooks.map((b) => ({ type: 'book' as const, data: b })),
    ...selectedAuthors.map((a) => ({ type: 'author' as const, data: a })),
  ], [selectedBooks, selectedAuthors])

  // Build a map: minuteKey → sibling items (books + authors from dataset)
  const siblingsByMinute = useMemo(() => {
    const selectedIds = new Set([
      ...selectedBooks.map((b) => b.id),
      ...selectedAuthors.map((a) => a.id),
    ])

    const map = new Map<string, Item[]>()

    for (const b of allBooks) {
      const ts = b.created_at as string | undefined
      if (!ts) continue
      const key = minuteKey(ts)
      if (!map.has(key)) map.set(key, [])
      if (!selectedIds.has(b.id)) map.get(key)!.push({ type: 'book', data: b })
    }
    for (const a of allAuthors) {
      const ts = a.created_at as string | undefined
      if (!ts) continue
      const key = minuteKey(ts)
      if (!map.has(key)) map.set(key, [])
      if (!selectedIds.has(a.id)) map.get(key)!.push({ type: 'author', data: a })
    }
    return map
  }, [allBooks, allAuthors, selectedBooks, selectedAuthors])

  if (!open) return null

  return (
    <Modal
      open={open}
      title="Informations"
      titleIcon={<Info size={14} className="text-white/50" />}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
        {selectedItems.map((item) => {
          const ts = (item.data.created_at as string | undefined) || null
          const key = ts ? minuteKey(ts) : null
          const siblings = key ? siblingsByMinute.get(key) || [] : []
          const SAMPLE_LIMIT = 8

          return (
            <div
              key={item.data.id}
              className="rounded-lg border border-white/8 bg-white/2 p-4"
            >
              {/* Item header */}
              <div className="mb-2 flex items-baseline gap-2">
                <span className="rounded bg-white/8 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/30">
                  {item.type === 'book' ? 'Ressource' : 'Auteur·ice'}
                </span>
                <span className="font-medium text-white/80">
                  {item.type === 'book'
                    ? (item.data as Book).title || '(sans titre)'
                    : authorDisplayName(item.data as Author)}
                </span>
              </div>

              {/* Created at */}
              <p className="text-label text-white/50">
                {ts ? (
                  <>Ajouté·e le <span className="font-medium text-white/70">{formatDateTime(ts)}</span></>
                ) : (
                  <span className="text-white/30">Date d'ajout inconnue</span>
                )}
              </p>

              {/* Import context — which master book was this imported for? */}
              {item.type === 'book' && (item.data as Book).importSourceId && (() => {
                const sourceBook = allBooks.find((b) => b.id === (item.data as Book).importSourceId)
                return sourceBook ? (
                  <p className="mt-1 text-label text-white/50">
                    Importé·e pour la bibliographie de{' '}
                    <span className="font-medium text-white/70">
                      {bookDisplayName(sourceBook, authorsMap)}
                    </span>
                  </p>
                ) : null
              })()}

              {/* Siblings from same batch */}
              {siblings.length > 0 && (
                <div className="mt-3 border-t border-white/6 pt-3">
                  <p className="mb-2 text-caption font-medium text-white/35">
                    {siblings.length} autre{siblings.length > 1 ? 's' : ''} ajouté·e{siblings.length > 1 ? 's' : ''} au même moment
                  </p>
                  <ul className="flex flex-col gap-1">
                    {siblings.slice(0, SAMPLE_LIMIT).map((s) => (
                      <li key={s.data.id} className="flex items-baseline gap-2 text-caption">
                        <span className="shrink-0 rounded bg-white/6 px-1 py-px text-[0.6rem] uppercase tracking-wider text-white/25">
                          {s.type === 'book' ? 'livre' : 'auteur·ice'}
                        </span>
                        <span className="text-white/55">
                          {s.type === 'book'
                            ? bookDisplayName(s.data as Book, authorsMap)
                            : authorDisplayName(s.data as Author)}
                        </span>
                      </li>
                    ))}
                    {siblings.length > SAMPLE_LIMIT && (
                      <li className="text-caption text-white/25">
                        … et {siblings.length - SAMPLE_LIMIT} autre{siblings.length - SAMPLE_LIMIT > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {siblings.length === 0 && ts && (
                <p className="mt-2 text-caption text-white/25">
                  Aucun autre élément ajouté à la même heure.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

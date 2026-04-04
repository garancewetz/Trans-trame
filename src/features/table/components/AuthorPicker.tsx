import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Author, AuthorId } from '@/types/domain'
import { authorName } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'

export function AuthorPicker({
  authors = [],
  selectedAuthorIds = [],
  onChange,
  onAddAuthor,
}: {
  authors?: Author[]
  selectedAuthorIds?: AuthorId[]
  onChange: (ids: AuthorId[]) => void
  onAddAuthor?: (author: Author) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = ref.current
      const t = e.target
      if (!el || !(t instanceof Node) || !el.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const selectedAuthors = useMemo((): Author[] => {
    const list: Author[] = []
    for (const id of selectedAuthorIds) {
      const a = authors.find((au) => au.id === id)
      if (a) list.push(a)
    }
    return list
  }, [selectedAuthorIds, authors])

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return authors
      .filter((a) => !selectedAuthorIds.includes(a.id))
      .filter(
        (a) =>
          `${a.firstName ?? ''} ${a.lastName ?? ''}`.toLowerCase().includes(q) ||
          (a.lastName ?? '').toLowerCase().startsWith(q)
      )
      .slice(0, 6)
  }, [authors, selectedAuthorIds, query])

  const canCreate = query.trim().length > 1 && suggestions.length === 0 && !!onAddAuthor

  const removeAuthor = (id: AuthorId) => onChange(selectedAuthorIds.filter((aid) => aid !== id))

  const addAuthor = (author: Author) => {
    onChange([...selectedAuthorIds, author.id])
    setQuery('')
    setOpen(false)
  }

  const handleCreate = () => {
    const parts = query.trim().split(/\s+/)
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
    const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0]
    const newAuthor: Author = {
      id: `auth_${crypto.randomUUID().slice(0, 8)}`,
      type: 'author',
      firstName,
      lastName,
      axes: [],
    }
    onAddAuthor?.(newAuthor)
    onChange([...selectedAuthorIds, newAuthor.id])
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex min-h-[28px] flex-wrap items-center gap-1 rounded-md border border-white/12 bg-white/4 px-1.5 py-1">
        {selectedAuthors.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/8 px-1.5 py-px text-[0.72rem] text-white/75"
          >
            {authorName(a)}
            <Button
              type="button"
              onClick={() => removeAuthor(a.id)}
              className="cursor-pointer leading-none text-white/35 hover:text-white/80"
            >
              ×
            </Button>
          </span>
        ))}
        <input
          className="min-w-[80px] flex-1 bg-transparent text-[0.85rem] text-white placeholder-white/25 outline-none"
          placeholder={selectedAuthors.length === 0 ? 'Auteur·ice…' : ''}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Backspace' && !query && selectedAuthorIds.length > 0) {
              onChange(selectedAuthorIds.slice(0, -1))
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (query.trim()) {
                if (suggestions.length > 0) {
                  addAuthor(suggestions[0])
                } else if (canCreate) {
                  handleCreate()
                }
              } else if (selectedAuthorIds.length > 0) {
                // Empty field with author already selected → submit the form
                e.currentTarget.closest('form')?.requestSubmit()
              }
            }
          }}
        />
      </div>
      {open && (suggestions.length > 0 || canCreate) && (
        <ul className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 list-none rounded-lg border border-white/10 bg-bg-overlay/98 p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {suggestions.map((a) => (
            <li key={a.id}>
              <Button
                type="button"
                className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/8"
                onClick={() => addAuthor(a)}
              >
                <span className="font-mono text-[0.74rem] text-white">
                  {a.firstName} <strong>{a.lastName ? a.lastName.toUpperCase() : ''}</strong>
                </span>
              </Button>
            </li>
          ))}
          {canCreate && (
            <li>
              <Button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/8"
                onClick={handleCreate}
              >
                <Plus size={10} className="shrink-0 text-cyan/60" />
                <span className="font-mono text-[0.74rem] text-cyan/75">
                  Créer «&nbsp;{query.trim()}&nbsp;»
                </span>
              </Button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

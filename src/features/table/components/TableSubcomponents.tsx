import { useEffect, useMemo, useRef, useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'
import { AXES, AXES_COLORS, AXES_LABELS, axesGradient, type Axis } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../tableConstants'

export function AxisDots({
  axes = [],
  onChange,
}: {
  axes?: Axis[]
  onChange: (axes: Axis[]) => void
}) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const toggle = (axis: Axis) =>
    onChange(axes.includes(axis) ? axes.filter((a) => a !== axis) : [...axes, axis])

  return (
    <div className="flex flex-wrap items-center gap-1">
      {axes.map((axis) => (
        <Button
          key={axis}
          type="button"
          onClick={() => toggle(axis)}
          title="Retirer"
          className="inline-flex cursor-pointer items-center rounded-full px-1.5 py-px text-[0.72rem] font-semibold text-black/75 transition-all hover:opacity-75"
          style={{ backgroundColor: AXES_COLORS[axis] }}
        >
          {AXES_LABELS[axis] ?? axis}
        </Button>
      ))}
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/30 transition-colors hover:border-white/35 hover:text-white/60"
      >
        <Plus size={8} />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-bg-overlay/98 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {AXES.map((axis) => {
            const active = axes.includes(axis)
            return (
              <Button
                key={axis}
                type="button"
                onClick={() => toggle(axis)}
                className={[
                  'cursor-pointer rounded-full px-2 py-0.5 text-[0.72rem] font-semibold transition-all',
                  active ? 'text-black/75' : 'border border-white/15 bg-white/5 text-white/45 hover:bg-white/10',
                ].join(' ')}
                style={active ? { backgroundColor: AXES_COLORS[axis] } : {}}
              >
                {AXES_LABELS[axis] ?? axis}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
                // Champ vide + auteur déjà sélectionné → soumettre le formulaire
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

export function NodeSearch({
  nodes,
  authorsMap,
  value,
  onSelect,
  placeholder,
  exclude = [],
}: {
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  value: Book | null
  onSelect: (n: Book) => void
  placeholder: string
  exclude?: BookId[]
}) {
  const [query, setQuery] = useState(value?.title ?? '')
  const [isSearching, setIsSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Sync display when value changes externally (selection or clear)
  useEffect(() => {
    if (!isSearching) setQuery(value?.title ?? '')
  }, [value, isSearching])

  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = ref.current
      const t = e.target
      if (!el || !(t instanceof Node) || !el.contains(t)) {
        setOpen(false)
        setIsSearching(false)
        // Restore display value if user clicked away without selecting
        setQuery(value?.title ?? '')
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [value])

  const results = useMemo(() => {
    if (!isSearching) return []
    const q = query.toLowerCase().trim()
    if (!q) return []
    const qWords = q.split(/\s+/).filter(Boolean)
    return nodes
      .filter((n) => !exclude.includes(n.id))
      .filter((n) => {
        const haystack = (n.title + ' ' + bookAuthorDisplay(n, authorsMap || new Map())).toLowerCase()
        return qWords.every((w) => haystack.includes(w))
      })
      .slice(0, 8)
  }, [query, isSearching, nodes, exclude, authorsMap])

  return (
    <div className="relative" ref={ref}>
      <TextInput
        variant="table"
        className={INPUT}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsSearching(true); setOpen(true) }}
        onFocus={() => { setIsSearching(true); setOpen(true) }}
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 max-h-[180px] overflow-y-auto rounded-lg border border-white/10 bg-bg-overlay/98 p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {results.map((n) => (
            <Button
              key={n.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/8"
              onClick={() => { onSelect(n); setQuery(n.title); setIsSearching(false); setOpen(false) }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
              <span>
                <strong className="block font-mono text-[0.85rem] text-white">{n.title}</strong>
                <span className="font-mono text-[0.72rem] text-white/30">
                  {bookAuthorDisplay(n, authorsMap || new Map())}{n.year ? `, ${n.year}` : ''}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Axis filter header ── */
export function AxisFilterTH({
  activeAxis,
  onSelect,
}: {
  activeAxis: Axis | null
  onSelect: (axis: Axis | null) => void
}) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const filtered = AXES.filter((a) => a !== 'UNCATEGORIZED')

  return (
    <th className="w-40 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/32">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className={[
          'inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-white/60',
          activeAxis ? 'text-white/70' : '',
        ].join(' ')}
      >
        {activeAxis ? AXES_LABELS[activeAxis] : 'Axes'}
        {activeAxis ? (
          <span
            className="ml-0.5 inline-block h-2 w-2 rounded-full"
            style={{ background: AXES_COLORS[activeAxis] }}
          />
        ) : (
          <ChevronDown size={10} className="text-white/18" />
        )}
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 grid max-h-72 grid-cols-1 gap-0.5 overflow-auto rounded-lg border border-white/10 bg-bg-overlay/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          {activeAxis && (
            <button
              type="button"
              className="rounded px-2.5 py-1.5 text-left text-[0.78rem] text-white/50 transition-colors hover:bg-white/8 hover:text-white/80"
              onClick={() => { onSelect(null); setOpen(false) }}
            >
              Tous les axes
            </button>
          )}
          {filtered.map((axis) => (
            <button
              key={axis}
              type="button"
              className={[
                'flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[0.78rem] transition-colors hover:bg-white/8',
                activeAxis === axis ? 'bg-white/10 text-white' : 'text-white/60',
              ].join(' ')}
              onClick={() => { onSelect(activeAxis === axis ? null : axis); setOpen(false) }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: AXES_COLORS[axis] }} />
              {AXES_LABELS[axis]}
            </button>
          ))}
        </div>
      )}
    </th>
  )
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronUp size={10} className="text-white/18" />
  return dir === 'asc' ? (
    <ChevronUp size={10} className="text-green" />
  ) : (
    <ChevronDown size={10} className="text-green" />
  )
}

export function TH({ col, activeCol, dir, onSort, children, className = '' }) {
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/32 transition-colors hover:text-white/60 ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children} <SortIcon active={activeCol === col} dir={dir} />
      </span>
    </th>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { authorName } from '../../authorUtils'
import { AXES, AXES_COLORS, AXES_LABELS, axesGradient } from '../../categories'
import { INPUT } from './tableConstants'

export function AxisDots({ axes = [], onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const toggle = (axis) =>
    onChange(axes.includes(axis) ? axes.filter((a) => a !== axis) : [...axes, axis])

  return (
    <div className="relative flex flex-wrap items-center gap-1" ref={ref}>
      {axes.map((axis) => (
        <button
          key={axis}
          type="button"
          onClick={() => toggle(axis)}
          title="Retirer"
          className="inline-flex cursor-pointer items-center rounded-full px-1.5 py-px text-[0.58rem] font-semibold text-black/75 transition-all hover:opacity-75"
          style={{ backgroundColor: AXES_COLORS[axis] }}
        >
          {AXES_LABELS[axis] ?? axis}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/30 transition-colors hover:border-white/35 hover:text-white/60"
      >
        <Plus size={8} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-[rgba(6,4,20,0.98)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {AXES.map((axis) => {
            const active = axes.includes(axis)
            return (
              <button
                key={axis}
                type="button"
                onClick={() => toggle(axis)}
                className={[
                  'cursor-pointer rounded-full px-2 py-0.5 text-[0.62rem] font-semibold transition-all',
                  active ? 'text-black/75' : 'border border-white/15 bg-white/5 text-white/45 hover:bg-white/10',
                ].join(' ')}
                style={active ? { backgroundColor: AXES_COLORS[axis] } : {}}
              >
                {AXES_LABELS[axis] ?? axis}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AuthorPicker({ nodes, firstName, setFirstName, lastName, setLastName }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const knownAuthors = useMemo(() => {
    const seen = new Map()
    ;(nodes || []).forEach((n) => {
      const ln = (n.lastName || '').trim()
      const fn = (n.firstName || '').trim()
      if (!ln) return
      const key = `${fn.toLowerCase()}||${ln.toLowerCase()}`
      if (!seen.has(key)) seen.set(key, { firstName: fn, lastName: ln })
    })
    return Array.from(seen.values()).sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [nodes])

  const suggestions = useMemo(() => {
    const q = lastName.toLowerCase().trim()
    if (q.length < 2) return []
    return knownAuthors
      .filter(
        (a) =>
          a.lastName.toLowerCase().startsWith(q) ||
          a.lastName.toLowerCase().includes(q) ||
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [knownAuthors, lastName])

  const isKnown = useMemo(
    () =>
      lastName.trim().length > 1 &&
      knownAuthors.some(
        (a) =>
          a.lastName.toLowerCase() === lastName.toLowerCase().trim() &&
          (!firstName.trim() || a.firstName.toLowerCase() === firstName.toLowerCase().trim())
      ),
    [knownAuthors, firstName, lastName]
  )

  return (
    <div className="flex gap-1.5" ref={ref}>
      <input
        className={INPUT}
        style={{ width: '42%' }}
        placeholder="Prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      <div className="relative" style={{ width: '58%' }}>
        <input
          className={INPUT + (isKnown ? ' pr-16' : '')}
          placeholder="Nom *"
          value={lastName}
          onChange={(e) => { setLastName(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        />
        {isKnown && (
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[rgba(0,255,135,0.12)] px-1.5 py-px text-[0.55rem] font-semibold text-[rgba(0,255,135,0.6)]">
            exist.
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 list-none rounded-lg border border-white/10 bg-[rgba(6,4,20,0.98)] p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            {suggestions.map((a) => (
              <li key={`${a.firstName}||${a.lastName}`}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/8"
                  onClick={() => { setFirstName(a.firstName); setLastName(a.lastName); setOpen(false) }}
                >
                  <span className="font-mono text-[0.74rem] text-white">
                    {a.firstName} <strong>{a.lastName}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function NodeSearch({ nodes, value, onSelect, placeholder, exclude = [] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return nodes
      .filter((n) => !exclude.includes(n.id))
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) || authorName(n).toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, nodes, exclude])

  return (
    <div className="relative" ref={ref}>
      <input
        className={INPUT}
        placeholder={value ? '' : placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {value && !query && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-2">
          <span className="truncate font-mono text-[0.78rem] italic text-white/65">
            {value.title}
          </span>
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 max-h-[180px] overflow-y-auto rounded-lg border border-white/10 bg-[rgba(6,4,20,0.98)] p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {results.map((n) => (
            <button
              key={n.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/8"
              onClick={() => { onSelect(n); setQuery(''); setOpen(false) }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
              <span>
                <strong className="block font-mono text-[0.76rem] text-white">{n.title}</strong>
                <span className="font-mono text-[0.63rem] text-white/30">
                  {authorName(n)}{n.year ? `, ${n.year}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronUp size={10} className="text-white/18" />
  return dir === 'asc' ? (
    <ChevronUp size={10} className="text-[#00FF87]" />
  ) : (
    <ChevronDown size={10} className="text-[#00FF87]" />
  )
}

export function TH({ col, activeCol, dir, onSort, children, className = '' }) {
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32 transition-colors hover:text-white/60 ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children} <SortIcon active={activeCol === col} dir={dir} />
      </span>
    </th>
  )
}

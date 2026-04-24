import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { Book } from '@/types/domain'

type Props = {
  bookCount: number
  books?: Book[]
}

export function AuthorBooksBadge({ bookCount, books }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const hasBooks = (books?.length ?? 0) > 0
  const show = () => {
    if (!hasBooks) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(true), 150)
  }
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(false), 200)
  }

  const sortedBooks = hasBooks
    ? [...(books as Book[])].sort((a, b) => (a.year || 0) - (b.year || 0))
    : []

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span className="inline-flex items-center gap-1.5 font-mono text-ui tabular-nums text-text-secondary">
        {bookCount > 0 ? (
          <span className={hasBooks ? 'cursor-help rounded px-1 transition-colors hover:bg-white/5 hover:text-white/75' : undefined}>
            {bookCount}
          </span>
        ) : (
          <>
            <AlertTriangle size={12} className="text-amber/70" />
            <span className="text-amber/60">0</span>
          </>
        )}
      </span>
      {open && hasBooks && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-72 max-w-md rounded-lg border border-border-default bg-bg-overlay/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
          onMouseLeave={hide}
        >
          <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-widest text-text-secondary">
            Ressources ({sortedBooks.length})
          </p>
          <ul className="flex flex-col gap-1">
            {sortedBooks.map((b) => (
              <li key={b.id} className="flex gap-1.5 text-[0.78rem] leading-snug">
                <span className="mt-0.5 shrink-0 text-cyan/45">•</span>
                <span className="text-white/75">
                  {b.title}
                  {b.year && <span className="ml-1.5 font-mono text-[0.7rem] text-text-muted">{b.year}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}

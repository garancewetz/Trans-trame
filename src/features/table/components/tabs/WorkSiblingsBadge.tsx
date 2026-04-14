import { useEffect, useRef, useState } from 'react'
import { BookCopy } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Tooltip } from '@/common/components/ui/Tooltip'
import type { Author, Book } from '@/types/domain'

type Props = {
  siblings: Book[]
  authorsMap: Map<string, Author>
}

export function WorkSiblingsBadge({ siblings, authorsMap }: Props) {
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

  const show = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setOpen(true), 150) }
  const hide = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setOpen(false), 200) }

  return (
    <span
      ref={ref}
      className="relative ml-1 inline-flex shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
    >
      <Tooltip content="Fait partie d'une même œuvre">
        <span className="inline-flex cursor-pointer items-center rounded px-0.5 text-amber/55 transition-colors hover:text-amber">
          <BookCopy size={13} />
        </span>
      </Tooltip>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-72 max-w-md rounded-lg border border-white/10 bg-bg-overlay/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
          onMouseLeave={hide}
        >
          <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-widest text-white/35">
            Même œuvre ({siblings.length + 1})
          </p>
          <ul className="flex flex-col gap-1">
            {siblings.map((s) => (
              <li key={s.id} className="flex gap-1.5 text-[0.78rem] leading-snug">
                <span className="mt-0.5 shrink-0 text-amber/40">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {s.title}
                    {s.year && <span className="ml-1.5 font-mono text-[0.7rem] text-white/30">{s.year}</span>}
                  </span>
                  {(s.authorIds?.length ?? 0) > 0 && (
                    <span className="text-[0.7rem] text-white/25">{bookAuthorDisplay(s, authorsMap)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}

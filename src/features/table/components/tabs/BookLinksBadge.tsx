import { useEffect, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Author, Book } from '@/types/domain'

type Props = {
  linkCount: number
  linkedBooks?: Book[]
  authorsMap: Map<string, Author>
  onClick: () => void
}

export function BookLinksBadge({ linkCount, linkedBooks, authorsMap, onClick }: Props) {
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

  const hasLinks = (linkedBooks?.length ?? 0) > 0
  const show = () => {
    if (!hasLinks) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(true), 150)
  }
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(false), 200)
  }

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[0.8rem] text-white/45 transition-all hover:border-cyan/35 hover:bg-cyan/[0.07] hover:text-cyan/80"
      >
        {linkCount}
        <Link2 size={10} className="shrink-0" />
      </button>
      {open && hasLinks && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-72 max-w-md rounded-lg border border-white/10 bg-bg-overlay/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
          onMouseLeave={hide}
        >
          <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-widest text-white/35">
            Ouvrages liés ({linkedBooks!.length})
          </p>
          <ul className="flex flex-col gap-1">
            {linkedBooks!.map((b) => (
              <li key={b.id} className="flex gap-1.5 text-[0.78rem] leading-snug">
                <span className="mt-0.5 shrink-0 text-cyan/45">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {b.title}
                    {b.year && <span className="ml-1.5 font-mono text-[0.7rem] text-white/30">{b.year}</span>}
                  </span>
                  {(b.authorIds?.length ?? 0) > 0 && (
                    <span className="text-[0.7rem] text-white/25">{bookAuthorDisplay(b, authorsMap)}</span>
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

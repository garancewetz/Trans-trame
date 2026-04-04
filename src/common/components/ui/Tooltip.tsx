import { useEffect, useId, useRef, useState } from 'react'

export function Tooltip({
  content,
  children,
  delayMs = 120,
}: {
  content: string
  children: React.ReactNode
  delayMs?: number
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const show = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs)
  }

  const hide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setOpen(false)
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-bg-overlay/95 px-2 py-1 text-[0.75rem] font-semibold text-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
        >
          {content}
        </span>
      )}
    </span>
  )
}


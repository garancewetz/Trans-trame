import { useEffect, useId, useRef, useState } from 'react'

/**
 * Click-triggered popover for content meant to be *read* (not just glanced at):
 * text can wrap, be selected, and stays open until dismissed.
 * Closes on outside click or Escape.
 */
export function Popover({
  content,
  children,
  ariaLabel,
  className,
}: {
  content: React.ReactNode
  children: React.ReactNode
  ariaLabel?: string
  className?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex cursor-pointer items-center"
      >
        {children}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-[calc(100%+10px)] top-1/2 z-50 w-[min(560px,90vw)] -translate-y-1/2 whitespace-pre-wrap rounded-lg border border-white/10 bg-bg-overlay/95 px-5 py-4 text-body font-normal leading-relaxed text-white/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${className ?? ''}`}
        >
          {content}
        </div>
      )}
    </span>
  )
}

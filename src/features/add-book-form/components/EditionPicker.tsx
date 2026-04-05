import { useEffect, useMemo, useRef, useState } from 'react'

export function EditionPicker({
  value,
  onChange,
  knownEditions,
  className,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  knownEditions: string[]
  className?: string
  placeholder?: string
}) {
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

  const suggestions = useMemo(() => {
    const q = value.toLowerCase().trim()
    if (q.length < 2) return []
    return knownEditions
      .filter((e) => e.toLowerCase().includes(q))
      .slice(0, 8)
  }, [knownEditions, value])

  return (
    <div ref={ref} className="relative">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && suggestions.length > 0 && open) {
            e.preventDefault()
            onChange(suggestions[0])
            setOpen(false)
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 list-none rounded-lg border border-white/10 bg-bg-overlay/98 p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {suggestions.map((edition) => (
            <li key={edition}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/8"
                onClick={() => {
                  onChange(edition)
                  setOpen(false)
                }}
              >
                <span className="font-mono text-[0.74rem] text-white">{edition}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

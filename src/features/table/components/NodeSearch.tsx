import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book, BookId } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../tableConstants'

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

  // Sync display when value changes externally (selection or clear) — the
  // React-recommended "adjust state during render" pattern.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (!isSearching) setQuery(value?.title ?? '')
  }

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
                <strong className="block font-mono text-ui text-white">{n.title}</strong>
                <span className="font-mono text-micro text-white/30">
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

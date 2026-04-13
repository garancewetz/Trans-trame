import { X, Calendar, BookOpen, Users } from 'lucide-react'
import { AXES_COLORS, AXES_LABELS } from '@/common/utils/categories'
import type { Axis } from '@/common/utils/categories.constants'
import type { Highlight } from '@/core/FilterContext'

type ActiveFilterBarProps = {
  activeFilter: string | null
  activeHighlight: Highlight | null
  highlightLabel: string | null
  selectedAuthor: string | null
  selectedAuthorName: string | null
  selectedBookTitle: string | null
  onClearAxis: () => void
  onClearHighlight: () => void
  onClearAuthor: () => void
  onClearSelectedBook: () => void
}

const HIGHLIGHT_ICON = { decade: Calendar, book: BookOpen, author: Users } as const

export function ActiveFilterBar({
  activeFilter,
  activeHighlight,
  highlightLabel,
  selectedAuthor,
  selectedAuthorName,
  selectedBookTitle,
  onClearAxis,
  onClearHighlight,
  onClearAuthor,
  onClearSelectedBook,
}: ActiveFilterBarProps) {
  if (!activeFilter && !activeHighlight && !selectedAuthor && !selectedBookTitle) return null

  const HighlightIcon = activeHighlight ? HIGHLIGHT_ICON[activeHighlight.kind] : null

  return (
    <div className="pointer-events-none fixed left-1/2 top-[60px] z-30 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-bg-overlay/85 px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <span className="text-[0.78rem] font-medium text-white/35">Filtres</span>

        {activeFilter && (
          <button
            type="button"
            onClick={onClearAxis}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/5 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: AXES_COLORS[activeFilter as Axis] ?? '#fff' }}
            />
            <span className="truncate">
              {AXES_LABELS[activeFilter as Axis] ?? activeFilter}
            </span>
            <X
              size={12}
              className="shrink-0 text-white/30 transition-colors group-hover:text-white/70"
            />
          </button>
        )}

        {activeHighlight && highlightLabel && HighlightIcon && (
          <button
            type="button"
            onClick={onClearHighlight}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/5 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <HighlightIcon size={10} className="shrink-0 text-white/50" />
            <span className="max-w-[200px] truncate">{highlightLabel}</span>
            <X
              size={12}
              className="shrink-0 text-white/30 transition-colors group-hover:text-white/70"
            />
          </button>
        )}

        {selectedAuthor && (
          <button
            type="button"
            onClick={onClearAuthor}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber/20 bg-amber/8 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-amber/80 transition-all hover:border-amber/40 hover:bg-amber/15 hover:text-amber"
          >
            <span className="truncate max-w-[180px]">
              {selectedAuthorName ?? 'Auteur·ice'}
            </span>
            <X
              size={12}
              className="shrink-0 text-amber/40 transition-colors group-hover:text-amber/80"
            />
          </button>
        )}

        {selectedBookTitle && (
          <button
            type="button"
            onClick={onClearSelectedBook}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber/20 bg-amber/8 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-amber/80 transition-all hover:border-amber/40 hover:bg-amber/15 hover:text-amber"
          >
            <BookOpen size={10} className="shrink-0 text-amber/60" />
            <span className="truncate max-w-[200px]">{selectedBookTitle}</span>
            <X
              size={12}
              className="shrink-0 text-amber/40 transition-colors group-hover:text-amber/80"
            />
          </button>
        )}
      </div>
    </div>
  )
}

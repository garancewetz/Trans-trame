import { X, Calendar, BookOpen, Users, TrendingUp } from 'lucide-react'
import { axisColor, axisLabel } from '@/common/utils/categories'
import type { Highlight } from '@/core/FilterContext'

type ActiveFilterBarProps = {
  activeAxes: ReadonlySet<string>
  activeHighlight: Highlight | null
  highlightLabel: string | null
  selectedAuthor: string | null
  selectedAuthorName: string | null
  selectedBookTitle: string | null
  visibleCount?: number
  totalCount?: number
  onToggleAxis: (axis: string) => void
  onClearAxes: () => void
  onClearHighlight: () => void
  onClearAuthor: () => void
  onClearSelectedBook: () => void
}

const HIGHLIGHT_ICON = { decade: Calendar, book: BookOpen, author: Users, citedMin: TrendingUp } as const

export function ActiveFilterBar({
  activeAxes,
  activeHighlight,
  highlightLabel,
  selectedAuthor,
  selectedAuthorName,
  selectedBookTitle,
  visibleCount,
  totalCount,
  onToggleAxis,
  onClearAxes,
  onClearHighlight,
  onClearAuthor,
  onClearSelectedBook,
}: ActiveFilterBarProps) {
  if (activeAxes.size === 0 && !activeHighlight && !selectedAuthor && !selectedBookTitle) return null

  const HighlightIcon = activeHighlight ? HIGHLIGHT_ICON[activeHighlight.kind] : null
  const showCount = typeof visibleCount === 'number' && typeof totalCount === 'number'
  const axesList = Array.from(activeAxes)

  return (
    <div className="pointer-events-none fixed left-1/2 top-[60px] z-30 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border-default bg-bg-overlay/85 px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        {showCount ? (
          <span className="inline-flex items-center gap-1 text-[0.78rem] font-medium text-text-soft tabular-nums">
            <span className="text-white/80">{visibleCount}</span>
            <span className="text-text-dimmed">/</span>
            <span>{totalCount}</span>
            <span className="ml-0.5 text-text-secondary">ressources</span>
          </span>
        ) : (
          <span className="text-[0.78rem] font-medium text-text-secondary">Filtres</span>
        )}

        {axesList.map((axis) => (
          <button
            key={axis}
            type="button"
            onClick={() => onToggleAxis(axis)}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-default bg-white/5 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: axisColor(axis) ?? '#fff' }}
            />
            <span className="truncate">
              {axisLabel(axis) ?? axis}
            </span>
            <X
              size={12}
              className="shrink-0 text-text-muted transition-colors group-hover:text-white/70"
            />
          </button>
        ))}
        {activeAxes.size > 1 && (
          <button
            type="button"
            onClick={onClearAxes}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/75"
          >
            Tout effacer
          </button>
        )}

        {activeHighlight && highlightLabel && HighlightIcon && (
          <button
            type="button"
            onClick={onClearHighlight}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-default bg-white/5 py-0.5 pl-2 pr-1.5 text-[0.8rem] font-semibold text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <HighlightIcon size={10} className="shrink-0 text-text-soft" />
            <span className="max-w-[200px] truncate">{highlightLabel}</span>
            <X
              size={12}
              className="shrink-0 text-text-muted transition-colors group-hover:text-white/70"
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

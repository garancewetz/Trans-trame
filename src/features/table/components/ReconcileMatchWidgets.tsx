import { useState } from 'react'
import clsx from 'clsx'
import { BookmarkPlus, Check, ChevronRight, Lightbulb } from 'lucide-react'
import type { Author, AuthorId, Book } from '@/types/domain'

// ─── Constants ──────────────────────────────────────────────────────────────

export const CONFIDENCE_STYLE = {
  high: 'border-green/40 bg-green/10 text-green/80',
  medium: 'border-amber/40 bg-amber/10 text-amber/80',
  low: 'border-white/20 bg-white/5 text-white/50',
} as const

export const CONFIDENCE_LABEL = { high: 'haute', medium: 'moyenne', low: 'faible' } as const

// ─── MatchTable ─────────────────────────────────────────────────────────────

export function MatchTable<T>({
  title,
  columns,
  items,
  renderRow,
}: {
  title: string
  columns: string[]
  items: T[]
  renderRow: (item: T) => React.ReactNode
}) {
  return (
    <div>
      <h4 className="mb-2 text-[0.78rem] font-semibold uppercase tracking-wider text-white/35">{title}</h4>
      <div className="rounded-lg border border-white/6">
        <table className="w-full text-label">
          <thead>
            <tr className="border-b border-white/8 text-left text-white/35">
              <th className="w-8 px-3 py-2" />
              {columns.map((col) => (
                <th key={col} className={clsx('px-2 py-2', col === 'Confiance' && 'w-20')}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>{items.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MatchCheckbox ──────────────────────────────────────────────────────────

export function MatchCheckbox({ accepted, onClick }: { accepted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
        accepted ? 'border-cyan/60 bg-cyan/15' : 'border-white/20 hover:border-white/40',
      )}
    >
      {accepted && <Check size={10} className="text-cyan" />}
    </button>
  )
}

// ─── ConfidenceBadge ────────────────────────────────────────────────────────

export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  return (
    <span className={clsx('rounded-full border px-2 py-0.5 text-[0.7rem] font-medium', CONFIDENCE_STYLE[confidence])}>
      {CONFIDENCE_LABEL[confidence]}
    </span>
  )
}

// ─── HintsPanel ─────────────────────────────────────────────────────────────

export function HintsPanel({
  result,
  bookById,
  authorsMap,
  hintsSaved,
  onSave,
  className,
}: {
  result: { hints: { bookId: string; hint: string }[] }
  bookById: Map<string, Book>
  authorsMap: Map<AuthorId, Author>
  hintsSaved: boolean
  onSave: () => void
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (result.hints.length === 0) return null

  return (
    <div className={clsx('shrink-0 rounded-lg border border-dashed border-amber/20 bg-amber/3', className)}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex cursor-pointer items-center gap-1.5 text-left"
        >
          <ChevronRight
            size={12}
            className={clsx('text-amber/60 transition-transform', expanded && 'rotate-90')}
          />
          <Lightbulb size={12} className="text-amber/60" />
          <p className="text-[0.78rem] font-semibold text-amber/60">
            Pistes de recherche ({result.hints.length})
          </p>
          <span className="ml-1 text-caption text-white/25">
            — hypothèses non vérifiées, à utiliser comme amorces
          </span>
        </button>
        <button
          type="button"
          disabled={hintsSaved}
          onClick={onSave}
          className={clsx(
            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-all',
            hintsSaved
              ? 'border-green/30 text-green/60'
              : 'cursor-pointer border-amber/30 text-amber/60 hover:bg-amber/10',
          )}
        >
          {hintsSaved ? <><Check size={10} /> Sauvegardé</> : <><BookmarkPlus size={10} /> Sauvegarder en todo</>}
        </button>
      </div>
      {expanded && (
        <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto border-t border-amber/10 px-4 py-3">
          {result.hints.map((h, i) => {
            const book = bookById.get(h.bookId)
            const author = authorsMap.get(h.bookId)
            const label = book?.title || (author ? [author.firstName, author.lastName].filter(Boolean).join(' ') : h.bookId)
            const searchQuery = encodeURIComponent(label)
            return (
              <li key={i} className="text-caption">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-white/60">{label}</span>
                  <a
                    href={`https://scholar.google.com/scholar?q=${searchQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.7rem] text-cyan/50 hover:text-cyan/70 hover:underline"
                  >
                    chercher ↗
                  </a>
                </div>
                <span className="text-white/45">{h.hint}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

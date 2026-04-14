import clsx from 'clsx'
import { BookmarkPlus, Check, Lightbulb } from 'lucide-react'
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
  if (result.hints.length === 0) return null

  return (
    <div className={clsx('shrink-0 rounded-lg border border-dashed border-amber/20 bg-amber/3 px-4 py-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Lightbulb size={12} className="text-amber/60" />
          <p className="text-[0.78rem] font-semibold text-amber/60">Pistes de recherche</p>
        </div>
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
      <ul className="flex flex-col gap-2">
        {result.hints.map((h, i) => {
          const book = bookById.get(h.bookId)
          const author = authorsMap.get(h.bookId)
          const label = book?.title || (author ? [author.firstName, author.lastName].filter(Boolean).join(' ') : h.bookId)
          return (
            <li key={i} className="text-caption">
              <span className="font-medium text-white/60">{label}</span>
              <span className="text-white/30"> — </span>
              <span className="text-white/45">{h.hint}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

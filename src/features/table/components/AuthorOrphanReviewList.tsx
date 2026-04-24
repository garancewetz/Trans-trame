import clsx from 'clsx'
import { AlertTriangle, Check } from 'lucide-react'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { AuthorId, BookId } from '@/types/domain'
import { CONF_STYLE, CONF_LABEL } from '../authorOrphanMatching'
import type { OrphanEntry } from '../authorOrphanMatching'

// ── Confidence badge ─────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  return (
    <span
      className={clsx(
        'rounded-full border px-1.5 py-px text-[0.55rem] font-semibold uppercase tracking-[0.12em]',
        CONF_STYLE[level],
      )}
    >
      {CONF_LABEL[level]}
    </span>
  )
}

// ── Main list ────────────────────────────────────────────────────────────

type Props = {
  withMatches: OrphanEntry[]
  withoutMatches: OrphanEntry[]
  selections: Map<AuthorId, Set<BookId>>
  authorsMap: Map<string, AuthorNode>
  onToggle: (authorId: AuthorId, bookId: BookId) => void
}

export function AuthorOrphanReviewList({
  withMatches,
  withoutMatches,
  selections,
  authorsMap,
  onToggle,
}: Props) {
  return (
    <div className="mb-4 max-h-[min(55vh,480px)] overflow-y-auto rounded-xl border border-border-subtle bg-white/1.5 text-[0.8rem] backdrop-blur-sm">
      {withMatches.map((entry) => {
        const selectedSet = selections.get(entry.author.id)
        return (
          <div key={entry.author.id} className="border-b border-border-subtle px-3 py-2.5 last:border-0">
            {/* Author header */}
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-mono font-semibold text-white/80">
                {authorName(entry.author)}
              </span>
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-[0.65rem] uppercase tracking-[0.12em] text-text-muted">
                {entry.matches.length} candidat{entry.matches.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Candidate books */}
            <div className="flex flex-col gap-1">
              {entry.matches.map((match) => {
                const isSelected = !!selectedSet?.has(match.book.id)
                const existingAuthors = bookAuthorDisplay(match.book, authorsMap)
                const hasExistingAuthors = (match.book.authorIds || []).length > 0

                return (
                  <button
                    key={match.book.id}
                    type="button"
                    onClick={() => onToggle(entry.author.id, match.book.id)}
                    className={clsx(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left font-mono transition-all',
                      isSelected
                        ? 'border-green/25 bg-green/[0.06]'
                        : 'border-border-subtle bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                        isSelected
                          ? 'border-green/50 bg-green/20 text-green'
                          : 'border-white/15 text-transparent hover:border-white/35',
                      )}
                    >
                      <Check size={9} strokeWidth={3} />
                    </span>

                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-baseline gap-2">
                        <span className={isSelected ? 'text-white/90' : 'text-white/60'}>
                          {match.book.title || '(sans titre)'}
                        </span>
                        {match.book.year && (
                          <span className="text-[0.7rem] text-text-dimmed">{match.book.year}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.68rem] text-text-muted">{match.reason}</span>
                        {hasExistingAuthors && (
                          <span className="text-[0.68rem] text-amber/50">
                            (déjà lié à {existingAuthors})
                          </span>
                        )}
                      </div>
                    </div>

                    <ConfidenceBadge level={match.confidence} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Orphans without any match */}
      {withoutMatches.length > 0 && (
        <div className="border-t border-border-subtle px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-text-muted">
            <AlertTriangle size={11} className="text-text-dimmed" />
            <span>Sans correspondance ({withoutMatches.length})</span>
            <span className="h-px flex-1 bg-white/8" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {withoutMatches.map((e) => (
              <span
                key={e.author.id}
                className="rounded-md border border-border-subtle bg-white/[0.02] px-2 py-1 font-mono text-[0.75rem] text-text-secondary"
              >
                {authorName(e.author)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

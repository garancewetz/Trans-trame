import clsx from 'clsx'
import { Users, Quote } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Highlight } from '@/core/FilterContext'

type CitedNode = {
  id: string
  title?: string
  authorIds?: string[]
  citedBy: number
}

type TopAuthor = {
  id: string
  name: string
  bookCount: number
}

type AnalysisRankedListsProps = {
  mostCited: CitedNode[]
  topAuthors: TopAuthor[]
  authorsMap: Map<string, AuthorNode>
  activeHighlight: Highlight | null
  onHighlightChange: (h: Highlight | null) => void
}

export function AnalysisRankedLists({ mostCited, topAuthors, authorsMap, activeHighlight, onHighlightChange }: AnalysisRankedListsProps) {
  return (
    <>
      {/* ── Œuvres pivots ─────────────────────────── */}
      <section className="mb-5">
        <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-white/50">
          <Quote size={12} /> Œuvres pivots
        </h3>
        <div className="flex flex-col gap-1.5">
          {mostCited.map((node, i) => {
            const isActive = activeHighlight?.kind === 'book' && activeHighlight.bookId === node.id
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onHighlightChange(isActive ? null : { kind: 'book', bookId: node.id })}
                className={clsx(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left backdrop-blur-xl transition-all',
                  isActive ? 'border-white/25 bg-white/12' : 'border-white/10 bg-white/5 hover:border-white/15 hover:bg-white/8',
                )}
              >
                <span className="text-[0.9rem] font-bold text-white/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-ui font-semibold ${isActive ? 'text-white' : 'text-white/85'}`}>{node.title}</p>
                  <p className="text-caption text-white/35">
                    {bookAuthorDisplay(node, authorsMap)} — {node.citedBy} citation{node.citedBy > 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Voix majeures ─────────────────────────── */}
      <section className="mb-5">
        <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-white/50">
          <Users size={12} /> Voix majeures
        </h3>
        <div className="flex flex-col gap-1.5">
          {topAuthors.map((a, i) => {
            const isActive = activeHighlight?.kind === 'author' && activeHighlight.authorId === a.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onHighlightChange(isActive ? null : { kind: 'author', authorId: a.id })}
                className={clsx(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left backdrop-blur-xl transition-all',
                  isActive ? 'border-white/25 bg-white/12' : 'border-white/10 bg-white/5 hover:border-white/15 hover:bg-white/8',
                )}
              >
                <span className="text-[0.9rem] font-bold text-white/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-ui font-semibold ${isActive ? 'text-white' : 'text-white/85'}`}>{a.name}</p>
                  <p className="text-caption text-white/35">
                    {a.bookCount} ouvrage{a.bookCount > 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            )
          })}
          {topAuthors.length === 0 && (
            <p className="text-caption text-white/35">Aucun·e auteur·ice référencé·e</p>
          )}
        </div>
      </section>
    </>
  )
}

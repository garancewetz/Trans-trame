import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import type { Author, AuthorId, Book } from '@/types/domain'
import type { ReconcileMatch, ReconcileResult, SourceMatch } from '../reconcileOrphans.llm'
import { matchKey, sourceKey } from '../hooks/useReconcileState'
import { MatchTable, MatchCheckbox, ConfidenceBadge, HintsPanel } from './ReconcileMatchWidgets'

function ImportSourceHint({ book, bookById }: { book: Book | undefined; bookById: Map<string, Book> }) {
  if (!book?.importSourceId) return null
  const source = bookById.get(book.importSourceId)
  if (!source) return null
  const sourceTitle = source.title || '(sans titre)'
  return (
    <div className="mt-0.5 text-caption text-text-secondary">
      Importé·e pour la biblio. de <span className="text-text-soft">{sourceTitle}</span>
      {source.year && <span className="text-text-dimmed"> ({source.year})</span>}
    </div>
  )
}

type ReviewPhaseProps = {
  result: ReconcileResult
  authorsMap: Map<AuthorId, Author>
  bookById: Map<string, Book>
  acceptedAuthorMatches: Set<string>
  acceptedSourceMatches: Set<string>
  hintsSaved: boolean
  totalAccepted: number
  onToggleAuthor: (m: ReconcileMatch) => void
  onToggleSource: (m: SourceMatch) => void
  onSaveHints: () => void
  onApply: () => void
  onCancel: () => void
}

export function ReviewPhase({
  result,
  authorsMap,
  bookById,
  acceptedAuthorMatches,
  acceptedSourceMatches,
  hintsSaved,
  totalAccepted,
  onToggleAuthor,
  onToggleSource,
  onSaveHints,
  onApply,
  onCancel,
}: ReviewPhaseProps) {
  const { authorToBook: authorMatches, bookToSource: sourceMatches } = result

  return (
    <div className="flex max-h-[calc(100vh-10rem)] flex-col gap-4">
      <p className="shrink-0 text-label text-text-soft">
        {authorMatches.length + sourceMatches.length} suggestion{authorMatches.length + sourceMatches.length > 1 ? 's' : ''}
      </p>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {authorMatches.length > 0 && (
          <MatchTable
            title="Auteur·ice → Ressource"
            columns={['Auteur·ice', 'Ressource suggéré', 'Confiance', 'Raison']}
            items={authorMatches}
            renderRow={(m) => {
              const author = authorsMap.get(m.authorId)
              const book = bookById.get(m.bookId)
              const accepted = acceptedAuthorMatches.has(matchKey(m))
              return (
                <tr key={matchKey(m)} className={clsx('border-b border-border-subtle transition-colors', accepted ? 'bg-cyan/3' : 'opacity-40')}>
                  <td className="px-3 py-2 align-top"><MatchCheckbox accepted={accepted} onClick={() => onToggleAuthor(m)} /></td>
                  <td className="px-2 py-2 align-top font-medium text-white/75">{author ? [author.firstName, author.lastName].filter(Boolean).join(' ') : m.authorId}</td>
                  <td className="px-2 py-2 align-top text-white/65">
                    <div>{book?.title || m.bookId}{book?.year && <span className="ml-1 text-text-muted">({book.year})</span>}</div>
                    <ImportSourceHint book={book} bookById={bookById} />
                  </td>
                  <td className="px-2 py-2 align-top"><ConfidenceBadge confidence={m.confidence} /></td>
                  <td className="px-2 py-2 align-top text-caption text-white/40">{m.reason}</td>
                </tr>
              )
            }}
          />
        )}

        {sourceMatches.length > 0 && (
          <MatchTable
            title="Ressource orphelin → Source (lien de citation)"
            columns={['Ressource orphelin', 'Cité par', 'Confiance', 'Raison']}
            items={sourceMatches}
            renderRow={(m) => {
              const orphanBook = bookById.get(m.orphanBookId)
              const sourceBook = bookById.get(m.sourceBookId)
              const accepted = acceptedSourceMatches.has(sourceKey(m))
              return (
                <tr key={sourceKey(m)} className={clsx('border-b border-border-subtle transition-colors', accepted ? 'bg-cyan/3' : 'opacity-40')}>
                  <td className="px-3 py-2 align-top"><MatchCheckbox accepted={accepted} onClick={() => onToggleSource(m)} /></td>
                  <td className="px-2 py-2 align-top text-white/65">
                    <div>{orphanBook?.title || m.orphanBookId}</div>
                    <ImportSourceHint book={orphanBook} bookById={bookById} />
                  </td>
                  <td className="px-2 py-2 align-top font-medium text-white/75">{sourceBook?.title || m.sourceBookId}</td>
                  <td className="px-2 py-2 align-top"><ConfidenceBadge confidence={m.confidence} /></td>
                  <td className="px-2 py-2 align-top text-caption text-white/40">{m.reason}</td>
                </tr>
              )
            }}
          />
        )}
      </div>

      <HintsPanel result={result} bookById={bookById} authorsMap={authorsMap} hintsSaved={hintsSaved} onSave={onSaveHints} />

      <div className="flex shrink-0 gap-2 pt-1">
        <Button type="button" variant="surface" onClick={onCancel}>Annuler</Button>
        <Button
          type="button"
          disabled={totalAccepted === 0}
          onClick={onApply}
          className={clsx(
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-ui font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
            'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
          )}
        >
          <Check size={13} />
          Appliquer ({totalAccepted})
        </Button>
      </div>
    </div>
  )
}

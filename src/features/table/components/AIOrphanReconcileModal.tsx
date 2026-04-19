import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { Button } from '@/common/components/ui/Button'
import type { Author, AuthorId, Book, Link } from '@/types/domain'
import { useReconcileState } from '../hooks/useReconcileState'
import { ReviewPhase } from './ReconcileReviewPhase'
import { HintsPanel } from './ReconcileMatchWidgets'

type Props = {
  open: boolean
  orphanBooks: Book[]
  booksWithoutAuthors: Book[]
  orphanedAuthors: Author[]
  allBooks: Book[]
  links: Link[]
  authorsMap: Map<AuthorId, Author>
  onUpdateBook?: (book: Book) => unknown
  onAddLink?: (link: { source: string; target: string; citation_text: string; edition: string; page: string; context: string }) => unknown
  onAddLinks?: (links: Array<{ source: string; target: string; citation_text: string; edition: string; page: string; context: string }>) => unknown
  onClose: () => void
}

export function AIOrphanReconcileModal({
  open,
  orphanBooks = [],
  booksWithoutAuthors = [],
  orphanedAuthors,
  allBooks,
  links,
  authorsMap,
  onUpdateBook,
  onAddLink,
  onAddLinks,
  onClose,
}: Props) {
  const state = useReconcileState({
    orphanBooks, booksWithoutAuthors, orphanedAuthors, allBooks, links, authorsMap, onUpdateBook, onAddLink, onAddLinks,
  })

  const handleClose = () => { state.resetState(); onClose() }

  if (!open) return null

  return (
    <Modal
      open={open}
      title="Réconciliation IA"
      titleIcon={<Sparkles size={14} className="text-cyan/70" />}
      onClose={handleClose}
      maxWidth="max-w-5xl"
    >
      {state.phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          {state.error && (
            <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-2 text-ui text-red/70">
              {state.error}
            </p>
          )}
          <p className="text-center text-[0.9rem] text-white/60">
            Analyser le contexte d'import de{' '}
            <span className="font-semibold text-white/80">{state.reconcileBooks.length} ressource{state.reconcileBooks.length > 1 ? 's' : ''} à réconcilier</span>
            {orphanedAuthors.length > 0 && (
              <> et <span className="font-semibold text-white/80">{orphanedAuthors.length} auteur·ice{orphanedAuthors.length > 1 ? 's' : ''} orphelin·e{orphanedAuthors.length > 1 ? 's' : ''}</span></>
            )}
            {' '}avec Gemini pour identifier les associations manquantes.
          </p>
          <p className="max-w-md text-center text-caption text-white/35">
            L'IA utilise le contexte temporel (éléments importés au même moment) et le graphe de citations existant pour inférer les liens.
          </p>
          <Button
            type="button"
            variant="outline"
            outlineWeight="accent"
            tone="magic"
            onClick={() => void state.startAnalysis()}
          >
            <Sparkles size={13} /> {state.error ? 'Réessayer' : 'Lancer l\'analyse'}
          </Button>
        </div>
      )}

      {state.phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={24} className="animate-spin text-cyan/60" />
          <div className="w-64">
            <div className="mb-2 flex justify-between text-[0.78rem] text-white/40">
              <span>Analyse Gemini…</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-cyan/50 transition-all duration-500"
                style={{ width: `${Math.max(state.progress, 5)}%` }}
              />
            </div>
          </div>
          <p className="text-[0.78rem] text-white/30">
            {state.reconcileBooks.length + orphanedAuthors.length} éléments à réconcilier
          </p>
        </div>
      )}

      {state.phase === 'applying' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={20} className="animate-spin text-cyan/60" />
          <p className="text-ui text-white/50">Application des modifications…</p>
        </div>
      )}

      {state.phase === 'review' && state.result && (
        <ReviewPhase
          result={state.result}
          authorsMap={authorsMap}
          bookById={state.bookById}
          acceptedAuthorMatches={state.acceptedAuthorMatches}
          acceptedSourceMatches={state.acceptedSourceMatches}
          hintsSaved={state.hintsSaved}
          totalAccepted={state.totalAccepted}
          onToggleAuthor={state.toggleAuthorMatch}
          onToggleSource={state.toggleSourceMatch}
          onSaveHints={state.saveHints}
          onApply={state.applySelected}
          onCancel={handleClose}
        />
      )}

      {state.phase === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6">
          {state.applyOutcome && state.applyOutcome.attempted > 0 ? (
            <>
              <p className="text-[0.9rem] text-green/70">
                <Check size={14} className="mr-1 inline" />
                {state.applyOutcome.attempted} écriture{state.applyOutcome.attempted > 1 ? 's' : ''} envoyée{state.applyOutcome.attempted > 1 ? 's' : ''}.
              </p>
              <p className="max-w-md text-center text-caption text-white/40">
                Si les mêmes suggestions reviennent au prochain lancement, regarde les toasts : certaines lignes ont pu être refusées silencieusement (RLS, conflit, réseau). Le log d'audit garde une trace de ce qui a effectivement été écrit.
              </p>
            </>
          ) : state.result && (state.result.authorToBook.length > 0 || state.result.bookToSource.length > 0) ? (
            <p className="text-[0.9rem] text-white/50">
              Aucune suggestion n'a été acceptée.
            </p>
          ) : (
            <p className="text-[0.9rem] text-white/50">
              Aucune correspondance trouvée — le contexte d'import ne permet pas d'identifier les associations.
            </p>
          )}
          {state.applyOutcome && state.applyOutcome.skipped > 0 && (
            <details className="w-full max-w-lg rounded-lg border border-amber/20 bg-amber/5 p-3">
              <summary className="cursor-pointer text-ui text-amber/80">
                {state.applyOutcome.skipped} match{state.applyOutcome.skipped > 1 ? 's' : ''} ignoré{state.applyOutcome.skipped > 1 ? 's' : ''}
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-caption text-white/55">
                {state.applyOutcome.skippedReasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </details>
          )}
          {state.result && state.result.hints.length > 0 && (
            <HintsPanel result={state.result} bookById={state.bookById} authorsMap={authorsMap} hintsSaved={state.hintsSaved} onSave={state.saveHints} className="w-full max-w-lg" />
          )}
          <Button type="button" variant="surface" onClick={handleClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  )
}

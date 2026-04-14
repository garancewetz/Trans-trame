import clsx from 'clsx'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { Button } from '@/common/components/ui/Button'
import type { Author, AuthorId, Book } from '@/types/domain'
import { useEnrichmentState } from '../hooks/useEnrichmentState'
import { EnrichmentRow } from './AIEnrichReviewTable'

type Props = {
  open: boolean
  books: Book[]
  authorsMap: Map<AuthorId, Author>
  onClose: () => void
  onUpdateBook?: (book: Book) => unknown
  onAddAuthor?: (author: Author) => unknown
}

export function AIEnrichModal({ open, books, authorsMap, onClose, onUpdateBook, onAddAuthor }: Props) {
  const {
    phase, enrichments, progress, error, checkedCount, unchangedCount, allChecked,
    startAnalysis, toggleItem, toggleField, toggleAll, applySelected, resetState,
  } = useEnrichmentState({ books, authorsMap, onUpdateBook, onAddAuthor })

  const handleClose = () => { resetState(); onClose() }

  if (!open) return null

  // Compute emerging themes summary for review phase
  const themeCounts = new Map<string, number>()
  for (const e of enrichments) {
    for (const t of e.suggestedThemes) {
      themeCounts.set(t, (themeCounts.get(t) || 0) + 1)
    }
  }
  const sortedThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <Modal
      open={open}
      title="Enrichissement AI"
      titleIcon={<Sparkles size={14} className="text-cyan/70" />}
      onClose={handleClose}
      maxWidth="max-w-6xl"
    >
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          {error && (
            <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-2 text-ui text-red/70">
              {error}
            </p>
          )}
          <p className="text-[0.9rem] text-white/60">
            Analyser {books.length} ouvrage{books.length > 1 ? 's' : ''} avec Gemini pour
            enrichir les catégories et les champs manquants.
          </p>
          <Button
            type="button"
            variant="outline"
            outlineWeight="accent"
            tone="magic"
            onClick={() => void startAnalysis()}
          >
            <Sparkles size={13} /> {error ? 'Réessayer' : 'Lancer l\'analyse'}
          </Button>
        </div>
      )}

      {phase === 'loading' && (() => {
        const estimate = books.length <= 40 ? '~10s' : `~${Math.ceil(books.length / 40) * 15}s`
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={24} className="animate-spin text-cyan/60" />
            <div className="w-64">
              <div className="mb-2 flex justify-between text-[0.78rem] text-white/40">
                <span>Analyse Gemini…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-cyan/50 transition-all duration-500"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>
            </div>
            <p className="text-[0.78rem] text-white/30">
              {books.length} ouvrage{books.length > 1 ? 's' : ''} — estimation {estimate}
            </p>
          </div>
        )
      })()}

      {phase === 'applying' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={20} className="animate-spin text-cyan/60" />
          <p className="text-ui text-white/50">Application des modifications…</p>
        </div>
      )}

      {phase === 'review' && (
        <div className="flex max-h-[70vh] flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-label text-white/45">
              {enrichments.length} enrichissement{enrichments.length > 1 ? 's' : ''}
              {unchangedCount > 0 && (
                <span className="text-white/25"> · {unchangedCount} ouvrage{unchangedCount > 1 ? 's' : ''} déjà complet{unchangedCount > 1 ? 's' : ''}</span>
              )}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="cursor-pointer text-[0.78rem] text-white/35 transition-colors hover:text-white/60"
            >
              {allChecked ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>

          {sortedThemes.length > 0 && (
            <div className="shrink-0 rounded-lg border border-dashed border-white/10 bg-white/2 px-4 py-2.5">
              <p className="mb-1.5 text-caption font-medium text-white/35">Thématiques émergentes</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedThemes.map(([theme, count]) => (
                  <span key={theme} className="rounded-full border border-dashed border-white/20 bg-white/5 px-2.5 py-0.5 text-[0.78rem] text-white/60">
                    {theme}
                    {count > 1 && <span className="ml-1 text-[0.7rem] text-white/30">{count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/6">
            <table className="w-full text-label">
              <thead className="sticky top-0 z-10 bg-[#1a1a2e]">
                <tr className="border-b border-white/8 text-left text-white/35">
                  <th className="w-8 px-3 py-2" />
                  <th className="px-2 py-2">Ouvrage</th>
                  <th className="px-2 py-2">Propositions AI</th>
                </tr>
              </thead>
              <tbody>
                {enrichments.map((e) => (
                  <EnrichmentRow
                    key={e.bookId}
                    enrichment={e}
                    authorsMap={authorsMap}
                    onToggleItem={toggleItem}
                    onToggleField={toggleField}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 gap-2 pt-1">
            <Button type="button" variant="surface" onClick={handleClose}>Annuler</Button>
            <Button
              type="button"
              disabled={checkedCount === 0}
              onClick={applySelected}
              className={clsx(
                'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-ui font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
                'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
              )}
            >
              <Check size={13} />
              Appliquer ({checkedCount})
            </Button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6">
          {enrichments.length === 0 ? (
            <p className="text-[0.9rem] text-white/50">
              {books.some((b) => !b.authorIds || b.authorIds.length === 0)
                ? 'Aucun enrichissement trouvé — l\'IA n\'a pas pu identifier les auteur·ices manquant·es.'
                : 'Aucun enrichissement trouvé — les ouvrages sont déjà complets.'}
            </p>
          ) : (
            <p className="text-[0.9rem] text-green/70">
              <Check size={14} className="mr-1 inline" />
              {checkedCount} ouvrage{checkedCount > 1 ? 's' : ''} enrichi{checkedCount > 1 ? 's' : ''}.
            </p>
          )}
          <Button type="button" variant="surface" onClick={handleClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  )
}

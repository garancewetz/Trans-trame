import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, Check, Lightbulb, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { Button } from '@/common/components/ui/Button'
import type { Author, AuthorId, Book, Link } from '@/types/domain'
import { useOrphanReconcileData } from '../hooks/useOrphanReconcileData'
import {
  reconcileOrphansWithLLM,
  type ReconcileMatch,
  type ReconcileResult,
  type SourceMatch,
} from '../reconcileOrphans.llm'

type Props = {
  open: boolean
  /** Livres sans aucun lien de citation (orphelins du graphe) */
  orphanBooks: Book[]
  /** Livres sans aucun·e auteur·ice assigné·e */
  booksWithoutAuthors: Book[]
  orphanedAuthors: Author[]
  allBooks: Book[]
  links: Link[]
  authorsMap: Map<AuthorId, Author>
  onUpdateBook?: (book: Book) => unknown
  onAddLink?: (link: { source: string; target: string; citation_text: string; edition: string; page: string; context: string }) => unknown
  onClose: () => void
}

const CONFIDENCE_STYLE = {
  high: 'border-green/40 bg-green/10 text-green/80',
  medium: 'border-amber/40 bg-amber/10 text-amber/80',
  low: 'border-white/20 bg-white/5 text-white/50',
}

const CONFIDENCE_LABEL = { high: 'haute', medium: 'moyenne', low: 'faible' }

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
  onClose,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'review' | 'applying' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReconcileResult | null>(null)
  const [acceptedAuthorMatches, setAcceptedAuthorMatches] = useState<Set<string>>(new Set())
  const [acceptedSourceMatches, setAcceptedSourceMatches] = useState<Set<string>>(new Set())
  const [hintsSaved, setHintsSaved] = useState(false)
  const [progress, setProgress] = useState(0)
  const fakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Merge: books to reconcile = link-orphans + books without authors (deduplicated)
  const reconcileBooks = useMemo(() => {
    const ids = new Set<string>()
    const result: Book[] = []
    for (const b of [...orphanBooks, ...booksWithoutAuthors]) {
      if (ids.has(b.id)) continue
      ids.add(b.id)
      result.push(b)
    }
    return result
  }, [orphanBooks, booksWithoutAuthors])

  const payload = useOrphanReconcileData(reconcileBooks, orphanedAuthors, allBooks, links, authorsMap)

  // Simulated progress
  useEffect(() => {
    if (phase === 'loading' && progress === 0) {
      fakeTimerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) { clearInterval(fakeTimerRef.current!); return p }
          return p + (85 - p) * 0.06
        })
      }, 600)
    }
    if (phase !== 'loading' && fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current)
    }
    return () => { if (fakeTimerRef.current) clearInterval(fakeTimerRef.current) }
  }, [phase, progress])

  const startAnalysis = async () => {
    setPhase('loading')
    setProgress(0)
    setError(null)

    try {
      const res = await reconcileOrphansWithLLM(payload)
      if (fakeTimerRef.current) clearInterval(fakeTimerRef.current)
      setProgress(100)
      setResult(res)

      // Pre-select all matches (user can uncheck unwanted ones)
      setAcceptedAuthorMatches(new Set(res.authorToBook.map(matchKey)))
      setAcceptedSourceMatches(new Set(res.bookToSource.map(sourceKey)))

      if (res.authorToBook.length === 0 && res.bookToSource.length === 0) {
        setPhase('done')
      } else {
        setPhase('review')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur lors de l'appel à Gemini. (${msg})`)
      setPhase('idle')
    }
  }

  const matchKey = (m: ReconcileMatch) => `${m.authorId}:${m.bookId}`
  const sourceKey = (m: SourceMatch) => `${m.orphanBookId}:${m.sourceBookId}`

  const toggleAuthorMatch = (m: ReconcileMatch) => {
    const key = matchKey(m)
    setAcceptedAuthorMatches((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSourceMatch = (m: SourceMatch) => {
    const key = sourceKey(m)
    setAcceptedSourceMatches((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const bookById = new Map(allBooks.map((b) => [b.id, b]))

  const applySelected = () => {
    if (!result) return
    setPhase('applying')

    // Apply author → book matches
    for (const m of result.authorToBook) {
      if (!acceptedAuthorMatches.has(matchKey(m))) continue
      const book = bookById.get(m.bookId)
      if (!book) continue
      const currentIds = book.authorIds || []
      if (currentIds.includes(m.authorId)) continue
      onUpdateBook?.({ ...book, authorIds: [...currentIds, m.authorId] })
    }

    // Apply book → source citation links
    for (const m of result.bookToSource) {
      if (!acceptedSourceMatches.has(sourceKey(m))) continue
      onAddLink?.({
        source: m.sourceBookId,
        target: m.orphanBookId,
        citation_text: '',
        edition: '',
        page: '',
        context: '',
      })
    }

    setPhase('done')
  }

  const handleClose = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setAcceptedAuthorMatches(new Set())
    setAcceptedSourceMatches(new Set())
    setHintsSaved(false)
    onClose()
  }

  if (!open) return null

  const totalAccepted = acceptedAuthorMatches.size + acceptedSourceMatches.size

  return (
    <Modal
      open={open}
      title="Réconciliation IA"
      titleIcon={<Sparkles size={14} className="text-cyan/70" />}
      onClose={handleClose}
      maxWidth="max-w-5xl"
    >
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          {error && (
            <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-2 text-ui text-red/70">
              {error}
            </p>
          )}
          <p className="text-center text-[0.9rem] text-white/60">
            Analyser le contexte d'import de{' '}
            <span className="font-semibold text-white/80">{reconcileBooks.length} ouvrage{reconcileBooks.length > 1 ? 's' : ''} à réconcilier</span>
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
            onClick={() => void startAnalysis()}
          >
            <Sparkles size={13} /> {error ? 'Réessayer' : 'Lancer l\'analyse'}
          </Button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={24} className="animate-spin text-cyan/60" />
          <div className="w-64">
            <div className="mb-2 flex justify-between text-[0.78rem] text-white/40">
              <span>Analyse Gemini…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-cyan/50 transition-all duration-500"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
          </div>
          <p className="text-[0.78rem] text-white/30">
            {reconcileBooks.length + orphanedAuthors.length} éléments à réconcilier
          </p>
        </div>
      )}

      {phase === 'applying' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={20} className="animate-spin text-cyan/60" />
          <p className="text-ui text-white/50">Application des modifications…</p>
        </div>
      )}

      {phase === 'review' && result && (() => {
        const authorMatches = result.authorToBook
        const sourceMatches = result.bookToSource

        return (
          <div className="flex max-h-[70vh] flex-col gap-4">
            {/* Stats header */}
            <p className="text-label text-white/45">
              {authorMatches.length + sourceMatches.length} suggestion{authorMatches.length + sourceMatches.length > 1 ? 's' : ''}
            </p>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {/* Section A: Author → Book */}
              {authorMatches.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[0.78rem] font-semibold uppercase tracking-wider text-white/35">
                    Auteur·ice → Ouvrage
                  </h4>
                  <div className="rounded-lg border border-white/6">
                    <table className="w-full text-label">
                      <thead>
                        <tr className="border-b border-white/8 text-left text-white/35">
                          <th className="w-8 px-3 py-2" />
                          <th className="px-2 py-2">Auteur·ice</th>
                          <th className="px-2 py-2">Ouvrage suggéré</th>
                          <th className="w-20 px-2 py-2">Confiance</th>
                          <th className="px-2 py-2">Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authorMatches.map((m) => {
                          const author = authorsMap.get(m.authorId)
                          const book = bookById.get(m.bookId)
                          const accepted = acceptedAuthorMatches.has(matchKey(m))
                          return (
                            <tr
                              key={matchKey(m)}
                              className={[
                                'border-b border-white/4 transition-colors',
                                accepted ? 'bg-cyan/3' : 'opacity-40',
                              ].join(' ')}
                            >
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => toggleAuthorMatch(m)}
                                  className={[
                                    'flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
                                    accepted
                                      ? 'border-cyan/60 bg-cyan/15'
                                      : 'border-white/20 hover:border-white/40',
                                  ].join(' ')}
                                >
                                  {accepted && <Check size={10} className="text-cyan" />}
                                </button>
                              </td>
                              <td className="px-2 py-2 font-medium text-white/75">
                                {author
                                  ? [author.firstName, author.lastName].filter(Boolean).join(' ')
                                  : m.authorId}
                              </td>
                              <td className="px-2 py-2 text-white/65">
                                {book?.title || m.bookId}
                                {book?.year && <span className="ml-1 text-white/30">({book.year})</span>}
                              </td>
                              <td className="px-2 py-2">
                                <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${CONFIDENCE_STYLE[m.confidence]}`}>
                                  {CONFIDENCE_LABEL[m.confidence]}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-caption text-white/40">
                                {m.reason}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section B: Book → Source */}
              {sourceMatches.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[0.78rem] font-semibold uppercase tracking-wider text-white/35">
                    Ouvrage orphelin → Source (lien de citation)
                  </h4>
                  <div className="rounded-lg border border-white/6">
                    <table className="w-full text-label">
                      <thead>
                        <tr className="border-b border-white/8 text-left text-white/35">
                          <th className="w-8 px-3 py-2" />
                          <th className="px-2 py-2">Ouvrage orphelin</th>
                          <th className="px-2 py-2">Cité par</th>
                          <th className="w-20 px-2 py-2">Confiance</th>
                          <th className="px-2 py-2">Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceMatches.map((m) => {
                          const orphanBook = bookById.get(m.orphanBookId)
                          const sourceBook = bookById.get(m.sourceBookId)
                          const accepted = acceptedSourceMatches.has(sourceKey(m))
                          return (
                            <tr
                              key={sourceKey(m)}
                              className={[
                                'border-b border-white/4 transition-colors',
                                accepted ? 'bg-cyan/3' : 'opacity-40',
                              ].join(' ')}
                            >
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => toggleSourceMatch(m)}
                                  className={[
                                    'flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
                                    accepted
                                      ? 'border-cyan/60 bg-cyan/15'
                                      : 'border-white/20 hover:border-white/40',
                                  ].join(' ')}
                                >
                                  {accepted && <Check size={10} className="text-cyan" />}
                                </button>
                              </td>
                              <td className="px-2 py-2 text-white/65">
                                {orphanBook?.title || m.orphanBookId}
                              </td>
                              <td className="px-2 py-2 font-medium text-white/75">
                                {sourceBook?.title || m.sourceBookId}
                              </td>
                              <td className="px-2 py-2">
                                <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${CONFIDENCE_STYLE[m.confidence]}`}>
                                  {CONFIDENCE_LABEL[m.confidence]}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-caption text-white/40">
                                {m.reason}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Hints — research suggestions for unmatched items */}
            {result.hints.length > 0 && (
              <div className="shrink-0 rounded-lg border border-dashed border-amber/20 bg-amber/3 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-amber/60" />
                    <p className="text-[0.78rem] font-semibold text-amber/60">
                      Pistes de recherche
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={hintsSaved}
                    onClick={() => {
                      for (const h of result.hints) {
                        const book = bookById.get(h.bookId)
                        if (book) {
                          onUpdateBook?.({ ...book, todo: h.hint })
                        }
                      }
                      setHintsSaved(true)
                    }}
                    className={[
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-all',
                      hintsSaved
                        ? 'border-green/30 text-green/60'
                        : 'cursor-pointer border-amber/30 text-amber/60 hover:bg-amber/10',
                    ].join(' ')}
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
            )}

            {/* Footer */}
            <div className="flex shrink-0 gap-2 pt-1">
              <Button type="button" variant="surface" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={totalAccepted === 0}
                onClick={applySelected}
                className={[
                  'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-ui font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
                  'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
                ].join(' ')}
              >
                <Check size={13} />
                Appliquer ({totalAccepted})
              </Button>
            </div>
          </div>
        )
      })()}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6">
          {result && (result.authorToBook.length > 0 || result.bookToSource.length > 0) ? (
            <p className="text-[0.9rem] text-green/70">
              <Check size={14} className="mr-1 inline" />
              {totalAccepted} association{totalAccepted > 1 ? 's' : ''} appliquée{totalAccepted > 1 ? 's' : ''}.
            </p>
          ) : (
            <p className="text-[0.9rem] text-white/50">
              Aucune correspondance trouvée — le contexte d'import ne permet pas d'identifier les associations.
            </p>
          )}
          {result && result.hints.length > 0 && (
            <div className="w-full max-w-lg rounded-lg border border-dashed border-amber/20 bg-amber/3 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={12} className="text-amber/60" />
                  <p className="text-[0.78rem] font-semibold text-amber/60">
                    Pistes de recherche
                  </p>
                </div>
                <button
                  type="button"
                  disabled={hintsSaved}
                  onClick={() => {
                    for (const h of result.hints) {
                      const book = bookById.get(h.bookId)
                      if (book) {
                        onUpdateBook?.({ ...book, todo: h.hint })
                      }
                    }
                    setHintsSaved(true)
                  }}
                  className={[
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-all',
                    hintsSaved
                      ? 'border-green/30 text-green/60'
                      : 'cursor-pointer border-amber/30 text-amber/60 hover:bg-amber/10',
                  ].join(' ')}
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
          )}
          <Button type="button" variant="surface" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  )
}

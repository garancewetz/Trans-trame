import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { Button } from '@/common/components/ui/Button'
import { CATEGORY_THEME, narrowAxes, type Axis } from '@/common/utils/categories'
import type { Author, AuthorId, Book } from '@/types/domain'
import { parseWithLLMBatch, type LLMParsedResult } from '../parseSmartInput.llm'

type FieldDiff = { field: string; label: string; current: string; proposed: string }

type Enrichment = {
  bookId: string
  book: Book
  llm: LLMParsedResult
  checked: boolean
  newAxes: Axis[]
  diffs: FieldDiff[]
}

type Props = {
  open: boolean
  books: Book[]
  authorsMap: Map<AuthorId, Author>
  onClose: () => void
  onUpdateBook?: (book: Book) => unknown
}

export function AIEnrichModal({ open, books, authorsMap, onClose, onUpdateBook }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'review' | 'done'>('idle')
  const [enrichments, setEnrichments] = useState<Enrichment[]>([])
  const [progress, setProgress] = useState(0)
  const fakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Simulated progress that creeps up to ~85% while waiting for the API
  useEffect(() => {
    if (phase === 'loading' && progress === 0) {
      fakeTimerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) { clearInterval(fakeTimerRef.current!); return p }
          return p + (85 - p) * 0.08
        })
      }, 500)
    }
    if (phase !== 'loading' && fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current)
    }
    return () => { if (fakeTimerRef.current) clearInterval(fakeTimerRef.current) }
  }, [phase, progress])

  const [error, setError] = useState<string | null>(null)

  const startAnalysis = async () => {
    setPhase('loading')
    setProgress(0)
    setError(null)

    const lines = books.map((n, i) => {
      const authorNames = (n.authorIds || [])
        .map((id) => authorsMap.get(id))
        .filter(Boolean)
        .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
        .join(', ')
      const raw = [authorNames, n.title, n.year].filter(Boolean).join(', ') + '.'
      return { index: i, raw }
    })

    let llmResults: Map<number, LLMParsedResult>
    try {
      llmResults = await parseWithLLMBatch(lines, (done, total) => {
        if (fakeTimerRef.current) clearInterval(fakeTimerRef.current)
        setProgress(Math.round((done / total) * 100))
      })
    } catch (err) {
      const msg = err instanceof Error && err.name === 'TimeoutError'
        ? 'Gemini a mis trop de temps à répondre. Réessaie avec moins d\'ouvrages.'
        : 'Erreur lors de l\'appel à Gemini.'
      setError(msg)
      setPhase('idle')
      return
    }

    if (llmResults.size === 0) {
      setError('Gemini n\'a retourné aucun résultat. Vérifie ta clé API ou réessaie.')
      setPhase('idle')
      return
    }

    const items: Enrichment[] = []
    for (let i = 0; i < books.length; i++) {
      const llm = llmResults.get(i)
      if (!llm) continue
      const book = books[i]

      // Detect field differences
      const diffs: FieldDiff[] = []

      // Title
      if (llm.title && llm.title.toLowerCase() !== (book.title || '').toLowerCase()) {
        diffs.push({ field: 'title', label: 'Titre', current: book.title || '', proposed: llm.title })
      }

      // Author
      const currentAuthorNames = (book.authorIds || [])
        .map((id) => authorsMap.get(id))
        .filter(Boolean)
        .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
        .join(', ')
      const llmAuthorNames = llm.authors.map((a) => [a.firstName, a.lastName].filter(Boolean).join(' ')).join(', ')
      if (llmAuthorNames && llmAuthorNames.toLowerCase() !== currentAuthorNames.toLowerCase()) {
        diffs.push({ field: 'author', label: 'Auteur·ice', current: currentAuthorNames || '—', proposed: llmAuthorNames })
      }

      // Year
      const bookYear = book.year ?? null
      if (llm.year && llm.year !== bookYear) {
        diffs.push({ field: 'year', label: 'Année', current: bookYear ? String(bookYear) : '—', proposed: String(llm.year) })
      }

      // Axes
      const newAxes = llm.axes.length > 0 ? narrowAxes(llm.axes) : []
      const hasNewAxes = newAxes.length > 0 && (!book.axes || book.axes.length === 0 || newAxes.some((a) => !book.axes!.includes(a)))

      const hasChanges = diffs.length > 0 || hasNewAxes

      if (hasChanges) {
        items.push({
          bookId: book.id,
          book,
          llm,
          checked: true,
          newAxes: hasNewAxes ? newAxes : [],
          diffs,
        })
      }
    }

    setEnrichments(items)
    setPhase(items.length > 0 ? 'review' : 'done')
  }

  const toggleItem = (bookId: string) => {
    setEnrichments((prev) =>
      prev.map((e) => (e.bookId === bookId ? { ...e, checked: !e.checked } : e)),
    )
  }

  const applySelected = () => {
    for (const e of enrichments) {
      if (!e.checked) continue
      const updates: Partial<Book> = {}
      if (e.newAxes.length > 0) {
        const existing = e.book.axes || []
        updates.axes = [...new Set([...existing, ...e.newAxes])]
      }
      for (const d of e.diffs) {
        if (d.field === 'title') updates.title = d.proposed
        if (d.field === 'year') updates.year = parseInt(d.proposed, 10) || null
        // author diffs are shown for info but not auto-applied (needs authorIds mapping)
      }
      if (Object.keys(updates).length > 0) {
        onUpdateBook?.({ ...e.book, ...updates })
      }
    }
    setPhase('done')
  }

  const handleClose = () => {
    setPhase('idle')
    setEnrichments([])
    setError(null)
    onClose()
  }

  if (!open) return null

  const checkedCount = enrichments.filter((e) => e.checked).length

  return (
    <Modal
      open={open}
      title="Enrichissement AI"
      titleIcon={<Sparkles size={14} className="text-cyan/70" />}
      onClose={handleClose}
      maxWidth="max-w-3xl"
    >
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          {error && (
            <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-2 text-[0.85rem] text-red/70">
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

      {phase === 'review' && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.82rem] text-white/45">
            {enrichments.length} ouvrage{enrichments.length > 1 ? 's' : ''} avec des enrichissements possibles.
            Coche ceux que tu veux appliquer.
          </p>

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-white/6">
            <table className="w-full text-[0.82rem]">
              <thead>
                <tr className="border-b border-white/8 text-left text-white/35">
                  <th className="w-8 px-3 py-2" />
                  <th className="px-2 py-2">Ouvrage</th>
                  <th className="px-2 py-2">Propositions AI</th>
                </tr>
              </thead>
              <tbody>
                {enrichments.map((e) => {
                  const authorNames = (e.book.authorIds || [])
                    .map((id) => authorsMap.get(id))
                    .filter(Boolean)
                    .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
                    .join(', ')
                  const currentAxes = (e.book.axes || []).map((a) => CATEGORY_THEME[a]?.label).filter(Boolean)

                  return (
                    <tr
                      key={e.bookId}
                      className={[
                        'border-b border-white/4 transition-colors',
                        e.checked ? 'bg-cyan/3' : 'opacity-40',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => toggleItem(e.bookId)}
                          className={[
                            'mt-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
                            e.checked
                              ? 'border-cyan/60 bg-cyan/15'
                              : 'border-white/20 hover:border-white/40',
                          ].join(' ')}
                        >
                          {e.checked && <Check size={10} className="text-cyan" />}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-white/80">{e.book.title}</div>
                        {authorNames && <div className="text-[0.78rem] text-white/40">{authorNames}</div>}
                        {currentAxes.length > 0 && (
                          <div className="mt-0.5 text-[0.72rem] text-white/25">{currentAxes.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1.5">
                          {/* Field diffs */}
                          {e.diffs.map((d) => (
                            <div key={d.field} className="text-[0.78rem]">
                              <span className="text-white/35">{d.label} : </span>
                              <span className="text-red/40 line-through">{d.current}</span>
                              <span className="text-white/30"> → </span>
                              <span className="text-cyan/80">{d.proposed}</span>
                            </div>
                          ))}
                          {/* New axes */}
                          {e.newAxes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {e.newAxes.map((a) => (
                                <span
                                  key={a}
                                  className="rounded-full px-2 py-0.5 text-[0.72rem] font-medium"
                                  style={{
                                    backgroundColor: CATEGORY_THEME[a]?.color + '18',
                                    color: CATEGORY_THEME[a]?.color,
                                    border: `1px solid ${CATEGORY_THEME[a]?.color}30`,
                                  }}
                                >
                                  + {CATEGORY_THEME[a]?.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="surface" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={checkedCount === 0}
              onClick={applySelected}
              className={[
                'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-[0.85rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
                'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
              ].join(' ')}
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
            <p className="text-[0.9rem] text-white/50">Aucun enrichissement trouvé — les ouvrages sont déjà complets.</p>
          ) : (
            <p className="text-[0.9rem] text-green/70">
              <Check size={14} className="mr-1 inline" />
              {checkedCount} ouvrage{checkedCount > 1 ? 's' : ''} enrichi{checkedCount > 1 ? 's' : ''}.
            </p>
          )}
          <Button type="button" variant="surface" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  )
}

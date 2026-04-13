import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { Button } from '@/common/components/ui/Button'
import { CATEGORY_THEME, narrowAxes, type Axis } from '@/common/utils/categories'
import type { Author, AuthorId, Book } from '@/types/domain'
import { parseWithLLMBatch, type LLMParsedResult } from '../parseSmartInput.llm'
import { resolveOrCreateAuthors } from '../smartImportModal.utils'

type FieldDiff = { field: string; label: string; current: string; proposed: string }

type Enrichment = {
  bookId: string
  book: Book
  llm: LLMParsedResult
  /** Set of accepted field keys: diff field names ('title','year') + 'axes' + 'themes' */
  acceptedFields: Set<string>
  newAxes: Axis[]
  diffs: FieldDiff[]
  suggestedThemes: string[]
}

type Props = {
  open: boolean
  books: Book[]
  authorsMap: Map<AuthorId, Author>
  onClose: () => void
  onUpdateBook?: (book: Book) => unknown
  onAddAuthor?: (author: Author) => unknown
}

export function AIEnrichModal({ open, books, authorsMap, onClose, onUpdateBook, onAddAuthor }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'review' | 'applying' | 'done'>('idle')
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
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      const msg = isTimeout
        ? 'Gemini a mis trop de temps à répondre. Réessaie avec moins d\'ouvrages.'
        : `Erreur lors de l'appel à Gemini.${err instanceof Error ? ` (${err.message})` : ''}`
      if (import.meta.env.DEV) console.warn('[AIEnrich]', err)
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

      const existingAxes = book.axes || []
      const suggestedThemes = (llm.suggestedThemes || [])
        .filter((t) => !existingAxes.includes(`UNCATEGORIZED:${t}`))
      const hasChanges = diffs.length > 0 || hasNewAxes || suggestedThemes.length > 0

      if (hasChanges) {
        const allKeys = new Set<string>([
          ...diffs.map((d) => d.field),
          ...(hasNewAxes ? ['axes'] : []),
          ...(suggestedThemes.length > 0 ? ['themes'] : []),
        ])
        items.push({
          bookId: book.id,
          book,
          llm,
          acceptedFields: allKeys,
          newAxes: hasNewAxes ? newAxes : [],
          diffs,
          suggestedThemes,
        })
      }
    }

    setEnrichments(items)
    setPhase(items.length > 0 ? 'review' : 'done')
  }

  const getAllKeys = (e: Enrichment) => new Set<string>([
    ...e.diffs.map((d) => d.field),
    ...(e.newAxes.length > 0 ? ['axes'] : []),
    ...(e.suggestedThemes.length > 0 ? ['themes'] : []),
  ])

  const toggleItem = (bookId: string) => {
    setEnrichments((prev) =>
      prev.map((e) => {
        if (e.bookId !== bookId) return e
        const allOn = e.acceptedFields.size === getAllKeys(e).size
        return { ...e, acceptedFields: allOn ? new Set<string>() : getAllKeys(e) }
      }),
    )
  }

  const toggleField = (bookId: string, field: string) => {
    setEnrichments((prev) =>
      prev.map((e) => {
        if (e.bookId !== bookId) return e
        const next = new Set(e.acceptedFields)
        if (next.has(field)) next.delete(field)
        else next.add(field)
        return { ...e, acceptedFields: next }
      }),
    )
  }

  const applySelected = async () => {
    setPhase('applying')
    const existingAuthors = [...authorsMap.values()]
    const authorPromises: PromiseLike<unknown>[] = []
    const pendingUpdates: { book: Book; updates: Partial<Book> }[] = []

    for (const e of enrichments) {
      if (e.acceptedFields.size === 0) continue
      const updates: Partial<Book> = {}
      const acceptAxes = e.acceptedFields.has('axes')
      const acceptThemes = e.acceptedFields.has('themes')
      if ((acceptAxes && e.newAxes.length > 0) || (acceptThemes && e.suggestedThemes.length > 0)) {
        const existing = e.book.axes || []
        const existingThemes = existing.filter((a) => a.startsWith('UNCATEGORIZED:'))
        const existingPrimary = existing.filter((a) => !a.startsWith('UNCATEGORIZED:'))
        const primaryToSet = acceptAxes ? e.newAxes : existingPrimary
        const themesToSet = acceptThemes
          ? e.suggestedThemes.map((t) => `UNCATEGORIZED:${t}`)
          : existingThemes
        updates.axes = [...new Set([...primaryToSet, ...themesToSet])]
      }
      for (const d of e.diffs) {
        if (!e.acceptedFields.has(d.field)) continue
        if (d.field === 'title') updates.title = d.proposed
        if (d.field === 'year') updates.year = parseInt(d.proposed, 10) || null
        if (d.field === 'author' && onAddAuthor) {
          const { ids, promises } = resolveOrCreateAuthors(e.llm.authors, existingAuthors, onAddAuthor)
          if (ids.length > 0) updates.authorIds = ids
          authorPromises.push(...promises)
        }
      }
      if (Object.keys(updates).length > 0) {
        pendingUpdates.push({ book: e.book, updates })
      }
    }

    // Wait for author creation before updating books (authorIds must exist in DB)
    if (authorPromises.length > 0) await Promise.all(authorPromises)

    for (const { book, updates } of pendingUpdates) {
      onUpdateBook?.({ ...book, ...updates })
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

  const checkedCount = enrichments.filter((e) => e.acceptedFields.size > 0).length
  const unchangedCount = books.length - enrichments.length

  const toggleAll = () => {
    const allChecked = enrichments.every((e) => e.acceptedFields.size === getAllKeys(e).size)
    setEnrichments((prev) => prev.map((e) => ({ ...e, acceptedFields: allChecked ? new Set<string>() : getAllKeys(e) })))
  }

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

      {phase === 'review' && (() => {
        // Compute emerging themes summary
        const themeCounts = new Map<string, number>()
        for (const e of enrichments) {
          for (const t of e.suggestedThemes) {
            themeCounts.set(t, (themeCounts.get(t) || 0) + 1)
          }
        }
        const sortedThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])
        const allChecked = enrichments.every((e) => e.acceptedFields.size === getAllKeys(e).size)

        return (
          <div className="flex max-h-[70vh] flex-col gap-3">
            {/* Header: stats + select all */}
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

            {/* Emerging themes summary — above table */}
            {sortedThemes.length > 0 && (
              <div className="shrink-0 rounded-lg border border-dashed border-white/10 bg-white/2 px-4 py-2.5">
                <p className="mb-1.5 text-caption font-medium text-white/35">
                  Thématiques émergentes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sortedThemes.map(([theme, count]) => (
                    <span
                      key={theme}
                      className="rounded-full border border-dashed border-white/20 bg-white/5 px-2.5 py-0.5 text-[0.78rem] text-white/60"
                    >
                      {theme}
                      {count > 1 && (
                        <span className="ml-1 text-[0.7rem] text-white/30">{count}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Enrichments table */}
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
                  {enrichments.map((e) => {
                    const authorNames = (e.book.authorIds || [])
                      .map((id) => authorsMap.get(id))
                      .filter(Boolean)
                      .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
                      .join(', ')
                    const currentAxes = (e.book.axes || []).map((a) => CATEGORY_THEME[a as Axis]?.label).filter(Boolean)

                    const rowAllOn = e.acceptedFields.size === getAllKeys(e).size
                    const rowPartial = e.acceptedFields.size > 0 && !rowAllOn

                    return (
                      <tr
                        key={e.bookId}
                        className={[
                          'border-b border-white/4 transition-colors',
                          e.acceptedFields.size > 0 ? 'bg-cyan/3' : 'opacity-40',
                        ].join(' ')}
                      >
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleItem(e.bookId)}
                            className={[
                              'mt-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
                              rowAllOn
                                ? 'border-cyan/60 bg-cyan/15'
                                : rowPartial
                                  ? 'border-cyan/40 bg-cyan/8'
                                  : 'border-white/20 hover:border-white/40',
                            ].join(' ')}
                          >
                            {rowAllOn && <Check size={10} className="text-cyan" />}
                            {rowPartial && <span className="block h-1.5 w-1.5 rounded-sm bg-cyan/60" />}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <div className="font-medium text-white/80">{e.book.title}</div>
                          {authorNames && <div className="text-[0.78rem] text-white/40">{authorNames}</div>}
                          {currentAxes.length > 0 && (
                            <div className="mt-0.5 text-micro text-white/25">{currentAxes.join(', ')}</div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-1.5">
                            {/* Field diffs */}
                            {e.diffs.map((d) => {
                              const accepted = e.acceptedFields.has(d.field)
                              return (
                                <div key={d.field} className="flex items-center gap-1.5 text-[0.78rem]">
                                  <button
                                    type="button"
                                    onClick={() => toggleField(e.bookId, d.field)}
                                    className={[
                                      'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all',
                                      accepted ? 'border-cyan/60 bg-cyan/15' : 'border-white/20 hover:border-white/40',
                                    ].join(' ')}
                                  >
                                    {accepted && <Check size={8} className="text-cyan" />}
                                  </button>
                                  <span className={!accepted ? 'opacity-35' : ''}>
                                    <span className="text-white/35">{d.label} : </span>
                                    <span className="text-red/40 line-through">{d.current}</span>
                                    <span className="text-white/30"> → </span>
                                    <span className="text-cyan/80">{d.proposed}</span>
                                  </span>
                                </div>
                              )
                            })}
                            {/* New axes */}
                            {e.newAxes.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleField(e.bookId, 'axes')}
                                  className={[
                                    'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all',
                                    e.acceptedFields.has('axes') ? 'border-cyan/60 bg-cyan/15' : 'border-white/20 hover:border-white/40',
                                  ].join(' ')}
                                >
                                  {e.acceptedFields.has('axes') && <Check size={8} className="text-cyan" />}
                                </button>
                                <div className={['flex flex-wrap items-center gap-1', !e.acceptedFields.has('axes') ? 'opacity-35' : ''].join(' ')}>
                                  <span className="text-micro text-white/35">Catégories :</span>
                                  {e.newAxes.map((a) => (
                                    <span
                                      key={a}
                                      className="rounded-full px-2 py-0.5 text-micro font-medium"
                                      style={{
                                        backgroundColor: CATEGORY_THEME[a]?.color + '18',
                                        color: CATEGORY_THEME[a]?.color,
                                        border: `1px solid ${CATEGORY_THEME[a]?.color}30`,
                                      }}
                                    >
                                      {CATEGORY_THEME[a]?.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Suggested emerging themes */}
                            {e.suggestedThemes.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleField(e.bookId, 'themes')}
                                  className={[
                                    'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all',
                                    e.acceptedFields.has('themes') ? 'border-cyan/60 bg-cyan/15' : 'border-white/20 hover:border-white/40',
                                  ].join(' ')}
                                >
                                  {e.acceptedFields.has('themes') && <Check size={8} className="text-cyan" />}
                                </button>
                                <div className={['flex flex-wrap gap-1', !e.acceptedFields.has('themes') ? 'opacity-35' : ''].join(' ')}>
                                  {e.suggestedThemes.map((theme) => (
                                    <span
                                      key={theme}
                                      className="rounded-full border border-dashed border-white/20 bg-white/4 px-2 py-0.5 text-micro text-white/50"
                                    >
                                      {theme}
                                    </span>
                                  ))}
                                </div>
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

            <div className="flex shrink-0 gap-2 pt-1">
              <Button type="button" variant="surface" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={checkedCount === 0}
                onClick={applySelected}
                className={[
                  'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-ui font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
                  'border-green/30 bg-green/6 text-green/75 hover:bg-green/12',
                ].join(' ')}
              >
                <Check size={13} />
                Appliquer ({checkedCount})
              </Button>
            </div>
          </div>
        )
      })()}

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

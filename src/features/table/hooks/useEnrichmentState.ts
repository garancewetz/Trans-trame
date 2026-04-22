import { useState } from 'react'
import { narrowAxes, type Axis } from '@/common/utils/categories'
import { getResourceType } from '@/common/constants/resourceTypes'
import type { Author, AuthorId, Book } from '@/types/domain'
import { parseWithLLMBatch, type LLMParsedResult } from '../parseSmartInput.llm'
import { useFakeProgress } from '@/common/hooks/useFakeProgress'
import { resolveOrCreateAuthors } from '../smartImportModal.utils'

type FieldDiff = { field: string; label: string; current: string; proposed: string }

export type EnrichableField = 'title' | 'author' | 'year' | 'resourceType' | 'axes' | 'themes'

export const ENRICHABLE_FIELDS: { key: EnrichableField; label: string }[] = [
  { key: 'title',        label: 'Titre' },
  { key: 'author',       label: 'Auteur·ice' },
  { key: 'year',         label: 'Année' },
  { key: 'resourceType', label: 'Type' },
  { key: 'axes',         label: 'Catégories' },
  { key: 'themes',       label: 'Thématiques émergentes' },
]

export type Enrichment = {
  bookId: string
  book: Book
  llm: LLMParsedResult
  /** Set of accepted field keys: diff field names ('title','year') + 'axes' + 'themes' */
  acceptedFields: Set<string>
  newAxes: Axis[]
  diffs: FieldDiff[]
  suggestedThemes: string[]
}

export type EnrichPhase = 'idle' | 'loading' | 'review' | 'applying' | 'done'

function getAllKeys(e: Enrichment): Set<string> {
  return new Set<string>([
    ...e.diffs.map((d) => d.field),
    ...(e.newAxes.length > 0 ? ['axes'] : []),
    ...(e.suggestedThemes.length > 0 ? ['themes'] : []),
  ])
}

export function useEnrichmentState({
  books,
  authorsMap,
  onUpdateBook,
  onAddAuthor,
}: {
  books: Book[]
  authorsMap: Map<AuthorId, Author>
  onUpdateBook?: (book: Book) => unknown
  onAddAuthor?: (author: Author) => unknown
}) {
  const [phase, setPhase] = useState<EnrichPhase>('idle')
  const [enrichments, setEnrichments] = useState<Enrichment[]>([])
  const { progress: fakeProgress, reset: resetFakeProgress } = useFakeProgress({ active: phase === 'loading', rate: 0.08, interval: 500 })
  const [realProgress, setRealProgress] = useState<number | null>(null)
  const progress = realProgress ?? fakeProgress
  const [error, setError] = useState<string | null>(null)
  const [enabledFields, setEnabledFields] = useState<Set<EnrichableField>>(
    () => new Set(ENRICHABLE_FIELDS.map((f) => f.key)),
  )

  const toggleEnabledField = (field: EnrichableField) => {
    setEnabledFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const startAnalysis = async () => {
    setPhase('loading')
    resetFakeProgress()
    setRealProgress(null)
    setError(null)

    const lines = books.map((n, i) => {
      const authorNames = (n.authorIds || [])
        .map((id) => authorsMap.get(id))
        .filter(Boolean)
        .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
        .join(', ')
      const raw = [authorNames || '[auteur·ice inconnu·e]', n.title, n.year].filter(Boolean).join(', ') + '.'
      return { index: i, raw }
    })

    let llmResults: Map<number, LLMParsedResult>
    try {
      llmResults = await parseWithLLMBatch(lines, (done, total) => {
        setRealProgress(Math.round((done / total) * 100))
      })
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      const msg = isTimeout
        ? 'Gemini a mis trop de temps à répondre. Réessaie avec moins d\'ressources.'
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

      const diffs: FieldDiff[] = []

      if (enabledFields.has('title') && llm.title && llm.title.toLowerCase() !== (book.title || '').toLowerCase()) {
        diffs.push({ field: 'title', label: 'Titre', current: book.title || '', proposed: llm.title })
      }

      if (enabledFields.has('author')) {
        const currentAuthorNames = (book.authorIds || [])
          .map((id) => authorsMap.get(id))
          .filter(Boolean)
          .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
          .join(', ')
        const llmAuthorNames = llm.authors.map((a) => [a.firstName, a.lastName].filter(Boolean).join(' ')).join(', ')
        if (llmAuthorNames && llmAuthorNames.toLowerCase() !== currentAuthorNames.toLowerCase()) {
          diffs.push({ field: 'author', label: 'Auteur·ice', current: currentAuthorNames || '—', proposed: llmAuthorNames })
        }
      }

      const bookYear = book.year ?? null
      if (enabledFields.has('year') && llm.year && llm.year !== bookYear) {
        diffs.push({ field: 'year', label: 'Année', current: bookYear ? String(bookYear) : '—', proposed: String(llm.year) })
      }

      const llmType = llm.resourceType?.trim() || ''
      const bookType = book.resourceType?.trim() || ''
      if (enabledFields.has('resourceType') && llmType && llmType !== bookType) {
        diffs.push({
          field: 'resourceType',
          label: 'Type',
          current: bookType ? getResourceType(bookType).label : '—',
          proposed: getResourceType(llmType).label,
        })
      }

      const newAxes = enabledFields.has('axes') && llm.axes.length > 0 ? narrowAxes(llm.axes) : []
      const hasNewAxes = newAxes.length > 0 && (!book.axes || book.axes.length === 0 || newAxes.some((a) => !book.axes!.includes(a)))

      const existingAxes = book.axes || []
      const suggestedThemes = enabledFields.has('themes')
        ? (llm.suggestedThemes || []).filter((t) => !existingAxes.includes(`UNCATEGORIZED:${t}`))
        : []
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

  const toggleAll = () => {
    const allChecked = enrichments.every((e) => e.acceptedFields.size === getAllKeys(e).size)
    setEnrichments((prev) => prev.map((e) => ({ ...e, acceptedFields: allChecked ? new Set<string>() : getAllKeys(e) })))
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
        if (d.field === 'resourceType') updates.resourceType = e.llm.resourceType.trim()
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

    if (authorPromises.length > 0) await Promise.all(authorPromises)

    for (const { book, updates } of pendingUpdates) {
      onUpdateBook?.({ ...book, ...updates })
    }

    setPhase('done')
  }

  const resetState = () => {
    setPhase('idle')
    setEnrichments([])
    setError(null)
  }

  const checkedCount = enrichments.filter((e) => e.acceptedFields.size > 0).length
  const unchangedCount = books.length - enrichments.length
  const allChecked = enrichments.every((e) => e.acceptedFields.size === getAllKeys(e).size)

  return {
    phase,
    enrichments,
    progress,
    error,
    checkedCount,
    unchangedCount,
    allChecked,
    enabledFields,
    toggleEnabledField,
    startAnalysis,
    toggleItem,
    toggleField,
    toggleAll,
    applySelected,
    resetState,
  }
}

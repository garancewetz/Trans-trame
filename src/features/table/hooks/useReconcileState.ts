import { useMemo, useState } from 'react'
import type { Author, AuthorId, Book, CreateLinkInput, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import { normalizeEndpointId } from '@/features/graph/domain/graphDataModel'
import { useOrphanReconcileData } from './useOrphanReconcileData'
import {
  reconcileOrphansWithLLM,
  type ReconcileMatch,
  type ReconcileResult,
  type SourceMatch,
} from '../reconcileOrphans.llm'
import { useFakeProgress } from '@/common/hooks/useFakeProgress'

export type ReconcilePhase = 'idle' | 'loading' | 'review' | 'applying' | 'done'

/** Outcome of the synchronous apply loop. `attempted` counts mutations we
 *  actually dispatched; `skipped` are matches we filtered out before dispatch
 *  (stale IDs, duplicates already present, …). Surfaced to the user so the
 *  "why does the modal keep proposing the same thing" loop becomes legible. */
export type ApplyOutcome = {
  attempted: number
  skipped: number
  skippedReasons: string[]
}

function matchKey(m: ReconcileMatch): string {
  return `${m.authorId}:${m.bookId}`
}

function sourceKey(m: SourceMatch): string {
  return `${m.orphanBookId}:${m.sourceBookId}`
}

export function useReconcileState({
  orphanBooks,
  booksWithoutAuthors,
  orphanedAuthors,
  allBooks,
  links,
  authorsMap,
  onUpdateBook,
  onAddLink,
  onAddLinks,
}: {
  orphanBooks: Book[]
  booksWithoutAuthors: Book[]
  orphanedAuthors: Author[]
  allBooks: Book[]
  links: Link[]
  authorsMap: Map<AuthorId, Author>
  onUpdateBook?: (book: Book) => unknown
  onAddLink?: (link: CreateLinkInput) => unknown
  onAddLinks?: (links: CreateLinkInput[]) => unknown
}) {
  const [phase, setPhase] = useState<ReconcilePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReconcileResult | null>(null)
  const [acceptedAuthorMatches, setAcceptedAuthorMatches] = useState<Set<string>>(new Set())
  const [acceptedSourceMatches, setAcceptedSourceMatches] = useState<Set<string>>(new Set())
  const [hintsSaved, setHintsSaved] = useState(false)
  const [applyOutcome, setApplyOutcome] = useState<ApplyOutcome | null>(null)
  const { progress, reset: resetProgress, complete: completeProgress } = useFakeProgress({ active: phase === 'loading', rate: 0.06, interval: 600 })

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

  const bookById = new Map(allBooks.map((b) => [b.id, b]))

  const startAnalysis = async () => {
    setPhase('loading')
    resetProgress()
    setError(null)

    try {
      const res = await reconcileOrphansWithLLM(payload)
      completeProgress()
      setResult(res)

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

  const applySelected = () => {
    if (!result) return
    setPhase('applying')

    const skippedReasons: string[] = []
    let attempted = 0

    // Coalesce authorToBook matches by bookId BEFORE dispatching mutations.
    // Why: if Gemini proposes two authors for the same book and we fire two
    // separate onUpdateBook calls, each reads the stale pre-mutation
    // authorIds, and `setBookAuthors` does DELETE+INSERT — the second call
    // wipes the first author's association. The book ends up with only the
    // last-seen author, the lost one resurfaces as orphan next run, and the
    // user sees the modal re-propose the same match (the "circular loop"
    // report). Coalescing here keeps all authors for a book in one write.
    const authorsByBook = new Map<string, string[]>()
    for (const m of result.authorToBook) {
      if (!acceptedAuthorMatches.has(matchKey(m))) continue
      const book = bookById.get(m.bookId)
      if (!book) {
        skippedReasons.push(
          `Auteur·ice → Ressource : ressource introuvable (${m.bookId.slice(0, 8)}…)`,
        )
        continue
      }
      const currentIds = book.authorIds ?? []
      if (currentIds.includes(m.authorId)) {
        skippedReasons.push(
          `Auteur·ice → Ressource : déjà associé·e à « ${book.title || m.bookId} »`,
        )
        continue
      }
      const accumulated = authorsByBook.get(m.bookId) ?? [...currentIds]
      if (!accumulated.includes(m.authorId)) accumulated.push(m.authorId)
      authorsByBook.set(m.bookId, accumulated)
    }

    for (const [bookId, authorIds] of authorsByBook) {
      const book = bookById.get(bookId)
      if (!book) continue
      onUpdateBook?.({ ...book, authorIds })
      attempted++
    }

    // Build a quick (source|target) index of existing links so we can skip
    // source matches where the link already exists. `buildAndDedup` downstream
    // compares citation_text/page/edition too — but Gemini always proposes
    // empty citation metadata, so a link created at smart-import time (with a
    // real citation_text) is NOT seen as a duplicate there, and every apply
    // would silently create a new row with the same endpoints until the
    // orphan stops being flagged. Guarding here prevents the loop.
    const existingPairs = new Set<string>()
    for (const l of links) {
      const s = normalizeEndpointId(l.source)
      const t = normalizeEndpointId(l.target)
      if (s && t) existingPairs.add(`${s}|${t}`)
    }

    const linksToAdd: CreateLinkInput[] = []
    for (const m of result.bookToSource) {
      if (!acceptedSourceMatches.has(sourceKey(m))) continue
      if (existingPairs.has(`${m.sourceBookId}|${m.orphanBookId}`)) {
        const tgt = bookById.get(m.orphanBookId)
        skippedReasons.push(
          `Source → Orphelin : lien déjà présent vers « ${tgt?.title || m.orphanBookId} »`,
        )
        continue
      }
      linksToAdd.push({
        source: m.sourceBookId,
        target: m.orphanBookId,
      })
    }
    if (linksToAdd.length > 0) {
      attempted += linksToAdd.length
      if (onAddLinks) onAddLinks(linksToAdd)
      else linksToAdd.forEach((l) => onAddLink?.(l))
    }

    const outcome: ApplyOutcome = {
      attempted,
      skipped: skippedReasons.length,
      skippedReasons,
    }
    setApplyOutcome(outcome)
    devWarn('[reconcile] apply outcome', outcome)

    setPhase('done')
  }

  const saveHints = () => {
    if (!result) return
    for (const h of result.hints) {
      const book = bookById.get(h.bookId)
      if (book) {
        onUpdateBook?.({ ...book, todo: h.hint })
      }
    }
    setHintsSaved(true)
  }

  const resetState = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setAcceptedAuthorMatches(new Set())
    setAcceptedSourceMatches(new Set())
    setHintsSaved(false)
    setApplyOutcome(null)
  }

  const totalAccepted = acceptedAuthorMatches.size + acceptedSourceMatches.size

  return {
    phase,
    error,
    result,
    progress,
    reconcileBooks,
    orphanedAuthors,
    bookById,
    acceptedAuthorMatches,
    acceptedSourceMatches,
    hintsSaved,
    totalAccepted,
    applyOutcome,
    startAnalysis,
    toggleAuthorMatch,
    toggleSourceMatch,
    applySelected,
    saveHints,
    resetState,
  }
}

export { matchKey, sourceKey }

import { useMemo, useState } from 'react'
import type { Author, AuthorId, Book, Link } from '@/types/domain'
import { useOrphanReconcileData } from './useOrphanReconcileData'
import {
  reconcileOrphansWithLLM,
  type ReconcileMatch,
  type ReconcileResult,
  type SourceMatch,
} from '../reconcileOrphans.llm'
import { useFakeProgress } from '@/common/hooks/useFakeProgress'

export type ReconcilePhase = 'idle' | 'loading' | 'review' | 'applying' | 'done'

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
}: {
  orphanBooks: Book[]
  booksWithoutAuthors: Book[]
  orphanedAuthors: Author[]
  allBooks: Book[]
  links: Link[]
  authorsMap: Map<AuthorId, Author>
  onUpdateBook?: (book: Book) => unknown
  onAddLink?: (link: { source: string; target: string; citation_text: string; edition: string; page: string; context: string }) => unknown
}) {
  const [phase, setPhase] = useState<ReconcilePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReconcileResult | null>(null)
  const [acceptedAuthorMatches, setAcceptedAuthorMatches] = useState<Set<string>>(new Set())
  const [acceptedSourceMatches, setAcceptedSourceMatches] = useState<Set<string>>(new Set())
  const [hintsSaved, setHintsSaved] = useState(false)
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

    for (const m of result.authorToBook) {
      if (!acceptedAuthorMatches.has(matchKey(m))) continue
      const book = bookById.get(m.bookId)
      if (!book) continue
      const currentIds = book.authorIds || []
      if (currentIds.includes(m.authorId)) continue
      onUpdateBook?.({ ...book, authorIds: [...currentIds, m.authorId] })
    }

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
    startAnalysis,
    toggleAuthorMatch,
    toggleSourceMatch,
    applySelected,
    saveHints,
    resetState,
  }
}

export { matchKey, sourceKey }

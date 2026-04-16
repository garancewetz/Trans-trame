import { supabase } from '@/core/supabase'
import { devWarn } from '@/common/utils/logger'

// ─── Types (shared with edge function) ──────────────────────────────────────

export interface OrphanedBookInput {
  id: string
  title: string
  currentAuthors: string
  missingAuthor: boolean
  hasLinks: boolean
  year?: number | null
  batchKey: string
  /** Book whose bibliography this orphan was imported for (explicit origin). */
  importedFor: {
    id: string
    title: string
    authors: string
    year?: number | null
  } | null
  batchSiblings: {
    title: string
    authors: string
    linkedTo: { id: string; title: string; authors: string }[]
  }[]
}

export interface OrphanedAuthorInput {
  id: string
  firstName: string
  lastName: string
  batchKey: string
}

export interface ReconcilePayload {
  orphanedBooks: OrphanedBookInput[]
  orphanedAuthors: OrphanedAuthorInput[]
}

export interface ReconcileMatch {
  authorId: string
  bookId: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface SourceMatch {
  orphanBookId: string
  sourceBookId: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface Hint {
  bookId: string
  hint: string
}

export interface ReconcileResult {
  authorToBook: ReconcileMatch[]
  bookToSource: SourceMatch[]
  hints: Hint[]
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low'])

function validateResult(raw: unknown, payload: ReconcilePayload): ReconcileResult {
  if (!raw || typeof raw !== 'object') {
    return { authorToBook: [], bookToSource: [], hints: [] }
  }

  const obj = raw as Record<string, unknown>

  const validBookIds = new Set(payload.orphanedBooks.map((b) => b.id))
  const validAuthorIds = new Set(payload.orphanedAuthors.map((a) => a.id))
  const validSourceIds = new Set<string>()
  for (const b of payload.orphanedBooks) {
    for (const s of b.batchSiblings) {
      for (const lt of s.linkedTo) validSourceIds.add(lt.id)
    }
  }

  const authorToBook: ReconcileMatch[] = []
  if (Array.isArray(obj.authorToBook)) {
    for (const item of obj.authorToBook) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      if (
        typeof m.authorId === 'string' &&
        typeof m.bookId === 'string' &&
        typeof m.confidence === 'string' &&
        VALID_CONFIDENCE.has(m.confidence) &&
        validAuthorIds.has(m.authorId) &&
        validBookIds.has(m.bookId)
      ) {
        authorToBook.push({
          authorId: m.authorId,
          bookId: m.bookId,
          confidence: m.confidence as 'high' | 'medium' | 'low',
          reason: String(m.reason ?? ''),
        })
      }
    }
  }

  const bookToSource: SourceMatch[] = []
  if (Array.isArray(obj.bookToSource)) {
    for (const item of obj.bookToSource) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      if (
        typeof m.orphanBookId === 'string' &&
        typeof m.sourceBookId === 'string' &&
        typeof m.confidence === 'string' &&
        VALID_CONFIDENCE.has(m.confidence) &&
        validBookIds.has(m.orphanBookId) &&
        validSourceIds.has(m.sourceBookId)
      ) {
        bookToSource.push({
          orphanBookId: m.orphanBookId,
          sourceBookId: m.sourceBookId,
          confidence: m.confidence as 'high' | 'medium' | 'low',
          reason: String(m.reason ?? ''),
        })
      }
    }
  }

  const hints: Hint[] = []
  if (Array.isArray(obj.hints)) {
    for (const item of obj.hints) {
      if (!item || typeof item !== 'object') continue
      const h = item as Record<string, unknown>
      if (typeof h.bookId === 'string' && typeof h.hint === 'string' && h.hint.trim()) {
        hints.push({ bookId: h.bookId, hint: h.hint.trim() })
      }
    }
  }

  return { authorToBook, bookToSource, hints }
}

// ─── API call ───────────────────────────────────────────────────────────────

export async function reconcileOrphansWithLLM(
  payload: ReconcilePayload,
): Promise<ReconcileResult> {
  const { data, error } = await supabase.functions.invoke('reconcile-orphans', {
    body: payload,
  })

  if (error) {
    devWarn('[reconcile-orphans] Edge function error', error.message)
    throw new Error(error.message ?? 'Erreur lors de la réconciliation')
  }

  return validateResult(data, payload)
}

import { useMemo } from 'react'
import type { Author, AuthorId, Book, Link } from '@/types/domain'
import { maybeNodeId } from '../maybeNodeId'
import type { ReconcilePayload } from '../reconcileOrphans.llm'

/** Truncate ISO timestamp to the minute for batch grouping. */
function minuteKey(iso: string): string {
  return iso.slice(0, 16)
}

function authorDisplay(book: Book, authorsMap: Map<AuthorId, Author>): string {
  return (book.authorIds || [])
    .map((id) => authorsMap.get(id))
    .filter(Boolean)
    .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
    .join(', ')
}

/**
 * Assembles the payload for the reconcile-orphans edge function.
 *
 * For each orphan book, finds:
 * 1. Its batch siblings (books created at the same minute)
 * 2. Which of those siblings are connected (have links)
 * 3. What those connected siblings link to (the "source" bibliographies)
 *
 * For each orphan author, notes its batch key for temporal matching.
 */
export function useOrphanReconcileData(
  orphanBooks: Book[],
  orphanedAuthors: Author[],
  allBooks: Book[],
  links: Link[],
  authorsMap: Map<AuthorId, Author>,
): ReconcilePayload {
  return useMemo(() => {
    // Build link index: bookId → set of connected bookIds
    const linkedBookIds = new Set<string>()
    const linksByBook = new Map<string, Set<string>>()

    for (const l of links) {
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (!s || !t) continue
      linkedBookIds.add(s)
      linkedBookIds.add(t)

      if (!linksByBook.has(s)) linksByBook.set(s, new Set())
      linksByBook.get(s)!.add(t)
      if (!linksByBook.has(t)) linksByBook.set(t, new Set())
      linksByBook.get(t)!.add(s)
    }

    // Build batch index: minuteKey → books
    const booksByBatch = new Map<string, Book[]>()
    for (const b of allBooks) {
      const rawTs = b.created_at
      const ts = typeof rawTs === 'string' ? rawTs : undefined
      if (!ts) continue
      const key = minuteKey(ts)
      if (!booksByBatch.has(key)) booksByBatch.set(key, [])
      booksByBatch.get(key)!.push(b)
    }

    // Book ID lookup
    const bookById = new Map(allBooks.map((b) => [b.id, b]))

    // Assemble orphaned books with batch context
    const orphanedBooksPayload = orphanBooks.map((ob) => {
      const rawObTs = ob.created_at
      const obTs = typeof rawObTs === 'string' ? rawObTs : undefined
      const batchKey = obTs ? minuteKey(obTs) : ''
      const batchBooks = batchKey ? (booksByBatch.get(batchKey) || []) : []

      // Connected siblings = books in same batch that have links (excluding self
      // and other books being reconciled that also lack links)
      const connectedSiblings = batchBooks.filter(
        (b) => b.id !== ob.id && linkedBookIds.has(b.id),
      )

      // For each connected sibling, find what it links to
      const batchSiblings = connectedSiblings.slice(0, 10).map((sib) => {
        const sibLinks = linksByBook.get(sib.id) || new Set<string>()
        const linkedTo = [...sibLinks]
          .map((id) => bookById.get(id))
          .filter(Boolean)
          .slice(0, 5)
          .map((target) => ({
            id: target!.id,
            title: target!.title || '',
            authors: authorDisplay(target!, authorsMap),
          }))

        return {
          title: sib.title || '',
          authors: authorDisplay(sib, authorsMap),
          linkedTo,
        }
      })

      const hasAuthors = (ob.authorIds || []).length > 0

      // Explicit bibliography origin — set at smart import time. Much stronger
      // signal than batchSiblings (which is inferred from timestamp proximity).
      const importSource = ob.importSourceId ? bookById.get(ob.importSourceId) : undefined
      const importedFor = importSource
        ? {
            id: importSource.id,
            title: importSource.title || '',
            authors: authorDisplay(importSource, authorsMap),
            year: importSource.year ?? null,
          }
        : null

      return {
        id: ob.id,
        title: ob.title || '',
        currentAuthors: hasAuthors ? authorDisplay(ob, authorsMap) : '',
        missingAuthor: !hasAuthors,
        hasLinks: linkedBookIds.has(ob.id),
        year: ob.year ?? null,
        batchKey,
        importedFor,
        batchSiblings,
      }
    })

    // Assemble orphaned authors
    const orphanedAuthorsPayload = orphanedAuthors.map((a) => {
      const rawATs = a.created_at
      const aTs = typeof rawATs === 'string' ? rawATs : undefined
      return {
        id: a.id,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        batchKey: aTs ? minuteKey(aTs) : '',
      }
    })

    return {
      orphanedBooks: orphanedBooksPayload,
      orphanedAuthors: orphanedAuthorsPayload,
    }
  }, [orphanBooks, orphanedAuthors, allBooks, links, authorsMap])
}

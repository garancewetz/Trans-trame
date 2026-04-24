import { useMemo, useState } from 'react'
import type { Book } from '@/types/domain'
import type { Author } from '@/types/domain'
import type { ParsedBook } from '../parseSmartInput.types'
import {
  detectAuthorInitialMatches,
  detectIntraBatchDuplicates,
  normStr,
  type AuthorMergeSuggestion,
  type IntraBatchMergeSuggestion,
} from '../smartImportModal.utils'

export function useSmartImportMerge(
  existingNodes: Book[],
  existingAuthors: Author[],
  parsed: ParsedBook[],
  setParsed: React.Dispatch<React.SetStateAction<ParsedBook[]>>,
  setChecked: React.Dispatch<React.SetStateAction<Set<string>>>,
  masterNode: Book | null,
  onUpdateBook?: (book: Book) => void,
) {
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())
  const [preMergeBooks, setPreMergeBooks] = useState<Map<string, Book>>(new Map())
  const [dismissedAuthorMerges, setDismissedAuthorMerges] = useState<Set<string>>(new Set())
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set())
  // secondaryItemId → primaryItemId. Secondaries skip book/author creation and
  // only emit a link (their page/citation) pointing to the primary's book.
  const [intraBatchMerges, setIntraBatchMerges] = useState<Map<string, string>>(new Map())
  const [dismissedIntraBatchMerges, setDismissedIntraBatchMerges] = useState<Set<string>>(new Set())

  const effectiveParsed = useMemo(
    () => parsed.map((item) =>
      dismissedDuplicates.has(item.id)
        ? { ...item, isDuplicate: false, isFuzzyDuplicate: false, existingNode: null }
        : item
    ),
    [parsed, dismissedDuplicates]
  )

  const authorMergeSuggestions = useMemo(
    () => detectAuthorInitialMatches(parsed, existingAuthors || [])
      .filter((s) => !dismissedAuthorMerges.has(s.id)),
    [parsed, existingAuthors, dismissedAuthorMerges]
  )

  // Only propose intra-batch merges among items that aren't already flagged as
  // DB duplicates — the DB-merge path handles those cases separately.
  const intraBatchSuggestions = useMemo(() => {
    const dbDupIds = new Set(
      parsed.filter((r) => r.isDuplicate || r.isFuzzyDuplicate).map((r) => r.id)
    )
    return detectIntraBatchDuplicates(parsed.filter((r) => !dbDupIds.has(r.id)))
      .filter((s) => !dismissedIntraBatchMerges.has(s.id))
      .filter((s) => !s.itemIds.slice(1).every((id) => intraBatchMerges.has(id)))
  }, [parsed, dismissedIntraBatchMerges, intraBatchMerges])

  const handleMerge = (item: ParsedBook) => {
    if (!item.existingNode || !onUpdateBook) return
    const existing = item.existingNode
    if (!existing.id) return
    const baseBook = existingNodes.find((n) => n.id === existing.id)
    if (!baseBook) return

    setPreMergeBooks((prev) => new Map([...prev, [item.id, { ...baseBook }]]))

    const merged: Book = { ...baseBook }
    if (!existing.firstName && item.firstName) merged.firstName = item.firstName
    if (!existing.lastName && item.lastName) merged.lastName = item.lastName
    const existingYear = existing.year
    if (
      (existingYear === undefined || existingYear === null || existingYear === new Date().getFullYear()) &&
      item.year &&
      !item.yearMissing
    ) {
      merged.year = item.year
    }
    onUpdateBook(merged)
    setMergedIds((prev) => new Set([...prev, item.id]))

    if (masterNode) {
      setChecked((prev) => new Set([...prev, item.id]))
    }
  }

  const handleUnmerge = (item: ParsedBook) => {
    const original = preMergeBooks.get(item.id)
    if (original && onUpdateBook) {
      onUpdateBook(original)
    }
    setMergedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next })
    setPreMergeBooks((prev) => { const next = new Map(prev); next.delete(item.id); return next })
    setChecked((prev) => { const next = new Set(prev); next.delete(item.id); return next })
  }

  const handleAuthorMerge = (suggestion: AuthorMergeSuggestion) => {
    const { initialAuthor, fullAuthor, affectedItemIds } = suggestion
    setParsed((prev) =>
      prev.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item
        const authors = item.authors?.length > 0
          ? item.authors
          : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
        const updatedAuthors = authors.map((a) => {
          if (normStr(a.firstName) === normStr(initialAuthor.firstName) && normStr(a.lastName) === normStr(initialAuthor.lastName)) {
            return { firstName: fullAuthor.firstName, lastName: fullAuthor.lastName }
          }
          return a
        })
        const first = updatedAuthors[0] || {}
        return { ...item, authors: updatedAuthors, firstName: first.firstName || '', lastName: first.lastName || '' }
      })
    )
    setDismissedAuthorMerges((prev) => new Set([...prev, suggestion.id]))
  }

  const dismissAuthorMerge = (suggestionId: string) => {
    setDismissedAuthorMerges((prev) => new Set([...prev, suggestionId]))
  }

  const dismissDuplicate = (itemId: string) => {
    setDismissedDuplicates((prev) => new Set([...prev, itemId]))
    setChecked((prev) => new Set([...prev, itemId]))
  }

  const handleIntraBatchMerge = (suggestion: IntraBatchMergeSuggestion) => {
    const [primaryId, ...secondaryIds] = suggestion.itemIds
    if (!primaryId || secondaryIds.length === 0) return
    setIntraBatchMerges((prev) => {
      const next = new Map(prev)
      for (const sid of secondaryIds) next.set(sid, primaryId)
      return next
    })
    // Keep primary + secondaries checked: each secondary still emits a link.
    setChecked((prev) => {
      const next = new Set(prev)
      next.add(primaryId)
      for (const sid of secondaryIds) next.add(sid)
      return next
    })
  }

  const handleIntraBatchUnmerge = (primaryId: string) => {
    setIntraBatchMerges((prev) => {
      const next = new Map(prev)
      for (const [secondary, primary] of prev) {
        if (primary === primaryId) next.delete(secondary)
      }
      return next
    })
  }

  const dismissIntraBatchMerge = (suggestionId: string) => {
    setDismissedIntraBatchMerges((prev) => new Set([...prev, suggestionId]))
  }

  const visibleParsed = useMemo(
    () => effectiveParsed.filter((item) => !intraBatchMerges.has(item.id)),
    [effectiveParsed, intraBatchMerges]
  )

  // How many secondaries point to each primary — for the "N citations" badge.
  const intraBatchCountByPrimary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const primary of intraBatchMerges.values()) {
      counts.set(primary, (counts.get(primary) ?? 0) + 1)
    }
    return counts
  }, [intraBatchMerges])

  const resetMerge = () => {
    setMergedIds(new Set())
    setPreMergeBooks(new Map())
    setDismissedAuthorMerges(new Set())
    setDismissedDuplicates(new Set())
    setIntraBatchMerges(new Map())
    setDismissedIntraBatchMerges(new Set())
  }

  return {
    mergedIds,
    effectiveParsed: visibleParsed,
    authorMergeSuggestions,
    intraBatchSuggestions,
    intraBatchMerges,
    intraBatchCountByPrimary,
    handleMerge,
    handleUnmerge,
    handleAuthorMerge,
    dismissAuthorMerge,
    dismissDuplicate,
    handleIntraBatchMerge,
    handleIntraBatchUnmerge,
    dismissIntraBatchMerge,
    resetMerge,
  }
}

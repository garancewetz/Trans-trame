import { useMemo, useState } from 'react'
import type { Book } from '@/types/domain'
import type { Author } from '@/types/domain'
import type { ParsedBook } from '../parseSmartInput.types'
import { detectAuthorInitialMatches, normStr, type AuthorMergeSuggestion } from '../smartImportModal.utils'

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

  const resetMerge = () => {
    setMergedIds(new Set())
    setPreMergeBooks(new Map())
    setDismissedAuthorMerges(new Set())
    setDismissedDuplicates(new Set())
  }

  return {
    mergedIds,
    effectiveParsed,
    authorMergeSuggestions,
    handleMerge,
    handleUnmerge,
    handleAuthorMerge,
    dismissAuthorMerge,
    dismissDuplicate,
    resetMerge,
  }
}

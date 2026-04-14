import { useState } from 'react'
import type { AuthorId, Book, BookId } from '@/types/domain'

type ActionDeps = {
  nodes: Book[]
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  orphans: Book[]
  duplicateGroups: { books: Book[] }[]
  authorDuplicateGroups: { id: AuthorId }[][]
}

export function useTableViewActions({
  nodes, onUpdateBook, onDeleteBook,
  onMergeBooks, onDeleteAuthor,
  orphans, duplicateGroups, authorDuplicateGroups,
}: ActionDeps) {
  const [orphanModal, setOrphanModal] = useState(false)
  const [orphanConfirm, setOrphanConfirm] = useState(false)
  const [dedupeModal, setDedupeModal] = useState(false)
  const [dedupeConfirm, setDedupeConfirm] = useState(false)
  const [authorDedupeModal, setAuthorDedupeModal] = useState(false)
  const [authorDedupeConfirm, setAuthorDedupeConfirm] = useState(false)
  const [authorReconcileModal, setAuthorReconcileModal] = useState(false)
  const [aiOrphanReconcileModal, setAiOrphanReconcileModal] = useState(false)

  const [smartImportModal, setSmartImportModal] = useState(false)
  const [smartImportPrefilledBook, setSmartImportPrefilledBook] = useState<Book | null>(null)

  const openSmartImportForBook = (node: Book) => {
    setSmartImportPrefilledBook(node)
    setSmartImportModal(true)
  }

  const closeSmartImport = () => {
    setSmartImportModal(false)
    setSmartImportPrefilledBook(null)
  }

  const linkAuthorToBook = (authorId: AuthorId, book: Book) => {
    const currentIds = book.authorIds || []
    if (currentIds.includes(authorId)) return
    onUpdateBook?.({ ...book, authorIds: [...currentIds, authorId] })
  }

  const mergeAuthors = (fromAuthorId: AuthorId, keepAuthorId: AuthorId) => {
    if (!fromAuthorId || !keepAuthorId || fromAuthorId === keepAuthorId) return
    ;(nodes || []).forEach((b) => {
      const ids = b.authorIds || []
      if (!ids.includes(fromAuthorId)) return
      const next = Array.from(new Set(ids.map((id) => (id === fromAuthorId ? keepAuthorId : id))))
      onUpdateBook?.({ ...b, authorIds: next })
    })
    onDeleteAuthor?.(fromAuthorId)
  }

  const handleCleanOrphans = () => {
    if (!orphanConfirm) { setOrphanConfirm(true); return }
    orphans.forEach((n) => onDeleteBook?.(n.id))
    setOrphanModal(false)
    setOrphanConfirm(false)
  }

  const handleCleanDupes = () => {
    if (!dedupeConfirm) { setDedupeConfirm(true); return }
    const richness = (n: Book) => [n.firstName, n.lastName, n.year, n.description].filter(Boolean).length
    duplicateGroups.forEach((group) => {
      const sorted = [...group.books].sort((a, b) => richness(b) - richness(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => onMergeBooks?.(from.id, keep.id))
    })
    setDedupeModal(false)
    setDedupeConfirm(false)
  }

  const handleMergeAuthorDupes = (
    choices: Map<number, AuthorId>,
    excluded: Map<number, Set<AuthorId>>,
  ) => {
    if (!authorDedupeConfirm) { setAuthorDedupeConfirm(true); return }
    authorDuplicateGroups.forEach((group, i) => {
      const keepId = choices.get(i) || group[0]?.id
      if (!keepId) return
      const excludedSet = excluded.get(i)
      group.forEach((a) => {
        if (a.id === keepId) return
        if (excludedSet && excludedSet.has(a.id)) return
        mergeAuthors(a.id, keepId)
      })
    })
    setAuthorDedupeModal(false)
    setAuthorDedupeConfirm(false)
  }

  return {
    orphanModal, setOrphanModal,
    orphanConfirm, setOrphanConfirm,
    dedupeModal, setDedupeModal,
    dedupeConfirm, setDedupeConfirm,
    authorDedupeModal, setAuthorDedupeModal,
    authorDedupeConfirm, setAuthorDedupeConfirm,
    authorReconcileModal, setAuthorReconcileModal,
    aiOrphanReconcileModal, setAiOrphanReconcileModal,
    smartImportModal, setSmartImportModal,
    smartImportPrefilledBook,
    openSmartImportForBook,
    closeSmartImport,
    linkAuthorToBook,
    mergeAuthors,
    handleCleanOrphans,
    handleCleanDupes,
    handleMergeAuthorDupes,
  }
}

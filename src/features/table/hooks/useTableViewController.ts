import { useEffect, useMemo, useRef, useState } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import type { TableViewProps } from '../tableViewTypes'
import { useTableViewDuplicateDerived } from './useTableViewDuplicateDerived'
import { useTableViewLinkDerived } from './useTableViewLinkDerived'
import { useTableViewVisibility } from './useTableViewVisibility'

export function useTableViewController({
  nodes,
  links,
  authors,
  onAddLink,
  onUpdateBook,
  onDeleteBook,
  onUpdateLink,
  onMergeBooks,
  onDeleteAuthor,
  initialTab = 'books',
  initialLinkSourceId = null,
  initialFocusBookId = null,
}: TableViewProps) {
  const visible = useTableViewVisibility()

  const [tab, setTab] = useState<TableViewProps['initialTab']>(initialTab)
  const [focusAuthorId, setFocusAuthorId] = useState<AuthorId | null>(null)
  const [booksPrefill, setBooksPrefill] = useState<null | { nonce: string; authorId: AuthorId }>(null)

  /** Évite de réappliquer un auteur prérempli à chaque retour sur l'onglet Ouvrages. */
  useEffect(() => {
    if (tab !== 'books') setBooksPrefill(null)
  }, [tab])

  const [search, setSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkSourceNode, setLinkSourceNode] = useState<Book | null>(
    () => (initialLinkSourceId ? nodes.find((n) => n.id === initialLinkSourceId) ?? null : null),
  )

  const didPrefillLinkSearchFromInitialSource = useRef(false)

  /** Même logique que depuis l'onglet Ouvrages : titre dans la recherche liens (barre du haut). */
  useEffect(() => {
    if (didPrefillLinkSearchFromInitialSource.current) return
    if (!initialLinkSourceId) return
    const n = nodes.find((b) => b.id === initialLinkSourceId)
    const title = (n?.title || '').trim()
    if (!title) return
    setLinkSearch(title)
    didPrefillLinkSearchFromInitialSource.current = true
  }, [initialLinkSourceId, nodes])

  const focusAuthorInAuthorsTab = (authorId: AuthorId) => {
    if (!authorId) return
    setAuthorSearch('')
    setFocusAuthorId(authorId)
    setTab('authors')
  }

  const [linkDirection, setLinkDirection] = useState<'source' | 'cited'>('source')
  const [checklistSearch, setChecklistSearch] = useState('')
  const [linkCheckedIds, setLinkCheckedIds] = useState<Set<BookId>>(new Set())
  const [editingLink, setEditingLink] = useState<null | { id: string; field: string }>(null)
  const [editingLinkValue, setEditingLinkValue] = useState('')
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)

  const [orphanModal, setOrphanModal] = useState(false)
  const [orphanConfirm, setOrphanConfirm] = useState(false)

  const [dedupeModal, setDedupeModal] = useState(false)
  const [dedupeConfirm, setDedupeConfirm] = useState(false)

  const [authorDedupeModal, setAuthorDedupeModal] = useState(false)
  const [authorDedupeConfirm, setAuthorDedupeConfirm] = useState(false)

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

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const {
    existingTargetIds,
    checklistNodes,
    newLinksCount,
    groupedLinks,
  } = useTableViewLinkDerived({
    nodes,
    links,
    authorsMap,
    linkSourceNode,
    linkDirection,
    checklistSearch,
    linkSearch,
    linkCheckedIds,
  })

  const { orphans, duplicateGroups, authorDuplicateGroups } = useTableViewDuplicateDerived(
    nodes,
    links,
    authors,
    authorsMap,
  )

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

  const openLinksForBook = (node: Book) => {
    if (!node) return
    setTab('links')
    setLinkSourceNode(node)
    setLinkCheckedIds(new Set<BookId>())
    setChecklistSearch('')
    setLinkSearch((node.title || '').trim())
  }

  const toggleChecklist = (id: BookId) => {
    if (existingTargetIds.has(id)) return
    setLinkCheckedIds((prev) => toggleSetItem(prev, id))
  }

  const handleTisser = () => {
    if (!linkSourceNode || newLinksCount === 0) return
    linkCheckedIds.forEach((id) => {
      if (existingTargetIds.has(id) || id === linkSourceNode.id) return
      const src = linkDirection === 'source' ? linkSourceNode.id : id
      const tgt = linkDirection === 'source' ? id : linkSourceNode.id
      onAddLink?.({
        source: src,
        target: tgt,
        citation_text: '',
        edition: '',
        page: '',
        context: '',
      })
    })
    setLinkCheckedIds(new Set<BookId>())
  }

  const commitLinkEdit = () => {
    if (!editingLink) return
    const linkId = editingLink.id
    if (editingLink.field !== '_expand') {
      onUpdateLink?.(linkId, { [editingLink.field]: editingLinkValue.trim() })
    }
    setEditingLink({ id: linkId, field: '_expand' })
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
      const sorted = [...group].sort((a, b) => richness(b) - richness(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => onMergeBooks?.(from.id, keep.id))
    })
    setDedupeModal(false)
    setDedupeConfirm(false)
  }

  const handleMergeAuthorDupes = () => {
    if (!authorDedupeConfirm) { setAuthorDedupeConfirm(true); return }
    const score = (a: Author) => {
      const filled = [a.firstName, a.lastName].filter(Boolean).length
      let booksCount = 0
      ;(nodes || []).forEach((b) => {
        if ((b.authorIds || []).includes(a.id)) booksCount += 1
      })
      return filled * 10 + booksCount
    }
    authorDuplicateGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => score(b) - score(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => mergeAuthors(from.id, keep.id))
    })
    setAuthorDedupeModal(false)
    setAuthorDedupeConfirm(false)
  }

  return {
    visible,
    tab,
    setTab,
    focusAuthorId,
    booksPrefill,
    setBooksPrefill,
    search,
    setSearch,
    authorSearch,
    setAuthorSearch,
    linkSearch,
    setLinkSearch,
    linkSourceNode,
    setLinkSourceNode,
    linkDirection,
    setLinkDirection,
    focusAuthorInAuthorsTab,
    checklistSearch,
    setChecklistSearch,
    linkCheckedIds,
    setLinkCheckedIds,
    editingLink,
    setEditingLink,
    editingLinkValue,
    setEditingLinkValue,
    deletingLinkId,
    setDeletingLinkId,
    orphanModal,
    setOrphanModal,
    orphanConfirm,
    setOrphanConfirm,
    dedupeModal,
    setDedupeModal,
    dedupeConfirm,
    setDedupeConfirm,
    authorDedupeModal,
    setAuthorDedupeModal,
    authorDedupeConfirm,
    setAuthorDedupeConfirm,
    smartImportModal,
    setSmartImportModal,
    smartImportPrefilledBook,
    openSmartImportForBook,
    closeSmartImport,
    authorsMap,
    orphans,
    duplicateGroups,
    authorDuplicateGroups,
    existingTargetIds,
    checklistNodes,
    newLinksCount,
    groupedLinks,
    mergeAuthors,
    openLinksForBook,
    toggleChecklist,
    handleTisser,
    commitLinkEdit,
    handleCleanOrphans,
    handleCleanDupes,
    handleMergeAuthorDupes,
    initialFocusBookId,
  }
}

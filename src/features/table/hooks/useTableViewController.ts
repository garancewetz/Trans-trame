import { useMemo, useState } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import type { AuthorId, Book, BookId } from '@/types/domain'
import type { TableViewProps } from '../tableViewTypes'
import { useTableViewDuplicateDerived } from './useTableViewDuplicateDerived'
import { useTableViewLinkDerived } from './useTableViewLinkDerived'
import { useTableViewVisibility } from './useTableViewVisibility'
import { useTableViewActions } from './useTableViewActions'

export function useTableViewController({
  nodes,
  links,
  authors,
  onAddLink,
  onAddLinks,
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

  /** Avoid reapplying a prefilled author each time we return to the Books tab. */
  const [prevTab, setPrevTab] = useState(tab)
  if (tab !== prevTab) {
    setPrevTab(tab)
    if (tab !== 'books') setBooksPrefill(null)
  }

  const [search, setSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkSourceNode, setLinkSourceNode] = useState<Book | null>(
    () => (initialLinkSourceId ? nodes.find((n) => n.id === initialLinkSourceId) ?? null : null),
  )

  const [hasPrefilledLinkSearch, setHasPrefilledLinkSearch] = useState(false)
  if (!hasPrefilledLinkSearch && initialLinkSourceId) {
    const n = nodes.find((b) => b.id === initialLinkSourceId)
    const title = (n?.title || '').trim()
    if (title) {
      setHasPrefilledLinkSearch(true)
      setLinkSearch(title)
    }
  }

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

  const derived = useTableViewDuplicateDerived(nodes, links, authors, authorsMap)

  const actions = useTableViewActions({
    nodes,
    onUpdateBook,
    onDeleteBook,
    onMergeBooks,
    onDeleteAuthor,
    orphans: derived.orphans,
    duplicateGroups: derived.duplicateGroups,
    authorDuplicateGroups: derived.authorDuplicateGroups,
  })

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
    // Batch insert (chunked + awaited in useLinkMutations). Firing N parallel
    // single-row mutations lost rows on large selections — see useLinkMutations.
    const linksToAdd: Array<{ source: BookId; target: BookId; citation_text: string; edition: string; page: string; context: string }> = []
    linkCheckedIds.forEach((id) => {
      if (existingTargetIds.has(id) || id === linkSourceNode.id) return
      const src = linkDirection === 'source' ? linkSourceNode.id : id
      const tgt = linkDirection === 'source' ? id : linkSourceNode.id
      linksToAdd.push({
        source: src,
        target: tgt,
        citation_text: '',
        edition: '',
        page: '',
        context: '',
      })
    })
    if (linksToAdd.length === 0) return
    if (onAddLinks) onAddLinks(linksToAdd)
    else linksToAdd.forEach((l) => onAddLink?.(l))
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

    ...actions,

    authorsMap,
    orphans: derived.orphans,
    duplicateGroups: derived.duplicateGroups,
    authorDuplicateGroups: derived.authorDuplicateGroups,
    orphanedAuthors: derived.orphanedAuthors,
    booksWithoutAuthors: derived.booksWithoutAuthors,
    todoCount: derived.todoCount,
    existingTargetIds,
    checklistNodes,
    newLinksCount,
    groupedLinks,
    openLinksForBook,
    toggleChecklist,
    handleTisser,
    commitLinkEdit,
    initialFocusBookId,
  }
}

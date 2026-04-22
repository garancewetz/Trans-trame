import { useMemo, useState } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import type { AuthorId, Book, BookId } from '@/types/domain'
import type { TableTabId } from '@/core/TableUiContext'
import type { TableViewProps } from '../tableViewTypes'
import { useTableViewDuplicateDerived } from './useTableViewDuplicateDerived'
import { useTableViewLinkDerived } from './useTableViewLinkDerived'
import { useTableViewActions } from './useTableViewActions'

type ControllerParams = TableViewProps & {
  tab: TableTabId
  setTab: (t: TableTabId) => void
}

export function useTableViewController({
  nodes,
  links,
  authors,
  authorNotDuplicatePairs,
  onAddLink,
  onAddLinks,
  onUpdateBook,
  onDeleteBook,
  onUpdateLink,
  onAddCitation,
  onUpdateCitation,
  onMergeBooks,
  onDeleteAuthor,
  onMarkAuthorsNotDuplicate,
  tab,
  setTab,
  initialLinkSourceId = null,
  initialFocusBookId = null,
}: ControllerParams) {
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

  const derived = useTableViewDuplicateDerived(nodes, links, authors, authorsMap, authorNotDuplicatePairs)

  const handleMarkGroupNotDuplicate = (groupIndex: number) => {
    const group = derived.authorDuplicateGroups[groupIndex]
    if (!group || group.length < 2 || !onMarkAuthorsNotDuplicate) return
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        onMarkAuthorsNotDuplicate(group[i].id, group[j].id)
      }
    }
  }

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
    const linksToAdd: Array<{ source: BookId; target: BookId }> = []
    linkCheckedIds.forEach((id) => {
      if (existingTargetIds.has(id) || id === linkSourceNode.id) return
      const src = linkDirection === 'source' ? linkSourceNode.id : id
      const tgt = linkDirection === 'source' ? id : linkSourceNode.id
      linksToAdd.push({ source: src, target: tgt })
    })
    if (linksToAdd.length === 0) return
    if (onAddLinks) onAddLinks(linksToAdd)
    else linksToAdd.forEach((l) => onAddLink?.(l))
    setLinkCheckedIds(new Set<BookId>())
  }

  // Citation fields (citation_text / edition / page / context) live in the
  // `link_citations` subtable, not on `links`. Edits route through the
  // citation mutations: upsert citations[0] on first edit, update it on
  // subsequent edits. Non-citation link-level edits (future use) fall back
  // to onUpdateLink.
  const CITATION_FIELDS = new Set(['citation_text', 'edition', 'page', 'context'])
  const commitLinkEdit = () => {
    if (!editingLink) return
    const linkId = editingLink.id
    const field = editingLink.field
    const value = editingLinkValue.trim()
    if (field !== '_expand') {
      if (CITATION_FIELDS.has(field)) {
        const link = links.find((l) => l.id === linkId)
        const primary = link?.citations?.[0]
        if (primary) {
          onUpdateCitation?.(primary.id, { [field]: value })
        } else if (value) {
          onAddCitation?.(linkId, { [field]: value })
        }
      } else {
        onUpdateLink?.(linkId, { [field]: value })
      }
    }
    setEditingLink({ id: linkId, field: '_expand' })
  }

  return {
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
    handleMarkGroupNotDuplicate,
    initialFocusBookId,
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import { useColumnSort } from './useColumnSort'
import { useBooksTabTableDerived } from '../components/tabs/useBooksTabTableDerived'
import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'

type Args = {
  nodes: Book[]
  links: Link[]
  search: string
  authors: Author[]
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  initialAuthorIds?: AuthorId[]
  autoFocusTitle?: boolean
  focusBookId?: BookId | null
}

export function useBooksTabState({
  nodes,
  links,
  search,
  authors,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onMergeBooks,
  onLastEdited,
  initialAuthorIds = [],
  autoFocusTitle = false,
  focusBookId = null,
}: Args) {
  const [editingAuthorsNodeId, setEditingAuthorsNodeId] = useState<BookId | null>(null)
  const { sortCol, sortDir, handleSort: handleNodeSort } = useColumnSort()
  const [selectedIds, setSelectedIds] = useState<Set<BookId>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [editingCell, setEditingCell] = useState<null | { nodeId: BookId; field: 'title' | 'year' }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<BookId | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const [sameWorkModal, setSameWorkModal] = useState(false)
  const [sameWorkTitle, setSameWorkTitle] = useState<string | null>(null)
  const [sameWorkConfirm, setSameWorkConfirm] = useState(false)
  const [sameWorkBooks, setSameWorkBooks] = useState<Book[]>([])
  const [axisFilter, setAxisFilter] = useState<Axis | null>(null)
  const [todoOnly, setTodoOnly] = useState(false)
  const [inputTitle, setInputTitle] = useState('')
  const [inputAuthorIds, setInputAuthorIds] = useState<AuthorId[]>(initialAuthorIds)
  const [inputYear, setInputYear] = useState('')
  const [inputAxes, setInputAxes] = useState<Axis[]>([])
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [justAddedBookId, setJustAddedBookId] = useState<BookId | null>(null)
  const [aiEnrichModal, setAiEnrichModal] = useState(false)
  const [aiEnrichBooks, setAiEnrichBooks] = useState<Book[]>([])
  const [batchInfoModal, setBatchInfoModal] = useState(false)

  const { authorsMap, linkCountByNode, sortedNodes, mergeNodes } = useBooksTabTableDerived({
    nodes, links, search, sortCol, sortDir, selectedIds, authors, axisFilter, todoOnly,
  })

  /** Map bookId -> sibling books sharing the same originalTitle (excluding self). */
  const workSiblingsMap = useMemo(() => {
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
    const byWork = new Map<string, Book[]>()
    for (const b of nodes) {
      if (!b.originalTitle) continue
      const key = norm(b.originalTitle)
      if (!key) continue
      const arr = byWork.get(key)
      if (arr) arr.push(b)
      else byWork.set(key, [b])
    }
    const result = new Map<BookId, Book[]>()
    for (const group of byWork.values()) {
      if (group.length < 2) continue
      for (const b of group) result.set(b.id, group.filter((s) => s.id !== b.id))
    }
    return result
  }, [nodes])

  const allSelected = sortedNodes.length > 0 && sortedNodes.every((n) => selectedIds.has(n.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  useEffect(() => { if (autoFocusTitle) setTimeout(() => titleInputRef.current?.focus(), 0) }, [autoFocusTitle])
  useEffect(() => {
    if (!focusBookId) return
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-book-row-id="${focusBookId}"]`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      row?.classList.add('animate-flash-row')
      setTimeout(() => row?.classList.remove('animate-flash-row'), 1500)
    })
  }, [focusBookId])

  const toggleRow = (id: BookId) => setSelectedIds((prev) => toggleSetItem(prev, id))
  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedNodes.map((n) => n.id)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  const commitNodeEdit = () => {
    if (!editingCell) return
    const { nodeId, field } = editingCell
    const node = (nodes || []).find((n) => n.id === nodeId)
    if (!node) { setEditingCell(null); return }
    let val = editingValue.trim()
    if (field === 'year') {
      const p = parseInt(val, 10)
      val = Number.isNaN(p) ? String(node.year || '') : String(p)
    }
    if (String(val) !== String(node[field] ?? '')) {
      onUpdateBook?.({ ...node, [field]: field === 'year' ? (val ? parseInt(val, 10) : null) : val })
      onLastEdited?.(nodeId)
    }
    setEditingCell(null)
  }

  const handleBulkDelete = () => {
    if (!bulkDeleteConfirm) { setBulkDeleteConfirm(true); return }
    selectedIds.forEach((id) => onDeleteBook?.(id))
    clearSelection()
    setBulkDeleteConfirm(false)
  }

  const handleAddBookRow = () => {
    if (!inputTitle.trim()) return
    const title = inputTitle.trim()
    const newId = crypto.randomUUID()
    onAddBook?.({
      id: newId,
      title,
      authorIds: inputAuthorIds,
      year: parseInt(inputYear, 10) || null,
      axes: inputAxes,
      description: '',
      originalTitle: null,
    })
    setInputTitle('')
    setInputYear('')
    setInputAxes([])
    setJustAddedBookId(newId)
    setTimeout(() => {
      titleInputRef.current?.focus()
      const el = document.querySelector(`[data-book-row-id="${newId}"]`)
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!fullyVisible) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 50)
    setTimeout(() => setJustAddedBookId((prev) => (prev === newId ? null : prev)), 3000)
  }

  const handleConfirmMerge = () => {
    if (!mergeKeepId || mergeNodes.length !== 2) return
    if (!mergeConfirm) { setMergeConfirm(true); return }
    const fromNode = mergeNodes.find((n) => n.id !== mergeKeepId)
    if (fromNode) onMergeBooks?.(fromNode.id, mergeKeepId)
    setMergeModal(false)
    setMergeKeepId(null)
    setMergeConfirm(false)
    clearSelection()
  }

  const handleConfirmSameWork = () => {
    if (!sameWorkTitle || sameWorkBooks.length < 2) return
    if (!sameWorkConfirm) { setSameWorkConfirm(true); return }
    sameWorkBooks.forEach((b) => {
      onUpdateBook?.({ ...b, originalTitle: sameWorkTitle })
    })
    setSameWorkModal(false)
    setSameWorkTitle(null)
    setSameWorkConfirm(false)
    setSameWorkBooks([])
    clearSelection()
  }

  const openAIEnrich = () => {
    const selected = nodes.filter((n) => selectedIds.has(n.id))
    if (selected.length === 0) return
    setAiEnrichBooks(selected)
    setAiEnrichModal(true)
  }

  const onOpenSameWorkModal = () => {
    const captured = [...selectedIds].map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as Book[]
    setSameWorkBooks(captured)
    setSameWorkTitle(captured[0]?.title || null)
    setSameWorkConfirm(false)
    setSameWorkModal(true)
  }

  const onOpenMergeModal = () => {
    setMergeKeepId(mergeNodes[0]?.id || null)
    setMergeConfirm(false)
    setMergeModal(true)
  }

  const onExport = () => {
    const selected = (nodes || []).filter((n) => selectedIds.has(n.id))
    return selected
      .map((n) => {
        const authorNames = (n.authorIds || [])
          .map((id) => authorsMap.get(id))
          .filter(Boolean)
          .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
          .join(', ')
        return [n.title, authorNames, n.year].filter(Boolean).join(', ')
      })
      .join('\n')
  }

  return {
    editingAuthorsNodeId, setEditingAuthorsNodeId,
    editingCell, setEditingCell, editingValue, setEditingValue,
    selectedIds, bulkDeleteConfirm, setBulkDeleteConfirm,
    mergeModal, setMergeModal, mergeKeepId, setMergeKeepId, mergeConfirm, setMergeConfirm,
    sameWorkModal, setSameWorkModal, sameWorkTitle, setSameWorkTitle,
    sameWorkConfirm, setSameWorkConfirm, sameWorkBooks, setSameWorkBooks,
    axisFilter, setAxisFilter, todoOnly, setTodoOnly,
    inputTitle, setInputTitle, inputAuthorIds, setInputAuthorIds,
    inputYear, setInputYear, inputAxes, setInputAxes,
    titleInputRef, justAddedBookId,
    aiEnrichModal, setAiEnrichModal, aiEnrichBooks, setAiEnrichBooks,
    batchInfoModal, setBatchInfoModal, sortCol, sortDir,
    authorsMap, linkCountByNode, sortedNodes, mergeNodes, workSiblingsMap,
    allSelected, someSelected,
    handleNodeSort, toggleRow, toggleAll, clearSelection,
    commitNodeEdit, handleBulkDelete, handleAddBookRow,
    handleConfirmMerge, handleConfirmSameWork,
    openAIEnrich, onOpenSameWorkModal, onOpenMergeModal, onExport,
  }
}

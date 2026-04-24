import { useEffect, useMemo, useRef, useState } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import { useColumnSort } from './useColumnSort'
import type { Author, AuthorId, Book } from '@/types/domain'
import type { MigrationResult } from '@/features/graph/hooks/graphDataMigration'

type Args = {
  authors: Author[]
  books: Book[]
  search: string
  onAddAuthor: (author: Author) => unknown
  onUpdateAuthor: (author: Author) => unknown
  onDeleteAuthor: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<MigrationResult> | MigrationResult
  onMergeAuthors?: (fromAuthorId: AuthorId, keepAuthorId: AuthorId) => unknown
  focusAuthorId?: AuthorId | null
}

export function useAuthorsTabState({
  authors,
  books,
  search,
  onAddAuthor,
  onUpdateAuthor,
  onDeleteAuthor,
  onMigrateData,
  onMergeAuthors,
  focusAuthorId,
}: Args) {
  const [editingCell, setEditingCell] = useState<null | { authorId: AuthorId; field: 'firstName' | 'lastName' }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<AuthorId>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<MigrationResult | null>(null)
  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<AuthorId | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const { sortCol, sortDir, handleSort } = useColumnSort()
  const [inputFirstName, setInputFirstName] = useState('')
  const [inputLastName, setInputLastName] = useState('')
  const firstNameRef = useRef<HTMLInputElement | null>(null)
  const [justAddedAuthorId, setJustAddedAuthorId] = useState<AuthorId | null>(null)

  useEffect(() => {
    if (!focusAuthorId) return
    const el = document.querySelector(`[data-author-row-id="${focusAuthorId}"]`)
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center' })
  }, [focusAuthorId])

  const legacyBooks = books.filter((b) => !b.authorIds?.length && (b.firstName || b.lastName))
  const legacyCount = legacyBooks.length

  const handleMigrate = async () => {
    if (!onMigrateData) return
    setMigrating(true)
    setMigrateResult(null)
    try {
      const result = await onMigrateData()
      setMigrateResult(result)
    } catch (err) {
      setMigrateResult({
        newAuthors: 0,
        updatedBooks: 0,
        failures: [],
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setMigrating(false)
    }
  }

  const bookCountByAuthor = useMemo(() => {
    const map = new Map<AuthorId, number>()
    books.forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => {
        map.set(aid, (map.get(aid) || 0) + 1)
      })
    })
    return map
  }, [books])

  const booksByAuthor = useMemo(() => {
    const map = new Map<AuthorId, Book[]>()
    books.forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => {
        if (!map.has(aid)) map.set(aid, [])
        map.get(aid)!.push(b)
      })
    })
    return map
  }, [books])

  const mergeAuthorsList = useMemo(() => {
    if (selectedIds.size !== 2) return []
    const ids = new Set(selectedIds)
    return (authors || []).filter((a) => ids.has(a.id))
  }, [authors, selectedIds])

  const filteredAuthors = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = [...authors]
    if (q) {
      list = list.filter(
        (a) =>
          `${a.firstName ?? ''} ${a.lastName ?? ''}`.toLowerCase().includes(q) ||
          (a.lastName ?? '').toLowerCase().includes(q) ||
          (a.firstName ?? '').toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      let va: string | number, vb: string | number
      switch (sortCol) {
        case 'lastName':
          va = (a.lastName || '').toLowerCase()
          vb = (b.lastName || '').toLowerCase()
          break
        case 'firstName':
          va = (a.firstName || '').toLowerCase()
          vb = (b.firstName || '').toLowerCase()
          break
        case 'bookCount':
          va = bookCountByAuthor.get(a.id) || 0
          vb = bookCountByAuthor.get(b.id) || 0
          break
        case 'createdAt':
          va = (a.created_at as string) || ''
          vb = (b.created_at as string) || ''
          break
        default:
          va = ''; vb = ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [authors, search, sortCol, sortDir, bookCountByAuthor])

  const allSelected = filteredAuthors.length > 0 && filteredAuthors.every((a) => selectedIds.has(a.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredAuthors.map((a) => a.id)))
  }

  const toggleRow = (id: AuthorId) => setSelectedIds((prev) => toggleSetItem(prev, id))

  const handleBulkDelete = () => {
    if (!bulkConfirm) { setBulkConfirm(true); return }
    selectedIds.forEach((id) => onDeleteAuthor(id))
    setSelectedIds(new Set())
    setBulkConfirm(false)
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleAddAuthor = () => {
    if (!inputLastName.trim()) return
    const newId = crypto.randomUUID()
    onAddAuthor({
      id: newId,
      type: 'author',
      firstName: inputFirstName.trim(),
      lastName: inputLastName.trim(),
      axes: [],
    })
    setInputFirstName('')
    setInputLastName('')
    setJustAddedAuthorId(newId)
    setTimeout(() => {
      firstNameRef.current?.focus()
      const el = document.querySelector(`[data-author-row-id="${newId}"]`)
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!fullyVisible) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 50)
    setTimeout(() => setJustAddedAuthorId((prev) => (prev === newId ? null : prev)), 3000)
  }

  const commitEdit = () => {
    if (!editingCell) return
    const { authorId, field } = editingCell
    const author = authors.find((a) => a.id === authorId)
    if (!author) { setEditingCell(null); return }
    const val = editingValue.trim()
    if (val !== (author[field] || '')) onUpdateAuthor({ ...author, [field]: val })
    setEditingCell(null)
  }

  const handleConfirmMerge = () => {
    if (!mergeKeepId || mergeAuthorsList.length !== 2) return
    if (!mergeConfirm) { setMergeConfirm(true); return }
    const from = mergeAuthorsList.find((a) => a.id !== mergeKeepId)
    if (from) onMergeAuthors?.(from.id, mergeKeepId)
    setMergeModal(false)
    setMergeKeepId(null)
    setMergeConfirm(false)
    clearSelection()
  }

  return {
    // state
    editingCell, setEditingCell,
    editingValue, setEditingValue,
    selectedIds, setSelectedIds,
    bulkConfirm, setBulkConfirm,
    migrating,
    migrateResult,
    mergeModal, setMergeModal,
    mergeKeepId, setMergeKeepId,
    mergeConfirm, setMergeConfirm,
    sortCol,
    sortDir,
    inputFirstName, setInputFirstName,
    inputLastName, setInputLastName,
    firstNameRef,
    // derived
    legacyCount,
    legacyBooks,
    bookCountByAuthor,
    booksByAuthor,
    mergeAuthorsList,
    filteredAuthors,
    allSelected,
    someSelected,
    // handlers
    handleMigrate,
    handleSort,
    toggleAll,
    toggleRow,
    handleBulkDelete,
    handleAddAuthor,
    commitEdit,
    handleConfirmMerge,
    justAddedAuthorId,
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Author, AuthorId, Book } from '@/types/domain'

type Args = {
  authors: Author[]
  books: Book[]
  search: string
  onAddAuthor: (author: Author) => unknown
  onUpdateAuthor: (author: Author) => unknown
  onDeleteAuthor: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<{ newAuthors: number; updatedBooks: number } | null> | { newAuthors: number; updatedBooks: number } | null
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
  const [migrateResult, setMigrateResult] = useState<{ newAuthors: number; updatedBooks: number } | null>(null)
  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<AuthorId | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const [sortCol, setSortCol] = useState('lastName')
  const [sortDir, setSortDir] = useState('asc')
  const [inputFirstName, setInputFirstName] = useState('')
  const [inputLastName, setInputLastName] = useState('')
  const firstNameRef = useRef<HTMLInputElement | null>(null)
  const [justAddedAuthorId, setJustAddedAuthorId] = useState<AuthorId | null>(null)

  useEffect(() => {
    if (!focusAuthorId) return
    const el = document.querySelector(`[data-author-row-id="${focusAuthorId}"]`)
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center' })
  }, [focusAuthorId])

  const legacyCount = books.filter((b) => !b.authorIds?.length && (b.firstName || b.lastName)).length

  const handleMigrate = async () => {
    if (!onMigrateData) return
    setMigrating(true)
    setMigrateResult(null)
    const result = await onMigrateData()
    setMigrating(false)
    setMigrateResult(result)
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
        default:
          va = ''; vb = ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [authors, search, sortCol, sortDir, bookCountByAuthor])

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const allSelected = filteredAuthors.length > 0 && filteredAuthors.every((a) => selectedIds.has(a.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredAuthors.map((a) => a.id)))
  }

  const toggleRow = (id: AuthorId) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleBulkDelete = () => {
    if (!bulkConfirm) { setBulkConfirm(true); return }
    selectedIds.forEach((id) => onDeleteAuthor(id))
    setSelectedIds(new Set())
    setBulkConfirm(false)
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleAddAuthor = () => {
    if (!inputLastName.trim()) return
    const newId = `auth_${crypto.randomUUID().slice(0, 8)}`
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
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
    bookCountByAuthor,
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

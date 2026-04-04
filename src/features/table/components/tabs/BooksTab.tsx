import { useEffect, useRef, useState } from 'react'
import { TableMergeModal } from '../TableMergeModal'
import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'
import { type Axis } from '@/common/utils/categories'
import { BooksTabBooksTable } from './BooksTabBooksTable'
import { BooksTabSelectionBar } from './BooksTabSelectionBar'
import { useBooksTabTableDerived } from './useBooksTabTableDerived'

type BooksTabProps = {
  nodes: Book[]
  links: Link[]
  search: string
  authors: Author[]
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onBookAdded?: (title: string) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
  initialAuthorIds?: AuthorId[]
  autoFocusTitle?: boolean
}

export function BooksTab({
  nodes,
  links,
  search,
  authors,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onMergeBooks,
  onAddAuthor,
  onLastEdited,
  onBookAdded,
  onOpenLinksForBook,
  onFocusAuthorInAuthorsTab,
  onOpenWorkDetail,
  initialAuthorIds = [],
  autoFocusTitle = false,
}: BooksTabProps) {
  const [editingAuthorsNodeId, setEditingAuthorsNodeId] = useState<BookId | null>(null)
  const [sortCol, setSortCol] = useState('lastName')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState<Set<BookId>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [editingCell, setEditingCell] = useState<null | { nodeId: BookId; field: 'title' | 'year' }>(null)
  const [editingValue, setEditingValue] = useState('')

  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<BookId | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)

  const [inputTitle, setInputTitle] = useState('')
  const [inputAuthorIds, setInputAuthorIds] = useState<AuthorId[]>(initialAuthorIds)
  const [inputYear, setInputYear] = useState('')
  const [inputAxes, setInputAxes] = useState<Axis[]>([])
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [justAddedBookId, setJustAddedBookId] = useState<BookId | null>(null)

  const { authorsMap, linkCountByNode, sortedNodes, mergeNodes } = useBooksTabTableDerived({
    nodes,
    links,
    search,
    sortCol,
    sortDir,
    selectedIds,
    authors,
  })

  const allSelected = sortedNodes.length > 0 && sortedNodes.every((n) => selectedIds.has(n.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  useEffect(() => {
    if (!autoFocusTitle) return
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [autoFocusTitle])

  const handleNodeSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const toggleRow = (id: BookId) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
    })
    onBookAdded?.(title)
    setInputTitle('')
    setInputYear('')
    setInputAxes([])
    setJustAddedBookId(newId)
    setTimeout(() => {
      titleInputRef.current?.focus()
      const el = document.querySelector(`[data-book-row-id="${newId}"]`)
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BooksTabSelectionBar
        selectedCount={selectedIds.size}
        bulkDeleteConfirm={bulkDeleteConfirm}
        onBulkDelete={handleBulkDelete}
        onBulkDeleteBlur={() => setBulkDeleteConfirm(false)}
        onCancelSelection={() => { clearSelection(); setBulkDeleteConfirm(false) }}
        showMerge={selectedIds.size === 2}
        onOpenMergeModal={() => {
          setMergeKeepId(mergeNodes[0]?.id || null)
          setMergeConfirm(false)
          setMergeModal(true)
        }}
        onExport={() => {
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
        }}
      />

      <BooksTabBooksTable
        sortedNodes={sortedNodes}
        search={search}
        justAddedBookId={justAddedBookId}
        authors={authors}
        authorsMap={authorsMap}
        linkCountByNode={linkCountByNode}
        sortCol={sortCol}
        sortDir={sortDir}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        editingAuthorsNodeId={editingAuthorsNodeId}
        setEditingAuthorsNodeId={setEditingAuthorsNodeId}
        editingCell={editingCell}
        setEditingCell={setEditingCell}
        editingValue={editingValue}
        setEditingValue={setEditingValue}
        inputTitle={inputTitle}
        setInputTitle={setInputTitle}
        inputAuthorIds={inputAuthorIds}
        setInputAuthorIds={setInputAuthorIds}
        inputYear={inputYear}
        setInputYear={setInputYear}
        inputAxes={inputAxes}
        setInputAxes={setInputAxes}
        titleInputRef={titleInputRef}
        onNodeSort={handleNodeSort}
        toggleAll={toggleAll}
        toggleRow={toggleRow}
        commitNodeEdit={commitNodeEdit}
        handleAddBookRow={handleAddBookRow}
        onUpdateBook={onUpdateBook}
        onLastEdited={onLastEdited}
        onAddAuthor={onAddAuthor}
        onFocusAuthorInAuthorsTab={onFocusAuthorInAuthorsTab}
        onOpenLinksForBook={onOpenLinksForBook}
        onOpenWorkDetail={onOpenWorkDetail}
      />

      <TableMergeModal
        mergeModal={mergeModal}
        mergeNodes={mergeNodes}
        nodes={nodes}
        authorsMap={authorsMap}
        mergeKeepId={mergeKeepId}
        setMergeKeepId={setMergeKeepId}
        setMergeConfirm={setMergeConfirm}
        mergeConfirm={mergeConfirm}
        handleConfirmMerge={handleConfirmMerge}
        setMergeModal={setMergeModal}
      />
    </div>
  )
}

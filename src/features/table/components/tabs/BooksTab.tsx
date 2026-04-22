import { TableMergeModal } from '../TableMergeModal'
import { TableSameWorkModal } from '../TableSameWorkModal'
import { AIEnrichModal } from '../AIEnrichModal'
import { BatchInfoModal } from '../BatchInfoModal'
import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'
import { BooksTabBooksTable } from './BooksTabBooksTable'
import { BooksTabSelectionBar } from './BooksTabSelectionBar'
import { BooksTabAlertBar } from './BooksTabAlertBar'
import { useBooksTabState } from '../../hooks/useBooksTabState'
import type { DuplicateGroup } from '../../hooks/useTableViewDuplicateDerived'

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
  onOpenLinksForBook?: (node: Book) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
  initialAuthorIds?: AuthorId[]
  autoFocusTitle?: boolean
  duplicateGroups?: DuplicateGroup[]
  onOpenDedupeModal?: () => void
  orphans?: Book[]
  onOpenOrphanModal?: () => void
  todoCount?: number
  focusBookId?: BookId | null
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
  onOpenLinksForBook,
  onFocusAuthorInAuthorsTab,
  onOpenWorkDetail,
  initialAuthorIds = [],
  autoFocusTitle = false,
  duplicateGroups = [],
  orphans = [],
  onOpenDedupeModal,
  onOpenOrphanModal,
  todoCount = 0,
  focusBookId = null,
}: BooksTabProps) {
  const s = useBooksTabState({
    nodes,
    links,
    search,
    authors,
    onUpdateBook,
    onDeleteBook,
    onMergeBooks,
    onLastEdited,
    focusBookId,
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BooksTabAlertBar
        duplicateGroups={duplicateGroups}
        orphans={orphans}
        todoCount={todoCount}
        todoOnly={s.todoOnly}
        onToggleTodoOnly={() => s.setTodoOnly((v) => !v)}
        onOpenDedupeModal={onOpenDedupeModal}
        onOpenOrphanModal={onOpenOrphanModal}
      />

      <BooksTabSelectionBar
        selectedCount={s.selectedIds.size}
        bulkDeleteConfirm={s.bulkDeleteConfirm}
        onBulkDelete={s.handleBulkDelete}
        onBulkDeleteBlur={() => s.setBulkDeleteConfirm(false)}
        onCancelSelection={() => { s.clearSelection(); s.setBulkDeleteConfirm(false) }}
        showMerge={s.selectedIds.size === 2}
        showSameWork={s.selectedIds.size >= 2}
        onOpenSameWorkModal={s.onOpenSameWorkModal}
        onOpenMergeModal={s.onOpenMergeModal}
        onAIEnrich={s.openAIEnrich}
        onShowInfo={() => s.setBatchInfoModal(true)}
        onExport={s.onExport}
      />

      <BooksTabBooksTable
        sortedNodes={s.sortedNodes}
        search={search}
        justAddedBookId={s.justAddedBookId}
        focusBookId={focusBookId}
        highlightedBookId={s.highlightedBookId}
        authors={authors}
        authorsMap={s.authorsMap}
        linkCountByNode={s.linkCountByNode}
        linkedBooksByNode={s.linkedBooksByNode}
        workSiblingsMap={s.workSiblingsMap}
        sortCol={s.sortCol}
        sortDir={s.sortDir}
        selectedIds={s.selectedIds}
        allSelected={s.allSelected}
        someSelected={s.someSelected}
        editingAuthorsNodeId={s.editingAuthorsNodeId}
        setEditingAuthorsNodeId={s.setEditingAuthorsNodeId}
        editingCell={s.editingCell}
        setEditingCell={s.setEditingCell}
        editingValue={s.editingValue}
        setEditingValue={s.setEditingValue}
        initialAuthorIds={initialAuthorIds}
        autoFocusTitle={autoFocusTitle}
        onNodeSort={s.handleNodeSort}
        toggleAll={s.toggleAll}
        toggleRow={s.toggleRow}
        commitNodeEdit={s.commitNodeEdit}
        onAddBook={onAddBook}
        onBookAdded={s.onBookAdded}
        onUpdateBook={onUpdateBook}
        onLastEdited={onLastEdited}
        onAddAuthor={onAddAuthor}
        onFocusAuthorInAuthorsTab={onFocusAuthorInAuthorsTab}
        onOpenLinksForBook={onOpenLinksForBook}
        onOpenWorkDetail={onOpenWorkDetail}
        axisFilter={s.axisFilter}
        onAxisFilter={s.setAxisFilter}
        typeFilter={s.typeFilter}
        onTypeFilter={s.setTypeFilter}
      />

      <TableMergeModal
        mergeModal={s.mergeModal}
        mergeNodes={s.mergeNodes}
        nodes={nodes}
        authorsMap={s.authorsMap}
        mergeKeepId={s.mergeKeepId}
        setMergeKeepId={s.setMergeKeepId}
        setMergeConfirm={s.setMergeConfirm}
        mergeConfirm={s.mergeConfirm}
        handleConfirmMerge={s.handleConfirmMerge}
        setMergeModal={s.setMergeModal}
      />

      <TableSameWorkModal
        open={s.sameWorkModal}
        books={s.sameWorkBooks}
        authorsMap={s.authorsMap}
        selectedTitle={s.sameWorkTitle}
        setSelectedTitle={s.setSameWorkTitle}
        confirm={s.sameWorkConfirm}
        setConfirm={s.setSameWorkConfirm}
        onConfirm={s.handleConfirmSameWork}
        onClose={() => { s.setSameWorkModal(false); s.setSameWorkTitle(null); s.setSameWorkBooks([]) }}
      />

      <AIEnrichModal
        open={s.aiEnrichModal}
        books={s.aiEnrichBooks}
        authorsMap={s.authorsMap}
        onUpdateBook={onUpdateBook}
        onAddAuthor={onAddAuthor}
        onClose={() => { s.setAiEnrichModal(false); s.setAiEnrichBooks([]) }}
      />

      <BatchInfoModal
        open={s.batchInfoModal}
        onClose={() => s.setBatchInfoModal(false)}
        selectedBooks={nodes.filter((n) => s.selectedIds.has(n.id))}
        allBooks={nodes}
        allAuthors={authors}
        authorsMap={s.authorsMap}
      />
    </div>
  )
}

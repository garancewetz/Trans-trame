import { Virtuoso } from 'react-virtuoso'
import clsx from 'clsx'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { AxisFilterTH } from '../AxisFilterTH'
import { BOOKS_GRID_STYLE } from '../../tableConstants'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import { type Axis } from '@/common/utils/categories'
import { BooksTabAddRow } from './BooksTabAddRow'
import { BooksTabBookRow } from './BooksTabBookRow'

type BooksTabBooksTableProps = {
  sortedNodes: Book[]
  search: string
  justAddedBookId?: BookId | null
  authors: Author[]
  authorsMap: Map<string, Author>
  linkCountByNode: Map<string, number>
  linkedBooksByNode: Map<BookId, Book[]>
  workSiblingsMap: Map<BookId, Book[]>
  sortCol: string
  sortDir: 'asc' | 'desc'
  selectedIds: Set<BookId>
  allSelected: boolean
  someSelected: boolean
  editingAuthorsNodeId: BookId | null
  setEditingAuthorsNodeId: (id: BookId | null) => void
  editingCell: null | { nodeId: BookId; field: 'title' | 'year' }
  setEditingCell: (v: null | { nodeId: BookId; field: 'title' | 'year' }) => void
  editingValue: string
  setEditingValue: (v: string) => void
  initialAuthorIds?: AuthorId[]
  autoFocusTitle?: boolean
  onNodeSort: (col: string) => void
  toggleAll: () => void
  toggleRow: (id: BookId) => void
  commitNodeEdit: () => void
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => unknown
  onBookAdded?: (bookId: BookId) => void
  onUpdateBook?: (book: Book) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
  axisFilter?: Axis | null
  onAxisFilter?: (axis: Axis | null) => void
}

function SortCell({ col, activeCol, dir, onSort, children }: {
  col: string
  activeCol: string
  dir: 'asc' | 'desc'
  onSort: (col: string) => void
  children: React.ReactNode
}) {
  const active = activeCol === col
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="flex cursor-pointer select-none items-center gap-1 px-3 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32 transition-colors hover:text-white/60"
    >
      {children}
      {active
        ? (dir === 'asc'
          ? <ChevronUp size={10} className="text-green" />
          : <ChevronDown size={10} className="text-green" />)
        : <ChevronUp size={10} className="text-white/18" />}
    </button>
  )
}

export function BooksTabBooksTable({
  sortedNodes,
  search,
  justAddedBookId,
  authors,
  authorsMap,
  linkCountByNode,
  linkedBooksByNode,
  workSiblingsMap,
  sortCol,
  sortDir,
  selectedIds,
  allSelected,
  someSelected,
  editingAuthorsNodeId,
  setEditingAuthorsNodeId,
  editingCell,
  setEditingCell,
  editingValue,
  setEditingValue,
  initialAuthorIds,
  autoFocusTitle,
  onNodeSort,
  toggleAll,
  toggleRow,
  commitNodeEdit,
  onAddBook,
  onBookAdded,
  onUpdateBook,
  onLastEdited,
  onAddAuthor,
  onFocusAuthorInAuthorsTab,
  onOpenLinksForBook,
  onOpenWorkDetail,
  axisFilter,
  onAxisFilter,
}: BooksTabBooksTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 bg-bg-overlay">
        <div
          className="grid items-center border-b border-white/6"
          style={BOOKS_GRID_STYLE}
        >
          <div className="flex items-center justify-center px-3 py-2.5">
            <Button
              onClick={toggleAll}
              type="button"
              className={clsx(
                'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                allSelected ? 'border-green bg-green/18 text-green'
                  : someSelected ? 'border-green/38 bg-green/[0.07] text-green/[0.55]'
                  : 'border-white/14 text-transparent hover:border-white/28',
              )}
            >
              <Check size={9} />
            </Button>
          </div>
          <div className="px-2 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32">Type</div>
          <SortCell col="title" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>Titre</SortCell>
          <SortCell col="lastName" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>Auteur·ice</SortCell>
          <SortCell col="year" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>Année</SortCell>
          <AxisFilterTH activeAxis={axisFilter ?? null} onSelect={onAxisFilter ?? (() => {})} />
          <SortCell col="linkCount" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>Liens</SortCell>
          <SortCell col="createdAt" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>Ajouté</SortCell>
          <div className="px-2 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32">
            Graphe
          </div>
        </div>

        <BooksTabAddRow
          authors={authors}
          initialAuthorIds={initialAuthorIds}
          autoFocus={autoFocusTitle}
          onAddBook={onAddBook}
          onBookAdded={onBookAdded}
          onAddAuthor={onAddAuthor}
        />
      </div>

      {sortedNodes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="font-mono text-ui text-white/22">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucune ressource'}
          </p>
        </div>
      ) : (
        <Virtuoso
          className="flex-1"
          totalCount={sortedNodes.length}
          itemContent={(i) => {
            const node = sortedNodes[i]
            return (
              <BooksTabBookRow
                node={node}
                rowIndex={i}
                justAdded={justAddedBookId === node.id}
                isSelected={selectedIds.has(node.id)}
                isEditTitle={editingCell?.nodeId === node.id && editingCell?.field === 'title'}
                isEditYear={editingCell?.nodeId === node.id && editingCell?.field === 'year'}
                editingAuthorsNodeId={editingAuthorsNodeId}
                setEditingAuthorsNodeId={setEditingAuthorsNodeId}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                setEditingCell={setEditingCell}
                authors={authors}
                authorsMap={authorsMap}
                linkCount={linkCountByNode.get(node.id) ?? 0}
                linkedBooks={linkedBooksByNode.get(node.id)}
                workSiblings={workSiblingsMap.get(node.id)}
                toggleRow={toggleRow}
                commitNodeEdit={commitNodeEdit}
                onUpdateBook={onUpdateBook}
                onLastEdited={onLastEdited}
                onAddAuthor={onAddAuthor}
                onFocusAuthorInAuthorsTab={onFocusAuthorInAuthorsTab}
                onOpenLinksForBook={onOpenLinksForBook}
                onOpenWorkDetail={onOpenWorkDetail}
              />
            )
          }}
        />
      )}
    </div>
  )
}

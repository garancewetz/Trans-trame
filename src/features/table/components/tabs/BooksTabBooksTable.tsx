import type { RefObject } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TH } from '../TableSubcomponents'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'
import { BooksTabAddRow } from './BooksTabAddRow'
import { BooksTabBookRow } from './BooksTabBookRow'

export type BooksTabBooksTableProps = {
  sortedNodes: Book[]
  search: string
  authors: Author[]
  authorsMap: Map<string, Author>
  linkCountByNode: Map<string, number>
  sortCol: string
  sortDir: string
  selectedIds: Set<BookId>
  allSelected: boolean
  someSelected: boolean
  editingAuthorsNodeId: BookId | null
  setEditingAuthorsNodeId: (id: BookId | null) => void
  editingCell: null | { nodeId: BookId; field: 'title' | 'year' }
  setEditingCell: (v: null | { nodeId: BookId; field: 'title' | 'year' }) => void
  editingValue: string
  setEditingValue: (v: string) => void
  inputTitle: string
  setInputTitle: (v: string) => void
  inputAuthorIds: AuthorId[]
  setInputAuthorIds: (v: AuthorId[]) => void
  inputYear: string
  setInputYear: (v: string) => void
  inputAxes: Axis[]
  setInputAxes: (v: Axis[]) => void
  titleInputRef: RefObject<HTMLInputElement | null>
  onNodeSort: (col: string) => void
  toggleAll: () => void
  toggleRow: (id: BookId) => void
  commitNodeEdit: () => void
  handleAddBookRow: () => void
  onUpdateBook?: (book: Book) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
}

export function BooksTabBooksTable({
  sortedNodes,
  search,
  authors,
  authorsMap,
  linkCountByNode,
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
  inputTitle,
  setInputTitle,
  inputAuthorIds,
  setInputAuthorIds,
  inputYear,
  setInputYear,
  inputAxes,
  setInputAxes,
  titleInputRef,
  onNodeSort,
  toggleAll,
  toggleRow,
  commitNodeEdit,
  handleAddBookRow,
  onUpdateBook,
  onLastEdited,
  onAddAuthor,
  onFocusAuthorInAuthorsTab,
  onOpenLinksForBook,
  onOpenWorkDetail,
}: BooksTabBooksTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-bg-overlay/98">
          <tr className="border-b border-white/6">
            <th className="w-9 px-3 py-2.5">
              <Button
                onClick={toggleAll}
                type="button"
                className={[
                  'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                  allSelected ? 'border-green bg-green/18 text-green'
                    : someSelected ? 'border-green/38 bg-green/[0.07] text-green/[0.55]'
                    : 'border-white/14 text-transparent hover:border-white/28',
                ].join(' ')}
              >
                <Check size={9} />
              </Button>
            </th>
            <TH col="title" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="min-w-0 max-w-36">
              Titre
            </TH>
            <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={onNodeSort}>
              Auteur·ice
            </TH>
            <TH col="year" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-20">
              Année
            </TH>
            <th className="w-40 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Axes
            </th>
            <th className="w-[5.5rem] px-2 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Détails
            </th>
            <th className="w-20 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Liens
            </th>
          </tr>

          <BooksTabAddRow
            authors={authors}
            inputTitle={inputTitle}
            setInputTitle={setInputTitle}
            inputAuthorIds={inputAuthorIds}
            setInputAuthorIds={setInputAuthorIds}
            inputYear={inputYear}
            setInputYear={setInputYear}
            inputAxes={inputAxes}
            setInputAxes={setInputAxes}
            titleInputRef={titleInputRef}
            onAddBookRow={handleAddBookRow}
            onAddAuthor={onAddAuthor}
          />
        </thead>

        <tbody>
          {sortedNodes.map((node, i) => (
            <BooksTabBookRow
              key={node.id}
              node={node}
              rowIndex={i}
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
              toggleRow={toggleRow}
              commitNodeEdit={commitNodeEdit}
              onUpdateBook={onUpdateBook}
              onLastEdited={onLastEdited}
              onAddAuthor={onAddAuthor}
              onFocusAuthorInAuthorsTab={onFocusAuthorInAuthorsTab}
              onOpenLinksForBook={onOpenLinksForBook}
              onOpenWorkDetail={onOpenWorkDetail}
            />
          ))}
        </tbody>
      </table>

      {sortedNodes.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-[0.85rem] text-white/22">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun ouvrage'}
          </p>
        </div>
      )}
    </div>
  )
}

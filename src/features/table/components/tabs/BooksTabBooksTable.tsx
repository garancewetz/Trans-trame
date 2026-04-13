import type { RefObject } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { AxisFilterTH, TH } from '../TableSubcomponents'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import { type Axis } from '@/common/utils/categories'
import { BooksTabAddRow } from './BooksTabAddRow'
import { BooksTabBookRow } from './BooksTabBookRow'

export type BooksTabBooksTableProps = {
  sortedNodes: Book[]
  search: string
  justAddedBookId?: BookId | null
  authors: Author[]
  authorsMap: Map<string, Author>
  linkCountByNode: Map<string, number>
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
  axisFilter?: Axis | null
  onAxisFilter?: (axis: Axis | null) => void
}

export function BooksTabBooksTable({
  sortedNodes,
  search,
  justAddedBookId,
  authors,
  authorsMap,
  linkCountByNode,
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
  axisFilter,
  onAxisFilter,
}: BooksTabBooksTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-bg-overlay">
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
            <TH col="title" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-[30%] min-w-0">
              Titre
            </TH>
            <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-[18%] min-w-0">
              Auteur·ice
            </TH>
            <TH col="year" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-20">
              Année
            </TH>
            <AxisFilterTH activeAxis={axisFilter ?? null} onSelect={onAxisFilter ?? (() => {})} />
            <TH col="linkCount" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-20">
              Liens
            </TH>
            <TH col="createdAt" activeCol={sortCol} dir={sortDir} onSort={onNodeSort} className="w-28">
              Ajouté
            </TH>
            <th className="w-22 px-2 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32">
              Graphe
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
          ))}
        </tbody>
      </table>

      {sortedNodes.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-ui text-white/22">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun ouvrage'}
          </p>
        </div>
      )}
    </div>
  )
}

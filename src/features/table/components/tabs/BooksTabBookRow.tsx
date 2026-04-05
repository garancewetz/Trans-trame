import { Link } from 'react-router-dom'
import { Check, ExternalLink, Eye, Link2 } from 'lucide-react'
import { mapBookUrlSearch } from '@/common/utils/bookSlug'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { OutlineBadge } from '@/common/components/ui/OutlineBadge'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT, TD } from '../../tableConstants'
import { AxisDots, AuthorPicker } from '../TableSubcomponents'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import { narrowAxes } from '@/common/utils/categories'

type Props = {
  node: Book
  rowIndex: number
  justAdded?: boolean
  isSelected: boolean
  isEditTitle: boolean
  isEditYear: boolean
  editingAuthorsNodeId: BookId | null
  setEditingAuthorsNodeId: (id: BookId | null) => void
  editingValue: string
  setEditingValue: (v: string) => void
  setEditingCell: (v: null | { nodeId: BookId; field: 'title' | 'year' }) => void
  authors: Author[]
  authorsMap: Map<string, Author>
  linkCount: number
  toggleRow: (id: BookId) => void
  commitNodeEdit: () => void
  onUpdateBook?: (book: Book) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
}

export function BooksTabBookRow({
  node,
  rowIndex,
  justAdded,
  isSelected,
  isEditTitle,
  isEditYear,
  editingAuthorsNodeId,
  setEditingAuthorsNodeId,
  editingValue,
  setEditingValue,
  setEditingCell,
  authors,
  authorsMap,
  linkCount,
  toggleRow,
  commitNodeEdit,
  onUpdateBook,
  onLastEdited,
  onAddAuthor,
  onFocusAuthorInAuthorsTab,
  onOpenLinksForBook,
  onOpenWorkDetail,
}: Props) {
  return (
    <tr
      data-book-row-id={node.id}
      className={[
        'group border-b border-white/4 transition-colors',
        justAdded ? 'animate-flash-row' : '',
        isSelected ? 'bg-green/[0.025]' : rowIndex % 2 === 0 ? 'bg-white/[0.003]' : '',
        'hover:bg-white/2.5',
      ].join(' ')}
    >
      <td className="px-3 py-2">
        <Button
          onClick={() => toggleRow(node.id)}
          type="button"
          className={[
            'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
            isSelected
              ? 'border-green bg-green/18 text-green'
              : 'border-white/14 text-transparent hover:border-white/28',
          ].join(' ')}
        >
          <Check size={9} />
        </Button>
      </td>
      <td className={`${TD} min-w-0`}>
        {isEditTitle ? (
          <TextInput
            variant="table"
            autoFocus
            className={INPUT}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
            onBlur={commitNodeEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
          />
        ) : (
          <span
            className="block cursor-text px-0.5 leading-snug hover:text-white"
            onClick={() => { setEditingCell({ nodeId: node.id, field: 'title' }); setEditingValue(node.title) }}
          >
            {node.title}
          </span>
        )}
      </td>
      <td className={TD}>
        {editingAuthorsNodeId === node.id ? (
          <div
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingAuthorsNodeId(null) }}
          >
            <AuthorPicker
              authors={authors}
              selectedAuthorIds={node.authorIds || []}
              onChange={(ids) => {
                onUpdateBook?.({ ...node, authorIds: ids })
                onLastEdited?.(node.id)
              }}
              onAddAuthor={onAddAuthor}
            />
          </div>
        ) : (node.authorIds?.length ?? 0) > 0 ? (
          <div
            className="flex min-h-[1.5em] cursor-pointer flex-wrap items-center gap-1 rounded px-0.5 py-0.5 hover:bg-white/4"
            onClick={() => setEditingAuthorsNodeId(node.id)}
          >
            {(node.authorIds ?? []).map((aid) => {
              const a = authorsMap.get(aid)
              return a ? (
                <OutlineBadge
                  key={aid}
                  onClick={(e) => {
                    e.stopPropagation()
                    onFocusAuthorInAuthorsTab?.(aid)
                  }}
                  title="Aller à l'auteur dans la table"
                  className="cursor-pointer hover:text-white"
                >
                  {bookAuthorDisplay({ authorIds: [aid] }, authorsMap)}
                </OutlineBadge>
              ) : null
            })}
          </div>
        ) : (
          <span
            className="block min-h-[1.2em] w-full cursor-text px-0.5 text-white/42 hover:text-white"
            onClick={() => setEditingAuthorsNodeId(node.id)}
          >
            {bookAuthorDisplay(node, authorsMap) || <span className="text-white/18">—</span>}
          </span>
        )}
      </td>
      <td className={TD}>
        {isEditYear ? (
          <TextInput
            variant="table"
            autoFocus
            className={INPUT}
            type="number"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
            onBlur={commitNodeEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
          />
        ) : (
          <span className="cursor-text tabular-nums px-0.5 hover:text-white"
            onClick={() => { setEditingCell({ nodeId: node.id, field: 'year' }); setEditingValue(String(node.year || '')) }}>
            {node.year || <span className="text-white/18">—</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <AxisDots
          axes={narrowAxes(node.axes)}
          onChange={(newAxes) => { onUpdateBook?.({ ...node, axes: newAxes }); onLastEdited?.(node.id) }}
        />
      </td>
      <td className="px-3 py-2">
        <Button
          type="button"
          title="Voir / ajouter des liens pour cet ouvrage"
          onClick={() => {
            onOpenLinksForBook?.(node)
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[0.8rem] text-white/45 transition-all hover:border-cyan/35 hover:bg-cyan/[0.07] hover:text-cyan/80"
        >
          {linkCount}
          <Link2 size={10} className="shrink-0" />
        </Button>
      </td>
      <td className="px-2 py-2">
        {onOpenWorkDetail ? (
          <Button
            type="button"
            title="Ouvrir la grande fiche ouvrage"
            onClick={() => onOpenWorkDetail(node.id)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-[0.75rem] font-semibold text-white/45 transition-all hover:border-violet/40 hover:bg-violet/10 hover:text-violet/95"
          >
            <Eye size={12} className="shrink-0" />
            Graphe
          </Button>
        ) : (
          <Link
            to={{ pathname: '/', search: mapBookUrlSearch(node.id) }}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir la carte sur cet ouvrage (nouvel onglet, ?book=…)"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-[0.75rem] font-semibold text-white/45 transition-all hover:border-violet/40 hover:bg-violet/10 hover:text-violet/95"
          >
            <Eye size={12} className="shrink-0" />
            Graphe
          </Link>
        )}
      </td>
    </tr>
  )
}

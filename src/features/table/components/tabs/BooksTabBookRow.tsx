import { memo } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Eye } from 'lucide-react'
import { mapBookUrlSearch } from '@/common/utils/bookSlug'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { StatusFlag } from '@/common/components/StatusFlag'
import { TodoNotePopover } from '../TodoNotePopover'
import { Badge } from '@/common/components/ui/Badge'
import { TextInput } from '@/common/components/ui/TextInput'
import { BOOKS_GRID_STYLE, INPUT, TD } from '../../tableConstants'
import { AxisDots } from '../AxisDots'
import { AuthorPicker } from '../AuthorPicker'
import { BookLinksBadge } from './BookLinksBadge'
import { WorkSiblingsBadge } from './WorkSiblingsBadge'
import { splitBookAxes } from '@/common/utils/categories'
import { ResourceTypePicker } from '../ResourceTypePicker'
import type { Author, AuthorId, Book, BookId, EntityStatus } from '@/types/domain'

const GRAPH_BTN = 'inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-caption font-semibold text-white/45 transition-all hover:border-violet/40 hover:bg-violet/10 hover:text-violet/95'

type Props = {
  node: Book
  rowIndex: number
  justAdded?: boolean
  highlighted?: boolean
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
  linkedBooks?: Book[]
  workSiblings?: Book[]
  toggleRow: (id: BookId) => void
  commitNodeEdit: () => void
  onUpdateBook?: (book: Book) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
}

function BooksTabBookRowImpl({
  node,
  rowIndex,
  justAdded,
  highlighted,
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
  linkedBooks,
  workSiblings,
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
    <div
      data-book-row-id={node.id}
      style={BOOKS_GRID_STYLE}
      className={clsx(
        'group grid cursor-pointer items-center border-b border-white/4 transition-colors hover:bg-white/2.5',
        (justAdded || highlighted) && 'animate-flash-row',
        isSelected ? 'bg-green/2.5' : rowIndex % 2 === 0 ? 'bg-white/[0.003]' : '',
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, a, [data-editable]')) return
        toggleRow(node.id)
      }}
    >
      <div className="flex items-center justify-center px-3 py-2">
        <Button
          onClick={() => toggleRow(node.id)}
          type="button"
          className={clsx(
            'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
            isSelected
              ? 'border-green bg-green/18 text-green'
              : 'border-white/14 text-transparent hover:border-white/28',
          )}
        >
          <Check size={9} />
        </Button>
      </div>
      <div className={clsx(TD, 'min-w-0')}>
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
          <span className="flex items-center">
            <span
              className="block cursor-text px-0.5 leading-snug hover:text-white"
              onClick={(e) => { e.stopPropagation(); setEditingCell({ nodeId: node.id, field: 'title' }); setEditingValue(node.title) }}
            >
              {node.title}
            </span>
            {node.todo && (
              <TodoNotePopover note={node.todo} iconClassName="ml-1.5 text-amber/50"
                onClear={onUpdateBook && (() => onUpdateBook({ ...node, todo: null }))} />
            )}
            {onUpdateBook && (
              <StatusFlag
                status={node.status}
                onChange={(next: EntityStatus) => onUpdateBook({ ...node, status: next })}
              />
            )}
            {workSiblings && workSiblings.length > 0 && (
              <WorkSiblingsBadge siblings={workSiblings} authorsMap={authorsMap} />
            )}
          </span>
        )}
      </div>
      <div className={TD}>
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
            onClick={(e) => { e.stopPropagation(); setEditingAuthorsNodeId(node.id) }}
          >
            {(node.authorIds ?? []).map((aid) => {
              const a = authorsMap.get(aid)
              return a ? (
                <Badge
                  key={aid}
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFocusAuthorInAuthorsTab?.(aid)
                  }}
                  title="Aller à l'auteur·ice dans la table"
                  className="cursor-pointer hover:text-white"
                >
                  {bookAuthorDisplay({ authorIds: [aid] }, authorsMap)}
                </Badge>
              ) : null
            })}
          </div>
        ) : (
          <span
            className="block min-h-[1.2em] w-full cursor-text px-0.5 text-white/42 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setEditingAuthorsNodeId(node.id) }}
          >
            {bookAuthorDisplay(node, authorsMap) || <span className="text-white/18">—</span>}
          </span>
        )}
      </div>
      <div className={TD}>
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
            onClick={(e) => { e.stopPropagation(); setEditingCell({ nodeId: node.id, field: 'year' }); setEditingValue(String(node.year || '')) }}>
            {node.year || <span className="text-white/18">—</span>}
          </span>
        )}
      </div>
      <div className="flex items-center px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <ResourceTypePicker
          value={node.resourceType ?? 'book'}
          onChange={(next) => {
            onUpdateBook?.({ ...node, resourceType: next })
            onLastEdited?.(node.id)
          }}
        />
      </div>
      <div className="px-3 py-2">
        {(() => {
          const { axes: bookAxes, themes: bookThemes } = splitBookAxes(node.axes)
          return (
            <AxisDots
              axes={bookAxes}
              themes={bookThemes}
              onChange={(newAxes) => {
                const combined = [...newAxes, ...bookThemes.map((t) => `UNCATEGORIZED:${t}`)]
                onUpdateBook?.({ ...node, axes: combined })
                onLastEdited?.(node.id)
              }}
              onRemoveTheme={(theme) => {
                const remaining = bookThemes.filter((t) => t !== theme)
                const combined = [...bookAxes, ...remaining.map((t) => `UNCATEGORIZED:${t}`)]
                onUpdateBook?.({ ...node, axes: combined })
                onLastEdited?.(node.id)
              }}
            />
          )
        })()}
      </div>
      <div className="px-3 py-2">
        <BookLinksBadge
          linkCount={linkCount}
          linkedBooks={linkedBooks}
          authorsMap={authorsMap}
          onClick={() => { onOpenLinksForBook?.(node) }}
        />
      </div>
      <div className="px-3 py-2">
        <span className="font-mono text-[0.78rem] tabular-nums text-white/30">
          {node.created_at
            ? new Date(node.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—'}
        </span>
      </div>
      <div className="px-2 py-2">
        {onOpenWorkDetail ? (
          <Button type="button" title="Ouvrir la grande fiche ressource" onClick={() => onOpenWorkDetail(node.id)} className={GRAPH_BTN}>
            <Eye size={12} className="shrink-0" />Graphe
          </Button>
        ) : (
          <Link to={{ pathname: '/', search: mapBookUrlSearch(node.id) }} target="_blank" rel="noopener noreferrer" title="Ouvrir la carte sur cette ressource (nouvel onglet, ?book=…)" className={GRAPH_BTN}>
            <Eye size={12} className="shrink-0" />Graphe
          </Link>
        )}
      </div>
    </div>
  )
}

export const BooksTabBookRow = memo(BooksTabBookRowImpl)

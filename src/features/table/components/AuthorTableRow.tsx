import clsx from 'clsx'
import { BookPlus, Check } from 'lucide-react'
import { authorName } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { StatusFlag } from '@/common/components/StatusFlag'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT, TD } from '../tableConstants'
import { AuthorBooksBadge } from './AuthorBooksBadge'
import { TodoNotePopover } from './TodoNotePopover'
import type { Author, AuthorId, Book, EntityStatus } from '@/types/domain'

type Props = {
  author: Author
  index: number
  justAdded?: boolean
  isSelected: boolean
  focusAuthorId?: AuthorId | null
  bookCount: number
  books?: Book[]
  editingCell: { authorId: AuthorId; field: 'firstName' | 'lastName' } | null
  editingValue: string
  setEditingValue: (v: string) => void
  setEditingCell: (v: { authorId: AuthorId; field: 'firstName' | 'lastName' } | null) => void
  commitEdit: () => void
  toggleRow: (id: AuthorId) => void
  onAddBookForAuthor?: (author: Author) => unknown
  onUpdateAuthor?: (author: Author) => unknown
}

export function AuthorTableRow({
  author,
  index,
  justAdded,
  isSelected,
  focusAuthorId,
  bookCount,
  books,
  editingCell,
  editingValue,
  setEditingValue,
  setEditingCell,
  commitEdit,
  toggleRow,
  onAddBookForAuthor,
  onUpdateAuthor,
}: Props) {
  const isEditFirst = editingCell?.authorId === author.id && editingCell?.field === 'firstName'
  const isEditLast = editingCell?.authorId === author.id && editingCell?.field === 'lastName'

  return (
    <tr
      data-author-row-id={author.id}
      className={clsx(
        'group cursor-pointer border-b border-white/4 transition-colors',
        justAdded && 'animate-flash-row',
        focusAuthorId === author.id && 'bg-cyan/8 ring-1 ring-cyan/45',
        isSelected ? 'bg-green/[0.025]' : index % 2 === 0 ? 'bg-white/[0.003]' : '',
        'hover:bg-white/2.5',
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, a')) return
        toggleRow(author.id)
      }}
    >
      {/* Checkbox */}
      <td className="px-3 py-2">
        <Button
          type="button"
          onClick={() => toggleRow(author.id)}
          className={clsx(
            'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
            isSelected
              ? 'border-green bg-green/18 text-green'
              : 'border-white/14 text-transparent hover:border-white/28',
          )}
        >
          <Check size={9} />
        </Button>
      </td>

      {/* Nom */}
      <td className={TD}>
        {isEditLast ? (
          <TextInput
            variant="table"
            autoFocus
            className={INPUT}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditingCell(null)
            }}
          />
        ) : (
          <span className="flex items-center">
            <span
              className="block min-h-[1.2em] cursor-text px-0.5 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                setEditingCell({ authorId: author.id, field: 'lastName' })
                setEditingValue(author.lastName || '')
              }}
            >
              {author.lastName ? author.lastName.toUpperCase() : <span className="text-white/18">—</span>}
            </span>
            {author.todo && (
              <TodoNotePopover
                note={author.todo}
                iconClassName="ml-1.5 text-amber/50"
                onClear={onUpdateAuthor ? () => onUpdateAuthor({ ...author, todo: null }) : undefined}
              />
            )}
            {onUpdateAuthor && (
              <StatusFlag
                status={author.status}
                onChange={(next: EntityStatus) => onUpdateAuthor({ ...author, status: next })}
              />
            )}
          </span>
        )}
      </td>

      {/* Prénom */}
      <td className={TD}>
        {isEditFirst ? (
          <TextInput
            variant="table"
            autoFocus
            className={INPUT}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditingCell(null)
            }}
          />
        ) : (
          <span
            className="block min-h-[1.2em] cursor-text px-0.5 text-white/55 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              setEditingCell({ authorId: author.id, field: 'firstName' })
              setEditingValue(author.firstName || '')
            }}
          >
            {author.firstName || <span className="text-white/18">—</span>}
          </span>
        )}
      </td>

      {/* Compte ressources */}
      <td className="px-3 py-2">
        <AuthorBooksBadge bookCount={bookCount} books={books} />
      </td>

      {/* Date d'ajout */}
      <td className="px-3 py-2">
        <span className="font-mono text-[0.78rem] tabular-nums text-white/30">
          {author.created_at
            ? new Date(author.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—'}
        </span>
      </td>

      {/* Ajouter une ressource */}
      <td className="px-3 py-2 text-right">
        {onAddBookForAuthor && (
          <Button
            type="button"
            title={`Ajouter une ressource pour ${authorName(author)}`}
            onClick={() => onAddBookForAuthor(author)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/8 px-1.5 py-0.5 text-micro font-semibold text-white/65 opacity-100 transition-all hover:border-cyan/35 hover:text-cyan/85"
          >
            <BookPlus size={10} /> Ressource
          </Button>
        )}
      </td>
    </tr>
  )
}

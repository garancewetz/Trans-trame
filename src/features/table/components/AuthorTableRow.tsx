import { AlertTriangle, BookPlus, Check, ClipboardList } from 'lucide-react'
import { authorName } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT, TD } from '../tableConstants'
import type { Author, AuthorId } from '@/types/domain'

type Props = {
  author: Author
  index: number
  justAdded?: boolean
  isSelected: boolean
  focusAuthorId?: AuthorId | null
  bookCount: number
  editingCell: { authorId: AuthorId; field: 'firstName' | 'lastName' } | null
  editingValue: string
  setEditingValue: (v: string) => void
  setEditingCell: (v: { authorId: AuthorId; field: 'firstName' | 'lastName' } | null) => void
  commitEdit: () => void
  toggleRow: (id: AuthorId) => void
  onAddBookForAuthor?: (author: Author) => unknown
}

export function AuthorTableRow({
  author,
  index,
  justAdded,
  isSelected,
  focusAuthorId,
  bookCount,
  editingCell,
  editingValue,
  setEditingValue,
  setEditingCell,
  commitEdit,
  toggleRow,
  onAddBookForAuthor,
}: Props) {
  const isEditFirst = editingCell?.authorId === author.id && editingCell?.field === 'firstName'
  const isEditLast = editingCell?.authorId === author.id && editingCell?.field === 'lastName'

  return (
    <tr
      data-author-row-id={author.id}
      className={[
        'group cursor-pointer border-b border-white/4 transition-colors',
        justAdded ? 'animate-flash-row' : '',
        focusAuthorId === author.id ? 'bg-cyan/8 ring-1 ring-cyan/45' : '',
        isSelected ? 'bg-green/[0.025]' : index % 2 === 0 ? 'bg-white/[0.003]' : '',
        'hover:bg-white/2.5',
      ].join(' ')}
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
              <Tooltip content={author.todo}>
                <ClipboardList size={11} className="ml-1.5 shrink-0 text-amber/50" />
              </Tooltip>
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

      {/* Compte ouvrages */}
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-ui tabular-nums text-white/35">
          {bookCount > 0 ? (
            bookCount
          ) : (
            <>
              <AlertTriangle size={12} className="text-amber/70" />
              <span className="text-amber/60">0</span>
            </>
          )}
        </span>
      </td>

      {/* Date d'ajout */}
      <td className="px-3 py-2">
        <span className="font-mono text-[0.78rem] tabular-nums text-white/30">
          {author.created_at
            ? new Date(author.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—'}
        </span>
      </td>

      {/* Ajouter un ouvrage */}
      <td className="px-3 py-2 text-right">
        {onAddBookForAuthor && (
          <Button
            type="button"
            title={`Ajouter un ouvrage pour ${authorName(author)}`}
            onClick={() => onAddBookForAuthor(author)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/8 px-1.5 py-0.5 text-micro font-semibold text-white/65 opacity-100 transition-all hover:border-cyan/35 hover:text-cyan/85"
          >
            <BookPlus size={10} /> Ouvrage
          </Button>
        )}
      </td>
    </tr>
  )
}

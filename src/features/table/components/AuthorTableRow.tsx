import { BookPlus, Check } from 'lucide-react'
import { authorName } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT, TD } from '../tableConstants'
import type { Author, AuthorId } from '@/types/domain'

type Props = {
  author: Author
  index: number
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
        'group border-b border-white/4 transition-colors',
        focusAuthorId === author.id ? 'bg-[rgba(140,220,255,0.08)] ring-1 ring-[rgba(140,220,255,0.45)]' : '',
        isSelected ? 'bg-[rgba(0,255,135,0.025)]' : index % 2 === 0 ? 'bg-white/[0.003]' : '',
        'hover:bg-white/2.5',
      ].join(' ')}
    >
      {/* Checkbox */}
      <td className="px-3 py-2">
        <Button
          type="button"
          onClick={() => toggleRow(author.id)}
          className={[
            'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
            isSelected
              ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
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
          <span
            className="block min-h-[1.2em] cursor-text px-0.5 hover:text-white"
            onClick={() => {
              setEditingCell({ authorId: author.id, field: 'lastName' })
              setEditingValue(author.lastName || '')
            }}
          >
            {author.lastName ? author.lastName.toUpperCase() : <span className="text-white/18">—</span>}
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
            onClick={() => {
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
        <span className="font-mono text-[0.75rem] tabular-nums text-white/35">
          {bookCount || <span className="text-white/18">—</span>}
        </span>
      </td>

      {/* Ajouter un ouvrage */}
      <td className="px-3 py-2 text-right">
        {onAddBookForAuthor && (
          <Button
            type="button"
            title={`Ajouter un ouvrage pour ${authorName(author)}`}
            onClick={() => onAddBookForAuthor(author)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/8 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white/65 opacity-100 transition-all hover:border-[rgba(140,220,255,0.35)] hover:text-[rgba(140,220,255,0.85)]"
          >
            <BookPlus size={10} /> Ouvrage
          </Button>
        )}
      </td>
    </tr>
  )
}

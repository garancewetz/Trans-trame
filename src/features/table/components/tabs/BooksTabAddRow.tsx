import { Plus } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../../tableConstants'
import { AxisDots, AuthorPicker } from '../TableSubcomponents'
import type { Author, AuthorId } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'
import type { RefObject } from 'react'

type Props = {
  authors: Author[]
  inputTitle: string
  setInputTitle: (v: string) => void
  inputAuthorIds: AuthorId[]
  setInputAuthorIds: (v: AuthorId[]) => void
  inputYear: string
  setInputYear: (v: string) => void
  inputAxes: Axis[]
  setInputAxes: (v: Axis[]) => void
  titleInputRef: RefObject<HTMLInputElement | null>
  onAddBookRow: () => void
  onAddAuthor?: (author: Author) => unknown
}

export function BooksTabAddRow({
  authors,
  inputTitle,
  setInputTitle,
  inputAuthorIds,
  setInputAuthorIds,
  inputYear,
  setInputYear,
  inputAxes,
  setInputAxes,
  titleInputRef,
  onAddBookRow,
  onAddAuthor,
}: Props) {
  return (
    <tr className="border-b border-cyan/20 bg-bg-overlay shadow-[0_-1px_0_var(--color-bg-overlay)]">
      <td className="bg-cyan/6 px-3 py-1.5 align-bottom text-center">
        <Plus size={11} className="mb-1.5 text-cyan/60" />
      </td>
      <td className="bg-cyan/6 min-w-0 max-w-36 px-2 py-1.5 align-bottom">
        <span className="mb-0.5 block text-[0.65rem] font-semibold uppercase tracking-[1.2px] text-cyan/50">Nouvel ouvrage</span>
        <TextInput
          variant="table"
          ref={titleInputRef}
          className={INPUT}
          placeholder="Saisir un titre…"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddBookRow()}
        />
      </td>
      <td className="bg-cyan/6 px-2 py-1.5 align-bottom">
        <AuthorPicker
          authors={authors}
          selectedAuthorIds={inputAuthorIds}
          onChange={setInputAuthorIds}
          onAddAuthor={onAddAuthor}
        />
      </td>
      <td className="bg-cyan/6 px-2 py-1.5 align-bottom">
        <TextInput
          variant="table"
          className={INPUT}
          type="number"
          placeholder="Année"
          value={inputYear}
          onChange={(e) => setInputYear(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddBookRow()}
        />
      </td>
      <td className="bg-cyan/6 px-3 py-1.5 align-bottom">
        <div className="flex items-center gap-2.5">
          <AxisDots axes={inputAxes} onChange={setInputAxes} />
          <Button
            type="button"
            onClick={onAddBookRow}
            disabled={!inputTitle.trim()}
            className="shrink-0 cursor-pointer rounded-md border border-cyan/35 bg-cyan/12 px-2 py-1 text-caption font-semibold text-cyan/85 transition-all hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-25"
          >
            + Ajouter
          </Button>
        </div>
      </td>
      <td />
      <td />
    </tr>
  )
}

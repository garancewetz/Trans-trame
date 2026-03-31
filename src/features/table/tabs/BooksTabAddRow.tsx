import { Plus } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../tableConstants'
import { AxisDots, AuthorPicker } from '../TableSubcomponents'
import type { Author, AuthorId } from '@/domain/types'
import type { Axis } from '@/lib/categories'
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
    <tr className="border-b border-[rgba(140,220,255,0.1)] bg-[rgba(140,220,255,0.02)]">
      <td className="px-3 py-1.5 text-center">
        <Plus size={11} className="text-[rgba(140,220,255,0.35)]" />
      </td>
      <td className="px-2 py-1.5">
        <TextInput
          variant="table"
          ref={titleInputRef}
          className={INPUT}
          placeholder="Titre *"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddBookRow()}
        />
      </td>
      <td className="px-2 py-1.5">
        <AuthorPicker
          authors={authors}
          selectedAuthorIds={inputAuthorIds}
          onChange={setInputAuthorIds}
          onAddAuthor={onAddAuthor}
        />
      </td>
      <td className="px-2 py-1.5">
        <TextInput
          variant="table"
          className={INPUT}
          type="number"
          placeholder="1984"
          value={inputYear}
          onChange={(e) => setInputYear(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddBookRow()}
        />
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2.5">
          <AxisDots axes={inputAxes} onChange={setInputAxes} />
          <Button
            type="button"
            onClick={onAddBookRow}
            disabled={!inputTitle.trim()}
            className="shrink-0 cursor-pointer rounded-md border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] px-2 py-1 text-[0.65rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
          >
            + Ajouter
          </Button>
        </div>
      </td>
      <td />
    </tr>
  )
}

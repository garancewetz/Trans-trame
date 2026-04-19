import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { BOOKS_GRID_STYLE, INPUT } from '../../tableConstants'
import { AxisDots } from '../AxisDots'
import { AuthorPicker } from '../AuthorPicker'
import { ResourceTypePicker } from '../ResourceTypePicker'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import type { Axis } from '@/common/utils/categories'

type Props = {
  authors: Author[]
  initialAuthorIds?: AuthorId[]
  autoFocus?: boolean
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => unknown
  onAddAuthor?: (author: Author) => unknown
  onBookAdded?: (bookId: BookId) => void
}

export function BooksTabAddRow({
  authors,
  initialAuthorIds = [],
  autoFocus = false,
  onAddBook,
  onAddAuthor,
  onBookAdded,
}: Props) {
  const [title, setTitle] = useState('')
  const [authorIds, setAuthorIds] = useState<AuthorId[]>(initialAuthorIds)
  const [year, setYear] = useState('')
  const [axes, setAxes] = useState<Axis[]>([])
  const [resourceType, setResourceType] = useState('book')
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (autoFocus) setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [autoFocus])

  const handleAdd = useCallback(() => {
    const t = title.trim()
    if (!t) return
    const newId = crypto.randomUUID()
    onAddBook?.({
      id: newId,
      title: t,
      authorIds,
      year: parseInt(year, 10) || null,
      axes,
      description: '',
      originalTitle: null,
      resourceType,
    })
    setTitle('')
    setYear('')
    setAxes([])
    setResourceType('book')
    onBookAdded?.(newId)
    setTimeout(() => {
      titleInputRef.current?.focus()
      const el = document.querySelector(`[data-book-row-id="${newId}"]`)
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!fullyVisible) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 50)
  }, [title, authorIds, year, axes, onAddBook, onBookAdded])

  return (
    <div
      style={BOOKS_GRID_STYLE}
      className="grid h-11 items-center border-b border-cyan/20 bg-bg-overlay shadow-[0_-1px_0_var(--color-bg-overlay)]"
    >
      <div className="flex h-full items-center justify-center bg-cyan/6 px-3">
        <Plus size={11} className="text-cyan/60" />
      </div>
      <div className="flex h-full items-center justify-center bg-cyan/6 px-2">
        <ResourceTypePicker value={resourceType} onChange={setResourceType} />
      </div>
      <div className="flex h-full min-w-0 max-w-full items-center bg-cyan/6 px-2">
        <TextInput
          variant="table"
          ref={titleInputRef}
          className={INPUT}
          placeholder="Saisir un titre…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>
      <div className="flex h-full items-center bg-cyan/6 px-2">
        <AuthorPicker
          authors={authors}
          selectedAuthorIds={authorIds}
          onChange={setAuthorIds}
          onAddAuthor={onAddAuthor}
        />
      </div>
      <div className="flex h-full items-center bg-cyan/6 px-2">
        <TextInput
          variant="table"
          className={INPUT}
          type="number"
          placeholder="Année"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>
      <div className="flex h-full items-center bg-cyan/6 px-3">
        <AxisDots axes={axes} onChange={setAxes} compact />
      </div>
      <div className="flex h-full items-center justify-end gap-2 bg-cyan/6 px-3" style={{ gridColumn: 'span 3' }}>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!title.trim()}
          className="shrink-0 cursor-pointer rounded-md border border-cyan/35 bg-cyan/12 px-2 py-1 text-caption font-semibold text-cyan/85 transition-all hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-25"
        >
          + Ajouter
        </Button>
      </div>
    </div>
  )
}

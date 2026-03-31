import type { Dispatch, SetStateAction } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Book, BookId, Link } from '@/types/domain'
import type { BookFormValues, BookRecentDraft } from '../components/BookForm'

type LinkFormValues = {
  citationText: string
  edition: string
  page: string
  context: string
}

type Args = {
  bookForm: UseFormReturn<BookFormValues>
  linkForm: UseFormReturn<LinkFormValues>
  editNode: Book | null | undefined
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onUpdateBook?: (book: Book) => void
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
  sourceId: string
  targetIds: string[]
  setTargetIds: (ids: string[]) => void
  setTargetSearch: (q: string) => void
  setRecentQueue: Dispatch<SetStateAction<BookRecentDraft[]>>
}

export function useAddBookFormActions({
  bookForm,
  linkForm,
  editNode,
  onAddBook,
  onUpdateBook,
  onAddLink,
  sourceId,
  targetIds,
  setTargetIds,
  setTargetSearch,
  setRecentQueue,
}: Args) {
  const submitAddBook = (data: BookFormValues) => {
    if (!data.title.trim() || !data.authorIds?.length) return
    const book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'> = {
      id: crypto.randomUUID(),
      type: 'book',
      title: data.title.trim(),
      authorIds: data.authorIds,
      year: parseInt(String(data.year), 10) || null,
      axes: data.axes || [],
      description: (data.description || '').trim(),
    }
    onAddBook?.(book)
    setRecentQueue((prev) =>
      [
        {
          title: book.title,
          authorIds: book.authorIds ?? [],
          year: book.year ?? null,
        },
        ...prev,
      ].slice(0, 3),
    )
    bookForm.reset({
      title: '',
      authorIds: data.stickyAuthor ? [...data.authorIds] : [],
      year: '',
      axes: [],
      description: '',
      stickyAuthor: data.stickyAuthor,
    })
  }

  const submitEditBook = (data: BookFormValues) => {
    if (!editNode || !data.title.trim() || !data.authorIds?.length) return
    onUpdateBook?.({
      ...editNode,
      title: data.title.trim(),
      authorIds: data.authorIds,
      year: parseInt(String(data.year), 10) || null,
      axes: data.axes || [],
      description: (data.description || '').trim(),
    })
  }

  const submitAddLink = (data: LinkFormValues) => {
    if (!sourceId || targetIds.length === 0) return
    const validTargets = targetIds.filter((tid) => tid !== sourceId)
    if (validTargets.length === 0) return
    validTargets.forEach((tid) => {
      onAddLink?.({
        source: sourceId,
        target: tid,
        citation_text: (data.citationText || '').trim(),
        edition: (data.edition || '').trim(),
        page: (data.page || '').trim(),
        context: (data.context || '').trim(),
      })
    })
    setTargetIds([])
    setTargetSearch('')
    linkForm.reset({ citationText: '', edition: '', page: '', context: '' })
  }

  const toggleAxis = (axis: string) => {
    const cur = bookForm.getValues('axes') || []
    bookForm.setValue(
      'axes',
      cur.includes(axis) ? cur.filter((a) => a !== axis) : [...cur, axis],
      { shouldDirty: true },
    )
  }

  return { submitAddBook, submitEditBook, submitAddLink, toggleAxis }
}

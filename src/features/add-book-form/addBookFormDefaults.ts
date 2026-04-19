import type { AuthorId, Book } from '@/types/domain'
import type { BookFormValues } from './components/BookForm'

type BookPrefill = { authorIds?: AuthorId[] }

type Mode = 'book' | 'edit' | 'link'

export function bookDefaultValues(
  mode: Mode,
  editNode: Book | null | undefined,
  bookPrefill: BookPrefill | null,
): BookFormValues {
  if (mode === 'edit' && editNode) {
    return {
      title: editNode.title || '',
      authorIds: Array.isArray(editNode.authorIds) ? [...editNode.authorIds] : [],
      year: String(editNode.year || ''),
      axes: Array.isArray(editNode.axes) ? editNode.axes : [],
      description: editNode.description || '',
      stickyAuthor: false,
      resourceType: editNode.resourceType || 'book',
    }
  }
  return {
    title: '',
    authorIds: bookPrefill?.authorIds ? [...bookPrefill.authorIds] : [],
    year: '',
    axes: [],
    description: '',
    stickyAuthor: false,
    resourceType: 'book',
  }
}

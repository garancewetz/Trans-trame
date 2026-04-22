import type { Author, AuthorId, Book, BookId, CreateLinkInput, Link } from '@/types/domain'
import type { TablesUpdate } from '@/types/supabase'

export type TableViewProps = {
  nodes: Book[]
  links: Link[]
  authors: Author[]
  authorNotDuplicatePairs?: Array<[string, string]>
  onAddLink?: (link: CreateLinkInput) => unknown
  onAddLinks?: (links: CreateLinkInput[]) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onUpdateLink?: (linkId: string, updatedFields: TablesUpdate<'links'>) => unknown
  onAddCitation?: (linkId: string, fields: { citation_text?: string; edition?: string; page?: string; context?: string }) => unknown
  onUpdateCitation?: (citationId: string, fields: { citation_text?: string; edition?: string; page?: string; context?: string }) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  onMarkAuthorsNotDuplicate?: (a: AuthorId, b: AuthorId) => void
  initialLinkSourceId?: BookId | null
  initialFocusBookId?: BookId | null
}

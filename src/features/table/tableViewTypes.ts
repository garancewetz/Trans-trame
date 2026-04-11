import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'
import type { TablesUpdate } from '@/types/supabase'

export type TableViewProps = {
  nodes: Book[]
  links: Link[]
  authors: Author[]
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onUpdateLink?: (linkId: string, updatedFields: TablesUpdate<'links'>) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  initialTab?: 'books' | 'authors' | 'links' | 'history'
  initialLinkSourceId?: BookId | null
  initialFocusBookId?: BookId | null
}

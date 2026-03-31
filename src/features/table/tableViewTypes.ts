import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'

export type TableViewProps = {
  nodes: Book[]
  links: Link[]
  authors: Author[]
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onUpdateLink?: (linkId: string, updatedFields: Partial<Link>) => unknown
  onDeleteLink?: (linkId: string) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onUpdateAuthor?: (author: Author) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<{ newAuthors: number; updatedBooks: number } | null> | { newAuthors: number; updatedBooks: number } | null
  onClose?: () => void
  onLastEdited?: (bookId: BookId) => void
  initialTab?: 'books' | 'authors' | 'links'
  initialLinkSourceId?: BookId | null
  onImportComplete?: (nodeIds: BookId[]) => void
}

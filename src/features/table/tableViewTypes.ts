import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'

export type TableViewProps = {
  nodes: Book[]
  links: Link[]
  authors: Author[]
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onUpdateLink?: (linkId: string, updatedFields: Partial<Link>) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  initialTab?: 'books' | 'authors' | 'links'
  initialLinkSourceId?: BookId | null
  initialFocusBookId?: BookId | null
}

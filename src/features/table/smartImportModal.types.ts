import type { Author, Book, Link } from '@/domain/types'
import type { AuthorNode } from '@/lib/authorUtils'

export type SmartImportModalProps = {
  open: boolean
  onClose: () => void
  existingNodes: Book[]
  existingAuthors?: Author[]
  authorsMap: Map<string, AuthorNode>
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onAddAuthor?: (author: Author) => void
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
  onUpdateBook?: (book: Book) => void
  onQueued?: (titles: string[]) => void
  onImportComplete?: (ids: string[]) => void
}

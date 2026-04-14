import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Author, Book, BookId, Link } from '@/types/domain'

export type ResolvedLink = Link & {
  _srcId?: string
  _tgtId?: string
  sourceNode?: Book | null
  targetNode?: Book | null
}

export type LinkGroup = { srcId?: string; sourceNode?: Book | null; links: ResolvedLink[] }

export type LinksTabProps = {
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  linkSourceNode: Book | null
  setLinkSourceNode: (node: Book | null) => void
  linkDirection: 'source' | 'cited'
  setLinkDirection: (dir: 'source' | 'cited') => void
  setLinkCheckedIds: (next: Set<BookId>) => void
  checklistSearch: string
  setChecklistSearch: (value: string) => void
  checklistNodes: Book[]
  existingTargetIds: Set<BookId>
  linkCheckedIds: Set<BookId>
  toggleChecklist: (id: BookId) => void
  newLinksCount: number
  handleTisser: () => void
  groupedLinks: LinkGroup[]
  linkSearch: string
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (value: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  deletingLinkId: string | null
  setDeletingLinkId: (id: string | null) => void
  onDeleteLink: (linkId: string) => void
  onOpenWorkDetail?: (bookId: BookId) => void
  authors?: Author[]
  onAddAuthor?: (author: Author) => void
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onSmartImportFrom?: (book: Book) => void
}

export type LinkEditingProps = {
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (v: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  deletingLinkId: string | null
  setDeletingLinkId: (id: string | null) => void
  onDeleteLink: (linkId: string) => void
  onOpenWorkDetail?: (bookId: BookId) => void
}

import type { Author, Book, BookId, Link } from '@/domain/types'
import type { TableViewProps } from '@/features/table/TableView'

/** Props pour `<TableView />` (mode tableau plein écran). */
export function useAppTableViewProps({
  books,
  links,
  authors,
  selectedNode,
  tableInitialTab,
  tableLinkSourceId,
  lastEditedNodeId,
  setLastEditedNodeId,
  setSelectedNode,
  setPanelTab,
  setTableMode,
  setTableInitialTab,
  setTableLinkSourceId,
  setFlashNodeIds,
  handleAddBook,
  handleAddLink,
  handleAddAuthor,
  handleUpdateAuthor,
  handleDeleteAuthor,
  handleMigrateData,
  handleUpdateBook,
  handleDeleteBook,
  handleUpdateLink,
  handleDeleteLink,
  handleMergeBooks,
}: {
  books: Book[]
  links: Link[]
  authors: Author[]
  selectedNode: Book | null
  tableInitialTab: string
  tableLinkSourceId: string | null
  lastEditedNodeId: string | null
  setLastEditedNodeId: (id: string | null) => void
  setSelectedNode: (n: Book | null) => void
  setPanelTab: (t: string) => void
  setTableMode: (v: boolean) => void
  setTableInitialTab: (t: string) => void
  setTableLinkSourceId: (id: string | null) => void
  setFlashNodeIds: (ids: Set<string> | null) => void
  handleAddBook: (book: Book | (Partial<Book> & Pick<Book, 'id' | 'title'>)) => void
  handleAddLink: (link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)) => void
  handleAddAuthor: (author: Author) => void
  handleUpdateAuthor: (author: Author) => void
  handleDeleteAuthor: (authorId: string) => void
  handleMigrateData:
    | (() => Promise<{ newAuthors: number; updatedBooks: number } | null>)
    | (() => { newAuthors: number; updatedBooks: number } | null)
    | undefined
  handleUpdateBook: (n: Book) => void
  handleDeleteBook: (nodeId: string) => boolean
  handleUpdateLink: (linkId: string, updatedFields: Partial<Link>) => void
  handleDeleteLink: (linkId: string) => void
  handleMergeBooks: (fromNodeId: BookId, intoNodeId: BookId) => boolean
}): TableViewProps {
  return {
    nodes: books,
    links,
    authors,
    onAddBook: handleAddBook,
    onAddLink: handleAddLink,
    onAddAuthor: handleAddAuthor,
    onUpdateAuthor: handleUpdateAuthor,
    onDeleteAuthor: handleDeleteAuthor,
    onMigrateData: handleMigrateData,
    onUpdateBook: (n) => {
      handleUpdateBook(n)
      setLastEditedNodeId(n.id)
    },
    onDeleteBook: (nodeId) => {
      handleDeleteBook(nodeId)
      if (selectedNode?.id === nodeId) setSelectedNode(null)
    },
    onUpdateLink: handleUpdateLink,
    onDeleteLink: handleDeleteLink,
    onMergeBooks: (fromNodeId, intoNodeId) => {
      const merged = handleMergeBooks(fromNodeId, intoNodeId)
      if (!merged) return
      const intoNode = books.find((n) => n.id === intoNodeId)
      setSelectedNode(intoNode || null)
      setPanelTab('details')
    },
    onClose: () => {
      setTableMode(false)
      setTableInitialTab('books')
      setTableLinkSourceId(null)
      if (lastEditedNodeId) {
        const node = books.find((n) => n.id === lastEditedNodeId)
        if (node) {
          setSelectedNode(node)
          setPanelTab('details')
        }
        setLastEditedNodeId(null)
      }
    },
    onLastEdited: (nodeId) => setLastEditedNodeId(nodeId),
    onImportComplete: (nodeIds) => {
      const ids = new Set(nodeIds)
      setFlashNodeIds(ids)
      setTimeout(() => setFlashNodeIds(null), 4000)
    },
    initialTab: tableInitialTab as TableViewProps['initialTab'],
    initialLinkSourceId: tableLinkSourceId,
  }
}

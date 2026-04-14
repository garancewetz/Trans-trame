import type { Author, Book, Link } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { useAppMutations } from '@/core/AppDataContext'
import type { useSelection } from '@/core/SelectionContext'
import type { useTableUi } from '@/core/TableUiContext'
import type { useTableViewController } from './useTableViewController'

type Deps = {
  books: Book[]
  mutations: ReturnType<typeof useAppMutations>
  selection: ReturnType<typeof useSelection>
  tableUi: Pick<
    ReturnType<typeof useTableUi>,
    | 'setTableMode'
    | 'setTableInitialTab'
    | 'setTableLinkSourceId'
    | 'lastEditedNodeId'
    | 'setLastEditedNodeId'
    | 'setFlashNodeIds'
  >
  controller: Pick<
    ReturnType<typeof useTableViewController>,
    'authorsMap' | 'setSearch' | 'setBooksPrefill' | 'setTab'
  >
}

export function useTableViewCallbacks({ books, mutations, selection, tableUi, controller }: Deps) {
  const onClose = () => {
    tableUi.setTableMode(false)
    tableUi.setTableInitialTab('books')
    tableUi.setTableLinkSourceId(null)
    if (tableUi.lastEditedNodeId) {
      const node = books.find((n) => n.id === tableUi.lastEditedNodeId)
      if (node) {
        selection.setSelectedNode(node)
        selection.setPanelTab('details')
      }
      tableUi.setLastEditedNodeId(null)
    }
  }

  const onLastEdited = (nodeId: string) => tableUi.setLastEditedNodeId(nodeId)

  const onImportComplete = (nodeIds: string[]) => {
    const ids = new Set(nodeIds)
    tableUi.setFlashNodeIds(ids)
    setTimeout(() => tableUi.setFlashNodeIds(null), 4000)
  }

  const openBookInSidePanel = (bookId: string) => {
    const node = books.find((n) => n.id === bookId)
    if (!node) return
    selection.setSelectedLink(null)
    selection.setLinkContextNode(null)
    selection.selectNode(node)
    tableUi.setTableMode(false)
  }

  const onUpdateBookWithTracking = (n: Book) => {
    mutations.handleUpdateBook(n)
    tableUi.setLastEditedNodeId(n.id)
  }

  const onDeleteBookWithCleanup = (nodeId: string) => {
    mutations.handleDeleteBook(nodeId)
    if (selection.selectedNode?.id === nodeId) selection.setSelectedNode(null)
  }

  const onMergeBooksWithCleanup = (fromNodeId: string, intoNodeId: string) => {
    const merged = mutations.handleMergeBooks(fromNodeId, intoNodeId)
    if (!merged) return
    const intoNode = books.find((n) => n.id === intoNodeId)
    selection.setSelectedNode(intoNode || null)
    selection.setPanelTab('details')
  }

  const onAddBookForAuthor = (author: Author) => {
    const authorLabel = bookAuthorDisplay(
      { authorIds: [author.id] },
      controller.authorsMap,
    )
    controller.setSearch(authorLabel)
    controller.setBooksPrefill({ nonce: crypto.randomUUID(), authorId: author.id })
    controller.setTab('books')
  }

  return {
    onClose,
    onLastEdited,
    onImportComplete,
    openBookInSidePanel,
    onUpdateBookWithTracking,
    onDeleteBookWithCleanup,
    onMergeBooksWithCleanup,
    onAddBookForAuthor,
  }
}

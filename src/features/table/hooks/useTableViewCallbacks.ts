import { useNavigate } from 'react-router-dom'
import type { Author, Book } from '@/types/domain'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { mapBookUrlSearch } from '@/common/utils/bookSlug'
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
  const navigate = useNavigate()

  const onClose = () => {
    const editedId = tableUi.lastEditedNodeId
    tableUi.setLastEditedNodeId(null)
    if (editedId && books.some((n) => n.id === editedId)) {
      navigate({ pathname: '/', search: `?${mapBookUrlSearch(editedId)}` })
      return
    }
    navigate('/')
  }

  const onLastEdited = (nodeId: string) => tableUi.setLastEditedNodeId(nodeId)

  const onImportComplete = (nodeIds: string[]) => {
    const ids = new Set(nodeIds)
    tableUi.setFlashNodeIds(ids)
    setTimeout(() => tableUi.setFlashNodeIds(null), 4000)
  }

  const openBookInSidePanel = (bookId: string) => {
    if (!books.some((n) => n.id === bookId)) return
    navigate({ pathname: '/', search: `?${mapBookUrlSearch(bookId)}` })
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

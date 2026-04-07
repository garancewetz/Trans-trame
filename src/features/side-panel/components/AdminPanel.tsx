import type { Author, Book, BookId, GraphData, Link } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { AddBookForm } from '../../add-book-form/components/AddBookForm'

type AdminPanelProps = {
  panelTab: string
  selectedNode: Book | null
  previousPanelTab: string
  graphData: GraphData
  authors: Author[]
  handleAddBook: (book: Book) => void
  handleAddLink: (link: Link) => void
  handleAddAuthor: (author: Author) => void
  handleUpdateBook: (n: Book) => void
  handleDeleteBook: (nodeId: BookId) => void
  handleMergeBooks: (fromNodeId: BookId, intoNodeId: BookId) => void
  setPanelTab: (t: string) => void
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  handleClosePanel: () => void
  authorsMap: Map<string, AuthorNode>
}

export function AdminPanel({
  panelTab,
  selectedNode,
  previousPanelTab,
  graphData,
  authors,
  handleAddBook,
  handleAddLink,
  handleAddAuthor,
  handleUpdateBook,
  handleDeleteBook,
  handleMergeBooks,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  handleClosePanel,
  authorsMap,
}: AdminPanelProps) {
  return (
    <div className="px-6 pb-8 pt-12">
      <AddBookForm
        key={`${panelTab}-${selectedNode?.id || ''}`}
        nodes={graphData.nodes}
        authors={authors}
        onAddAuthor={handleAddAuthor}
        onAddBook={handleAddBook}
        onAddLink={handleAddLink}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
        onMergeBooks={handleMergeBooks}
        authorsMap={authorsMap}
        mode={panelTab}
        editNode={panelTab === 'edit' ? selectedNode : null}
        onRequestAddBook={() => {
          setSelectedNode(null)
          setSelectedLink(null)
          setPanelTab('book')
        }}
        onRequestBack={() => {
          if (previousPanelTab === 'details' && !selectedNode) {
            handleClosePanel()
            return
          }
          setPanelTab(previousPanelTab || 'details')
        }}
      />
    </div>
  )
}

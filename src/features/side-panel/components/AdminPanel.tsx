import { useSelection } from '@/core/SelectionContext'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import { AddBookForm } from '../../add-book-form/components/AddBookForm'

export function AdminPanel() {
  const {
    panelTab,
    selectedNode,
    previousPanelTab,
    setPanelTab,
    setSelectedNode,
    setSelectedLink,
    closePanel,
  } = useSelection()

  const { graphData, authors, authorsMap } = useAppData()
  const {
    handleAddBook,
    handleAddLink,
    handleAddAuthor,
    handleUpdateBook,
    handleDeleteBook,
    handleMergeBooks,
  } = useAppMutations()

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
        mode={panelTab as 'book' | 'edit' | 'link'}
        editNode={panelTab === 'edit' ? selectedNode : null}
        onRequestAddBook={() => {
          setSelectedNode(null)
          setSelectedLink(null)
          setPanelTab('book')
        }}
        onRequestBack={() => {
          if (previousPanelTab === 'details' && !selectedNode) {
            closePanel()
            return
          }
          setPanelTab(previousPanelTab || 'details')
        }}
      />
    </div>
  )
}

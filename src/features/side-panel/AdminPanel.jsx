import AddBookForm from '../add-book-form/AddBookForm'

export default function AdminPanel({
  panelTab,
  selectedNode,
  previousPanelTab,
  graphData,
  handleAddBook,
  handleAddLink,
  handleUpdateBook,
  handleDeleteBook,
  handleMergeBooks,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  handleClosePanel,
}) {
  return (
    <div className="px-6 pb-8 pt-12">
      <AddBookForm
        key={`${panelTab}-${selectedNode?.id || ''}`}
        nodes={graphData.nodes}
        onAddBook={handleAddBook}
        onAddLink={handleAddLink}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
        onMergeBooks={handleMergeBooks}
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

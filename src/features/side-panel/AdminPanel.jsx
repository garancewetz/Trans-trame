import AddBookForm from '../add-book-form/AddBookForm'

export default function AdminPanel({
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
}) {
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

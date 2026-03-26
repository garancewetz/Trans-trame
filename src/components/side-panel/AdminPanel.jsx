import AddBookForm from '../AddBookForm'

export default function AdminPanel({
  panelTab,
  selectedNode,
  prefilledSourceId,
  prefilledTargetId,
  previousPanelTab,
  graphData,
  handleAddBook,
  handleAddLink,
  handleUpdateBook,
  setPrefilledSourceId,
  setPrefilledTargetId,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  handleClosePanel,
}) {
  return (
    <div className="px-6 pb-8 pt-12">
      <AddBookForm
        key={`${panelTab}-${selectedNode?.id || ''}-${prefilledSourceId || ''}-${prefilledTargetId || ''}`}
        nodes={graphData.nodes}
        onAddBook={handleAddBook}
        onAddLink={(link) => {
          handleAddLink(link)
          setPrefilledSourceId(null)
          setPrefilledTargetId(null)
        }}
        onUpdateBook={handleUpdateBook}
        mode={panelTab}
        editNode={panelTab === 'edit' ? selectedNode : null}
        prefilledSourceId={prefilledSourceId}
        prefilledTargetId={prefilledTargetId}
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


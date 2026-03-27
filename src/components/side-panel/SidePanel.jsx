import { X } from 'lucide-react'
import AdminPanel from './AdminPanel'
import EmptyState from './EmptyState'
import LinkDetails from './LinkDetails'
import NodeDetails from './NodeDetails'

export default function SidePanel(props) {
  const { panelOpen, panelTab, selectedNode, selectedLink, handleClosePanel } = props
  const isAdminTab = panelTab === 'book' || panelTab === 'link' || panelTab === 'edit'

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-30 h-screen w-[380px] overflow-x-hidden overflow-y-auto border-l border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-2xl',
        'transform transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]',
        panelOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <button
        type="button"
        className="sticky top-0 float-right z-1 mr-3 mt-3 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
        onClick={handleClosePanel}
      >
        <X size={20} />
      </button>

      {panelTab === 'details' && selectedNode && <NodeDetails {...props} />}
      {panelTab === 'details' && selectedLink && <LinkDetails selectedLink={selectedLink} getLinkNodes={props.getLinkNodes} />}
      {isAdminTab && <AdminPanel {...props} />}
      {panelTab === 'details' && !selectedNode && !selectedLink && <EmptyState />}
    </aside>
  )
}


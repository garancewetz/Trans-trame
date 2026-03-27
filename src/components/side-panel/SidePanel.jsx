import { X, PanelRightClose } from 'lucide-react'
import AdminPanel from './AdminPanel'
import EmptyState from './EmptyState'
import LinkDetails from './LinkDetails'
import NodeDetails from './NodeDetails'

export default function SidePanel(props) {
  const {
    panelOpen,
    panelTab,
    selectedNode,
    selectedLink,
    linkContextNode,
    handleClosePanel,
    getLinkNodes,
    setPanelTab,
    setSelectedNode,
    setSelectedLink,
    setLinkContextNode,
  } = props
  const isAdminTab = panelTab === 'book' || panelTab === 'link' || panelTab === 'edit'
  const isDualPanelMode = panelTab === 'details' && Boolean(selectedNode && selectedLink && linkContextNode)
  const hasEmptyDetails = panelTab === 'details' && !selectedNode && !selectedLink
  const panelTranslateClass = !panelOpen
    ? 'translate-x-full'
    : isDualPanelMode
      ? 'translate-x-0'
      : 'translate-x-[380px]'

  const closeToContextNode = (node) => {
    if (!node) return
    setSelectedLink(null)
    setSelectedNode(node)
    setLinkContextNode(null)
    setPanelTab('details')
  }

  const openNodeFromLink = (node) => {
    if (!node) return
    setSelectedLink(null)
    setSelectedNode(node)
    setLinkContextNode(null)
    setPanelTab('details')
  }

  const handleCollapseDualPanel = () => {
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-50 h-screen w-[760px] overflow-hidden border-l border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-2xl',
        'transform transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]',
        panelTranslateClass,
      ].join(' ')}
    >
      <div
        className={[
          'grid h-full w-[760px] grid-cols-2',
          'transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]',
          'translate-x-0',
        ].join(' ')}
      >
        <div className="relative overflow-y-auto border-r border-white/10">
          <button
            type="button"
            className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
            onClick={handleClosePanel}
          >
            <X size={20} />
          </button>
          {panelTab === 'details' && selectedNode && <NodeDetails {...props} />}
          {panelTab === 'details' && !selectedNode && selectedLink && !isDualPanelMode && (
            <LinkDetails
              selectedLink={selectedLink}
              getLinkNodes={getLinkNodes}
              linkContextNode={linkContextNode}
              showBackButton={true}
              onBackToContextNode={closeToContextNode}
              onOpenNode={openNodeFromLink}
            />
          )}
          {isAdminTab && !isDualPanelMode && <AdminPanel {...props} />}
          {hasEmptyDetails && !isDualPanelMode && <EmptyState />}
        </div>
        <div className="relative overflow-y-auto">
          {isDualPanelMode && (
            <button
              type="button"
              className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
              onClick={handleCollapseDualPanel}
            >
              <PanelRightClose size={20} />
            </button>
          )}
          {isDualPanelMode && (
            <LinkDetails
              selectedLink={selectedLink}
              getLinkNodes={getLinkNodes}
              linkContextNode={linkContextNode}
              showBackButton={false}
              onBackToContextNode={closeToContextNode}
              onOpenNode={openNodeFromLink}
            />
          )}
        </div>
      </div>
    </aside>
  )
}


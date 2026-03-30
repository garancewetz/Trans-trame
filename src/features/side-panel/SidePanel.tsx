import { X, PanelRightClose } from 'lucide-react'
import Button from '../../components/ui/Button'
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
    authorsMap,
    onUpdateLink,
    onDeleteLink,
    setPanelTab,
    setSelectedNode,
    setSelectedLink,
    setLinkContextNode,
  } = props
  const isAdminTab = panelTab === 'edit'
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
        'transform transition-transform duration-300 ease-in-out',
        panelTranslateClass,
      ].join(' ')}
    >
      <div
        className={[
          'grid h-full w-[760px] grid-cols-2',
          'transition-transform duration-300 ease-in-out',
          'translate-x-0',
        ].join(' ')}
      >
        <div className="relative overflow-y-auto border-r border-white/10">
          <Button
            type="button"
            className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
            onClick={handleClosePanel}
          >
            <X size={20} />
          </Button>
          {panelTab === 'details' && selectedNode && <NodeDetails {...props} onOpenTable={props.onOpenTable} />}
          {panelTab === 'details' && !selectedNode && selectedLink && !isDualPanelMode && (
            <LinkDetails
              key={selectedLink?.id}
              selectedLink={selectedLink}
              getLinkNodes={getLinkNodes}
              linkContextNode={linkContextNode}
              authorsMap={authorsMap}
              onUpdateLink={onUpdateLink}
              onDeleteLink={onDeleteLink}
              onClosePanel={handleClosePanel}
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
            <Button
              type="button"
              className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
              onClick={handleCollapseDualPanel}
            >
              <PanelRightClose size={20} />
            </Button>
          )}
          {isDualPanelMode && (
            <LinkDetails
              key={selectedLink?.id}
              selectedLink={selectedLink}
              getLinkNodes={getLinkNodes}
              linkContextNode={linkContextNode}
              authorsMap={authorsMap}
              onUpdateLink={onUpdateLink}
              onDeleteLink={onDeleteLink}
              onClosePanel={handleClosePanel}
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


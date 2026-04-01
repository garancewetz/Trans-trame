import clsx from 'clsx'
import { X, PanelRightClose } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { AdminPanel } from './AdminPanel'
import { EmptyState } from './EmptyState'
import { LinkDetails } from './LinkDetails'
import { NodeDetails } from './NodeDetails'

export function SidePanel(props) {
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

  /** Fiche ouvrage + édition : grand panneau aligné sur l’ancienne « fiche » (modifiable). */
  const useWideBookPanel =
    panelOpen &&
    !isDualPanelMode &&
    Boolean(selectedNode) &&
    (panelTab === 'details' || panelTab === 'edit')

  const asideClass = clsx(
    'fixed right-0 top-0 z-50 h-screen overflow-hidden border-l transition-[transform,width] duration-300 ease-in-out',
    !panelOpen && 'w-[380px] translate-x-full',
    panelOpen && 'translate-x-0',
    /* Fiche + citation : ~2× la largeur fiche (s’agrandit par rapport à la fiche seule, pas 2×380px). */
    panelOpen &&
      isDualPanelMode &&
      'w-[min(100vw,84rem)] border-white/12 bg-[#06030f]/[0.98] backdrop-blur-xl shadow-[-20px_0_80px_rgba(0,0,0,0.45)]',
    panelOpen && useWideBookPanel && 'w-[min(100vw,42rem)] border-white/12 bg-[#06030f]/[0.98] backdrop-blur-xl shadow-[-20px_0_80px_rgba(0,0,0,0.45)]',
    panelOpen && !isDualPanelMode && !useWideBookPanel && 'w-[380px] border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-2xl',
  )

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
    <aside className={asideClass}>
      {isDualPanelMode ? (
        <div className="grid h-full w-full min-w-0 grid-cols-2">
          <div className="relative min-w-0 overflow-y-auto border-r border-white/10">
            <Button
              type="button"
              className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
              onClick={handleClosePanel}
            >
              <X size={20} />
            </Button>
            {panelTab === 'details' && selectedNode && <NodeDetails {...props} onOpenTable={props.onOpenTable} />}
          </div>
          <div className="relative min-w-0 overflow-y-auto">
            <Button
              type="button"
              className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
              onClick={handleCollapseDualPanel}
            >
              <PanelRightClose size={20} />
            </Button>
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
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full overflow-y-auto">
          <Button
            type="button"
            className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
            onClick={handleClosePanel}
          >
            <X size={20} />
          </Button>
          {panelTab === 'details' && selectedNode && <NodeDetails {...props} onOpenTable={props.onOpenTable} />}
          {panelTab === 'details' && !selectedNode && selectedLink && (
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
          {isAdminTab && <AdminPanel {...props} />}
          {hasEmptyDetails && <EmptyState />}
        </div>
      )}
    </aside>
  )
}

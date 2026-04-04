import clsx from 'clsx'
import { X, PanelRightClose, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { PANEL_WIDTH } from '@/common/constants/panels'
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
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const isAdminTab = panelTab === 'edit'
  const isDualPanelMode = panelTab === 'details' && Boolean(selectedNode && selectedLink && linkContextNode)
  const hasEmptyDetails = panelTab === 'details' && !selectedNode && !selectedLink

  const useWideBookPanel =
    panelOpen &&
    !isDualPanelMode &&
    Boolean(selectedNode) &&
    (panelTab === 'details' || panelTab === 'edit')

  const asideClass = clsx(
    'fixed right-0 top-0 z-50 h-screen overflow-hidden border-l transition-transform duration-300 ease-in-out',
    !panelOpen && 'translate-x-full',
    panelOpen && !panelCollapsed && 'translate-x-0',
    panelOpen && panelCollapsed && 'translate-x-[calc(100%-2.5rem)]',
    isDualPanelMode
      ? `${PANEL_WIDTH.dual} border-white/12 bg-bg-base/[0.98] backdrop-blur-xl shadow-[-20px_0_80px_rgba(0,0,0,0.45)]`
      : useWideBookPanel
        ? `${PANEL_WIDTH.book} border-white/12 bg-bg-base/[0.98] backdrop-blur-xl shadow-[-20px_0_80px_rgba(0,0,0,0.45)]`
        : `${PANEL_WIDTH.default} border-white/10 bg-bg-overlay/92 backdrop-blur-2xl`,
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
      {/* Bande collapse — colonne fixe a gauche, fond distinct */}
      {panelOpen && (
        <div
          className="absolute left-0 top-0 z-30 flex h-full w-7 cursor-pointer items-center justify-center bg-white/4 text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
          title={panelCollapsed ? 'Agrandir le panneau' : 'Reduire le panneau'}
          onClick={() => setPanelCollapsed((c) => !c)}
        >
          {panelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </div>
      )}

      {panelOpen && panelCollapsed ? null : isDualPanelMode ? (
        <div className="grid h-full w-full min-w-0 grid-cols-2 overflow-hidden pl-7">
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
        <div className="relative h-full w-full overflow-y-auto pl-7">
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
            {isAdminTab && (
              <Button
                type="button"
                title="Retour sans enregistrer"
                className="cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
                onClick={() => setPanelTab('details')}
              >
                <ArrowLeft size={18} />
              </Button>
            )}
            <Button
              type="button"
              className="cursor-pointer bg-transparent text-white/40 transition-colors hover:text-white"
              onClick={handleClosePanel}
            >
              <X size={20} />
            </Button>
          </div>
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

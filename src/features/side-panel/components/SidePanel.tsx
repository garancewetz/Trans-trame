import clsx from 'clsx'
import { X, PanelRightClose, PanelRightOpen, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { PANEL_WIDTH } from '@/common/constants/panels'
import { useSelection } from '@/core/SelectionContext'
import { AdminPanel } from './AdminPanel'
import { EmptyState } from './EmptyState'
import { LinkDetails } from './LinkDetails'
import { NodeDetails } from './NodeDetails'

export function SidePanel() {
  const {
    panelOpen,
    panelTab,
    selectedNode,
    selectedLink,
    linkContextNode,
    setPanelTab,
    setSelectedLink,
    setLinkContextNode,
    closePanel,
  } = useSelection()

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

  const handleCollapseDualPanel = () => {
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }

  return (
    <aside className={asideClass}>
      {/* Collapsed state: explicit expand handle sticking out from the left edge */}
      {panelOpen && panelCollapsed && (
        <button
          type="button"
          className="absolute left-0 top-0 z-30 flex h-full w-10 cursor-pointer items-center justify-center border-r border-white/15 bg-white/8 text-white/70 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
          title="Agrandir le panneau"
          aria-label="Agrandir le panneau"
          onClick={() => setPanelCollapsed(false)}
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {panelOpen && panelCollapsed ? null : isDualPanelMode ? (
        <div className="grid h-full w-full min-w-0 grid-cols-2 overflow-hidden">
          <div className="relative min-w-0 overflow-y-auto border-r border-white/10">
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
              <Button
                type="button"
                title="Réduire le panneau"
                aria-label="Réduire le panneau"
                className="cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
                onClick={() => setPanelCollapsed(true)}
              >
                <PanelRightOpen size={18} />
              </Button>
              <Button
                type="button"
                title="Fermer"
                aria-label="Fermer"
                className="cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
                onClick={closePanel}
              >
                <X size={20} />
              </Button>
            </div>
            {panelTab === 'details' && selectedNode && <NodeDetails />}
          </div>
          <div className="relative min-w-0 overflow-y-auto">
            <Button
              type="button"
              title="Fermer le détail du lien"
              aria-label="Fermer le détail du lien"
              className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
              onClick={handleCollapseDualPanel}
            >
              <PanelRightClose size={20} />
            </Button>
            <LinkDetails
              key={selectedLink?.id}
              showBackButton={false}
            />
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full overflow-y-auto">
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
            {isAdminTab && (
              <Button
                type="button"
                title="Retour sans enregistrer"
                aria-label="Retour sans enregistrer"
                className="cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
                onClick={() => setPanelTab('details')}
              >
                <ArrowLeft size={18} />
              </Button>
            )}
            <Button
              type="button"
              title="Réduire le panneau"
              aria-label="Réduire le panneau"
              className="cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
              onClick={() => setPanelCollapsed(true)}
            >
              <PanelRightOpen size={18} />
            </Button>
            <Button
              type="button"
              title="Fermer"
              aria-label="Fermer"
              className="cursor-pointer bg-transparent text-white/45 transition-colors hover:text-white"
              onClick={closePanel}
            >
              <X size={20} />
            </Button>
          </div>
          {panelTab === 'details' && selectedNode && <NodeDetails />}
          {panelTab === 'details' && !selectedNode && selectedLink && (
            <LinkDetails
              key={selectedLink?.id}
              showBackButton={true}
            />
          )}
          {isAdminTab && <AdminPanel />}
          {hasEmptyDetails && <EmptyState />}
        </div>
      )}
    </aside>
  )
}

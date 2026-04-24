import clsx from 'clsx'
import { X, PanelRightClose, PanelRightOpen, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'
import { PANEL_WIDTH } from '@/common/constants/panels'
import { useMediaQuery } from '@/common/hooks/useMediaQuery'
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
  const isNarrowScreen = useMediaQuery('(max-width: 1199px)')
  const isAdminTab = panelTab === 'edit'
  const isDualPanelMode = panelTab === 'details' && Boolean(selectedNode && selectedLink && linkContextNode)
  // On narrow screens, LinkDetails floats as an overlay instead of splitting the panel
  const showLinkDrawer = isDualPanelMode && isNarrowScreen
  const hasEmptyDetails = panelTab === 'details' && !selectedNode && !selectedLink

  const useWideBookPanel =
    panelOpen &&
    !isDualPanelMode &&
    Boolean(selectedNode) &&
    (panelTab === 'details' || panelTab === 'edit')

  const panelShadow = 'shadow-[-20px_0_80px_rgba(0,0,0,0.45)]'
  const panelBg = 'border-border-default bg-bg-base/98 backdrop-blur-xl'

  const asideClass = clsx(
    'fixed right-0 top-0 z-50 h-screen overflow-hidden border-l transition-transform duration-300 ease-in-out',
    !panelOpen && 'translate-x-full',
    panelOpen && !panelCollapsed && 'translate-x-0',
    panelOpen && panelCollapsed && 'translate-x-[calc(100%-2.5rem)]',
    isDualPanelMode && !showLinkDrawer
      ? `${PANEL_WIDTH.dual} ${panelBg} ${panelShadow}`
      : useWideBookPanel || showLinkDrawer
        ? `${PANEL_WIDTH.book} ${panelBg} ${panelShadow}`
        : `${PANEL_WIDTH.default} border-border-default bg-bg-overlay/92 backdrop-blur-2xl`,
  )

  const handleCollapseDualPanel = () => {
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }

  return (
    <>
      <aside className={asideClass}>
        {/* Collapsed state: explicit expand handle sticking out from the left edge */}
        {panelOpen && panelCollapsed && (
          <Tooltip placement="left" content="Agrandir le panneau">
            <button
              type="button"
              className="absolute left-0 top-0 z-30 flex h-full w-10 cursor-pointer items-center justify-center border-r border-white/15 bg-white/8 text-white/70 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
              aria-label="Agrandir le panneau"
              onClick={() => setPanelCollapsed(false)}
            >
              <ChevronLeft size={18} />
            </button>
          </Tooltip>
        )}

        {panelOpen && panelCollapsed ? null : isDualPanelMode && !showLinkDrawer ? (
          <div className="grid h-full w-full min-w-0 grid-cols-2 overflow-hidden">
            <div className="relative min-w-0 overflow-y-auto border-r border-border-default">
              <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
                <Tooltip placement="left" content="Réduire le panneau">
                  <Button
                    type="button"
                    aria-label="Réduire le panneau"
                    className="cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                    onClick={() => setPanelCollapsed(true)}
                  >
                    <PanelRightOpen size={18} />
                  </Button>
                </Tooltip>
                <Tooltip placement="left" content="Fermer">
                  <Button
                    type="button"
                    aria-label="Fermer"
                    className="cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                    onClick={closePanel}
                  >
                    <X size={20} />
                  </Button>
                </Tooltip>
              </div>
              {panelTab === 'details' && selectedNode && <NodeDetails />}
            </div>
            <div className="relative min-w-0 overflow-y-auto">
              <Tooltip placement="left" content="Fermer le détail du lien">
                <Button
                  type="button"
                  aria-label="Fermer le détail du lien"
                  className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                  onClick={handleCollapseDualPanel}
                >
                  <PanelRightClose size={20} />
                </Button>
              </Tooltip>
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
                <Tooltip placement="left" content="Retour sans enregistrer">
                  <Button
                    type="button"
                    aria-label="Retour sans enregistrer"
                    className="cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                    onClick={() => setPanelTab('details')}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                </Tooltip>
              )}
              <Tooltip placement="left" content="Réduire le panneau">
                <Button
                  type="button"
                  aria-label="Réduire le panneau"
                  className="cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                  onClick={() => setPanelCollapsed(true)}
                >
                  <PanelRightOpen size={18} />
                </Button>
              </Tooltip>
              <Tooltip placement="left" content="Fermer">
                <Button
                  type="button"
                  aria-label="Fermer"
                  className="cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                  onClick={closePanel}
                >
                  <X size={20} />
                </Button>
              </Tooltip>
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

      {/* Narrow-screen overlay: LinkDetails floats as a second panel above NodeDetails */}
      {showLinkDrawer && (
        <aside
          className={`fixed right-0 top-0 z-60 h-screen overflow-hidden border-l ${PANEL_WIDTH.linkDetail} border-border-default bg-bg-base/98 backdrop-blur-xl shadow-[-20px_0_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-in-out`}
        >
          <div className="relative h-full w-full overflow-y-auto">
            <Tooltip placement="left" content="Fermer le détail du lien">
              <Button
                type="button"
                aria-label="Fermer le détail du lien"
                className="absolute right-3 top-3 z-20 cursor-pointer bg-transparent text-text-soft transition-colors hover:text-white"
                onClick={handleCollapseDualPanel}
              >
                <PanelRightClose size={20} />
              </Button>
            </Tooltip>
            <LinkDetails key={selectedLink?.id} showBackButton={false} />
          </div>
        </aside>
      )}
    </>
  )
}

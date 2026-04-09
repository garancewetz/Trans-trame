import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Book, Link } from '@/types/domain'

type SelectionContextValue = {
  selectedNode: Book | null
  selectedLink: Link | null
  linkContextNode: Book | null
  panelTab: string
  previousPanelTab: string
  peekNodeId: string | null
  panelOpen: boolean
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  setLinkContextNode: (n: Book | null) => void
  setPanelTab: (tab: string) => void
  setPreviousPanelTab: (tab: string) => void
  setPeekNodeId: (id: string | null) => void
  /** Composite: select a book node, clear link/context/peek, reset tab to details */
  selectNode: (node: Book | null) => void
  /** Toggle: deselect if same node, otherwise select */
  toggleNode: (node: Book) => void
  /** Composite: select a link with optional context node */
  selectLink: (link: Link | null, context?: Book | null) => void
  closePanel: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<Book | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [linkContextNode, setLinkContextNode] = useState<Book | null>(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [peekNodeId, setPeekNodeId] = useState<string | null>(null)

  const panelOpen = Boolean(selectedNode || selectedLink) || panelTab === 'edit'

  const selectNode = useCallback((node: Book | null) => {
    setSelectedNode(node)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPeekNodeId(null)
    setPanelTab('details')
  }, [])

  const toggleNode = useCallback((node: Book) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setSelectedLink(null)
    setLinkContextNode(null)
    setPeekNodeId(null)
    setPanelTab('details')
  }, [])

  const selectLink = useCallback((link: Link | null, context: Book | null = null) => {
    setSelectedLink(link)
    setLinkContextNode(context)
    setPanelTab('details')
  }, [])

  const closePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
    setPeekNodeId(null)
  }, [])

  // Escape key: close panel or clear peek
  const panelOpenRef = useRef(panelOpen)
  panelOpenRef.current = panelOpen
  const closePanelRef = useRef(closePanel)
  closePanelRef.current = closePanel
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (panelOpenRef.current) closePanelRef.current()
      else setPeekNodeId((prev) => (prev ? null : prev))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <SelectionContext.Provider
      value={{
        selectedNode, selectedLink, linkContextNode,
        panelTab, previousPanelTab, peekNodeId, panelOpen,
        setSelectedNode, setSelectedLink, setLinkContextNode,
        setPanelTab, setPreviousPanelTab, setPeekNodeId,
        selectNode, toggleNode, selectLink, closePanel,
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be inside <SelectionProvider>')
  return ctx
}

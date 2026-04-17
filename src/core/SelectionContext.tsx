import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Book, Link } from '@/types/domain'

// ── Types ─────────────────────────────────────────────────────────────────────

type SelectionState = {
  selectedNode: Book | null
  selectedLink: Link | null
  linkContextNode: Book | null
  panelTab: string
  previousPanelTab: string
  peekNodeId: string | null
  panelOpen: boolean
}

type SelectionActions = {
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  setLinkContextNode: (n: Book | null) => void
  setPanelTab: (tab: string) => void
  setPreviousPanelTab: (tab: string) => void
  setPeekNodeId: (id: string | null) => void
  selectNode: (node: Book | null) => void
  toggleNode: (node: Book) => void
  selectLink: (link: Link | null, context?: Book | null) => void
  closePanel: () => void
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const SelectionStateContext = createContext<SelectionState | null>(null)
const SelectionActionsContext = createContext<SelectionActions | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

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

  const state = useMemo<SelectionState>(() => ({
    selectedNode, selectedLink, linkContextNode,
    panelTab, previousPanelTab, peekNodeId, panelOpen,
  }), [selectedNode, selectedLink, linkContextNode, panelTab, previousPanelTab, peekNodeId, panelOpen])

  const actions = useMemo<SelectionActions>(() => ({
    setSelectedNode, setSelectedLink, setLinkContextNode,
    setPanelTab, setPreviousPanelTab, setPeekNodeId,
    selectNode, toggleNode, selectLink, closePanel,
  }), [selectNode, toggleNode, selectLink, closePanel])

  return (
    <SelectionActionsContext.Provider value={actions}>
      <SelectionStateContext.Provider value={state}>
        {children}
      </SelectionStateContext.Provider>
    </SelectionActionsContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Reactive selection state — re-renders when any selection value changes. */
function useSelectionState() {
  const ctx = useContext(SelectionStateContext)
  if (!ctx) throw new Error('useSelectionState must be inside <SelectionProvider>')
  return ctx
}

/** Stable action callbacks — never triggers re-renders. */
function useSelectionActions() {
  const ctx = useContext(SelectionActionsContext)
  if (!ctx) throw new Error('useSelectionActions must be inside <SelectionProvider>')
  return ctx
}

/** Combined hook (backward compatible) — returns state + actions merged.
 * Memoized : sans le useMemo, le merge produit un nouvel objet à chaque render,
 * invalidant tous les useCallback des consommateurs qui listent `selection` en dep. */
export function useSelection() {
  const state = useSelectionState()
  const actions = useSelectionActions()
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}

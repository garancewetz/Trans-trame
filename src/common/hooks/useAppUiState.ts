import { useCallback, useEffect, useState } from 'react'
import type { Author, Book, GraphData, Link } from '@/types/domain'
import { useGlobalSearch } from '../../features/shell/hooks/useGlobalSearch'

type GraphTapNode = Book | Author

// ── Sub-hooks (non exportés — blocs internes du hook composite) ─────────────

function useSelectionState() {
  const [selectedNode, setSelectedNode] = useState<Book | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [linkContextNode, setLinkContextNode] = useState<Book | null>(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [peekNodeId, setPeekNodeId] = useState<string | null>(null)

  const isAdminTab = panelTab === 'edit'
  const hasSelection = Boolean(selectedNode || selectedLink)
  const panelOpen = hasSelection || isAdminTab

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
    setPeekNodeId(null)
  }, [])

  return {
    selectedNode, setSelectedNode,
    selectedLink, setSelectedLink,
    linkContextNode, setLinkContextNode,
    panelTab, setPanelTab,
    previousPanelTab, setPreviousPanelTab,
    peekNodeId, setPeekNodeId,
    panelOpen,
    handleClosePanel,
  }
}

function useFilterAuthorState() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)

  const toggleFilter = useCallback((axis: string) => setActiveFilter((prev) => (prev === axis ? null : axis)), [])
  const clearActiveFilter = useCallback(() => setActiveFilter(null), [])

  return {
    activeFilter, setActiveFilter,
    hoveredFilter, setHoveredFilter,
    selectedAuthor, setSelectedAuthor,
    toggleFilter, clearActiveFilter,
  }
}

function useTableUiState() {
  const [tableMode, setTableMode] = useState(false)
  const [tableInitialTab, setTableInitialTab] = useState('books')
  const [tableLinkSourceId, setTableLinkSourceId] = useState<string | null>(null)
  const [tableFocusBookId, setTableFocusBookId] = useState<string | null>(null)
  const [lastEditedNodeId, setLastEditedNodeId] = useState<string | null>(null)
  const [flashNodeIds, setFlashNodeIds] = useState<Set<string> | null>(null)

  const handleOpenTable = useCallback(
    (tab: 'books' | 'authors' | 'links' = 'books', linkSourceId: string | null = null, focusBookId: string | null = null) => {
      setTableInitialTab(tab)
      setTableLinkSourceId(linkSourceId)
      setTableFocusBookId(focusBookId)
      setTableMode(true)
    },
    [],
  )

  return {
    tableMode, setTableMode,
    tableInitialTab, setTableInitialTab,
    tableLinkSourceId, setTableLinkSourceId,
    tableFocusBookId, setTableFocusBookId,
    lastEditedNodeId, setLastEditedNodeId,
    flashNodeIds, setFlashNodeIds,
    handleOpenTable,
  }
}

function usePanelVisibility() {
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)

  const openTextsPanel = useCallback(() => {
    setAuthorsPanelOpen(false)
    setTextsPanelOpen(true)
  }, [])

  const openAuthorsPanel = useCallback(() => {
    setTextsPanelOpen(false)
    setAuthorsPanelOpen(true)
  }, [])

  return {
    textsPanelOpen, setTextsPanelOpen,
    authorsPanelOpen, setAuthorsPanelOpen,
    openTextsPanel, openAuthorsPanel,
  }
}

// ── Hook composite (interface publique inchangée) ───────────────────────────

export function useAppUiState(graphData: GraphData, authors: Author[]) {
  const selection = useSelectionState()
  const filterAuthor = useFilterAuthorState()
  const tableUi = useTableUiState()
  const visibility = usePanelVisibility()

  // Déstructuration des setters stables pour les dépendances useCallback
  const {
    setSelectedNode, setSelectedLink, setLinkContextNode,
    setPanelTab, setPeekNodeId, panelOpen, handleClosePanel,
  } = selection
  const { setSelectedAuthor } = filterAuthor
  const { setTextsPanelOpen } = visibility

  // Handlers cross-cutting : orchestrent l'état de plusieurs sous-hooks

  const handleNodeClick = useCallback((node: GraphTapNode) => {
    if (node.type === 'author') {
      setLinkContextNode(null)
      setSelectedLink(null)
      setPeekNodeId(null)
      setSelectedNode(null)
      setPanelTab('details')
      setSelectedAuthor((prev) => (prev === node.id ? null : node.id))
      return
    }
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode((prev) => (prev?.id === node.id ? null : node as Book))
    setPanelTab('details')
  }, [setSelectedNode, setSelectedLink, setLinkContextNode, setPanelTab, setPeekNodeId, setSelectedAuthor])

  const handleSelectAuthorFromPanel = useCallback((authorId: string | null) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setPeekNodeId(null)
    setSelectedNode(null)
    setPanelTab('details')
    if (authorId === null) {
      setSelectedAuthor(null)
      return
    }
    setSelectedAuthor((prev) => (prev === authorId ? null : authorId))
  }, [setSelectedNode, setSelectedLink, setLinkContextNode, setPanelTab, setPeekNodeId, setSelectedAuthor])

  const handleSelectTextFromPanel = useCallback((node: Book) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode(node)
    setPanelTab('details')
    setTextsPanelOpen(false)
  }, [setSelectedNode, setSelectedLink, setLinkContextNode, setPanelTab, setPeekNodeId, setSelectedAuthor, setTextsPanelOpen])

  const handlePeekTextOnGraph = useCallback((node: Book) => {
    setPeekNodeId(node.id)
    setSelectedAuthor(null)
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }, [setPeekNodeId, setSelectedAuthor, setSelectedNode, setSelectedLink, setLinkContextNode, setPanelTab])

  const handleLinkClick = useCallback(() => {
    // Ne pas ouvrir le panneau "lien" au clic sur une arête du graphe.
  }, [])

  // Raccourci Escape : ferme le panneau ou efface le peek
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (panelOpen) handleClosePanel()
      else setPeekNodeId((prev) => (prev ? null : prev))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelOpen, handleClosePanel, setPeekNodeId])

  // Recherche globale
  const { searchRef, globalSearch, setGlobalSearch, searchFocused, setSearchFocused, searchResults, handleSearchSelect } =
    useGlobalSearch({
      nodes: graphData.nodes,
      authors,
      onSelectNode: (node) => {
        setLinkContextNode(null)
        setSelectedLink(null)
        setSelectedAuthor(null)
        setPeekNodeId(null)
        setSelectedNode(node)
        setPanelTab('details')
      },
      onSelectAuthor: (authorId) => {
        setLinkContextNode(null)
        setSelectedLink(null)
        setPeekNodeId(null)
        setSelectedNode(null)
        setPanelTab('details')
        setSelectedAuthor((prev) => (prev === authorId ? null : authorId))
      },
    })

  return {
    ...selection,
    ...filterAuthor,
    ...tableUi,
    ...visibility,
    handleNodeClick,
    handleSelectAuthorFromPanel,
    handleSelectTextFromPanel,
    handlePeekTextOnGraph,
    handleLinkClick,
    searchRef,
    globalSearch,
    setGlobalSearch,
    searchFocused,
    setSearchFocused,
    searchResults,
    handleSearchSelect,
  }
}

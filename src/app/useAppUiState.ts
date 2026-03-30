import { useCallback, useEffect, useState } from 'react'
import useGlobalSearch from '../features/shell/hooks/useGlobalSearch'

export function useAppUiState(graphData, authors) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedLink, setSelectedLink] = useState(null)
  const [linkContextNode, setLinkContextNode] = useState(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)
  const [peekNodeId, setPeekNodeId] = useState(null)

  const [activeFilter, setActiveFilter] = useState(null)
  const [hoveredFilter, setHoveredFilter] = useState(null)
  const [selectedAuthor, setSelectedAuthor] = useState(null)

  const [tableMode, setTableMode] = useState(false)
  const [tableInitialTab, setTableInitialTab] = useState('books')
  const [tableLinkSourceId, setTableLinkSourceId] = useState(null)
  const [lastEditedNodeId, setLastEditedNodeId] = useState(null)
  const [flashNodeIds, setFlashNodeIds] = useState(null)

  const isAdminTab = panelTab === 'edit'
  const hasSelection = selectedNode || selectedLink
  const panelOpen = hasSelection || isAdminTab

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
    setPeekNodeId(null)
  }, [])

  const handleOpenTable = useCallback((tab = 'books', linkSourceId = null) => {
    setTableInitialTab(tab)
    setTableLinkSourceId(linkSourceId)
    setTableMode(true)
  }, [])

  const handleNodeClick = useCallback((node) => {
    // Clic sur un nœud auteur → sélection par ID (highlight tous ses livres)
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
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setPanelTab('details')
  }, [])

  const handleSelectAuthorFromPanel = useCallback((authorId) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setPeekNodeId(null)
    setSelectedNode(null)
    setPanelTab('details')
    setSelectedAuthor((prev) => (prev === authorId ? null : authorId))
  }, [])

  const handleSelectTextFromPanel = useCallback((node) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode(node)
    setPanelTab('details')
    setTextsPanelOpen(false)
  }, [])

  const handlePeekTextOnGraph = useCallback((node) => {
    setPeekNodeId(node.id)
    setSelectedAuthor(null)
    setSelectedNode(null)
    setSelectedLink(null)
    setLinkContextNode(null)
    setPanelTab('details')
  }, [])

  const handleLinkClick = useCallback(() => {
    // Ne pas ouvrir le panneau "lien" au clic sur une arête du graphe.
  }, [])

  const toggleFilter = useCallback((axis) => setActiveFilter((prev) => (prev === axis ? null : axis)), [])
  const clearActiveFilter = useCallback(() => setActiveFilter(null), [])

  const openTextsPanel = useCallback(() => {
    setAuthorsPanelOpen(false)
    setTextsPanelOpen(true)
  }, [])

  const openAuthorsPanel = useCallback(() => {
    setTextsPanelOpen(false)
    setAuthorsPanelOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (panelOpen) handleClosePanel()
      else setPeekNodeId((prev) => (prev ? null : prev))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelOpen, handleClosePanel])

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
    selectedNode,
    setSelectedNode,
    selectedLink,
    setSelectedLink,
    linkContextNode,
    setLinkContextNode,
    panelTab,
    setPanelTab,
    previousPanelTab,
    setPreviousPanelTab,
    textsPanelOpen,
    setTextsPanelOpen,
    authorsPanelOpen,
    setAuthorsPanelOpen,
    openTextsPanel,
    openAuthorsPanel,
    peekNodeId,
    activeFilter,
    hoveredFilter,
    setHoveredFilter,
    selectedAuthor,
    setSelectedAuthor,
    tableMode,
    setTableMode,
    tableInitialTab,
    setTableInitialTab,
    tableLinkSourceId,
    setTableLinkSourceId,
    lastEditedNodeId,
    setLastEditedNodeId,
    flashNodeIds,
    setFlashNodeIds,
    panelOpen,
    handleClosePanel,
    handleOpenTable,
    handleNodeClick,
    handleSelectAuthorFromPanel,
    handleSelectTextFromPanel,
    handlePeekTextOnGraph,
    handleLinkClick,
    toggleFilter,
    clearActiveFilter,
    searchRef,
    globalSearch,
    setGlobalSearch,
    searchFocused,
    setSearchFocused,
    searchResults,
    handleSearchSelect,
  }
}

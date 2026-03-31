import { useCallback, useEffect, useState } from 'react'
import type { Author, Book, GraphData, Link } from '@/types/domain'
import { useGlobalSearch } from '../../features/shell/hooks/useGlobalSearch'

type GraphTapNode = Book | Author

export function useAppUiState(graphData: GraphData, authors: Author[]) {
  const [selectedNode, setSelectedNode] = useState<Book | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [linkContextNode, setLinkContextNode] = useState<Book | null>(null)
  const [panelTab, setPanelTab] = useState('details')
  const [previousPanelTab, setPreviousPanelTab] = useState('details')
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)
  const [peekNodeId, setPeekNodeId] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)

  const [tableMode, setTableMode] = useState(false)
  const [tableInitialTab, setTableInitialTab] = useState('books')
  const [tableLinkSourceId, setTableLinkSourceId] = useState<string | null>(null)
  const [lastEditedNodeId, setLastEditedNodeId] = useState<string | null>(null)
  const [flashNodeIds, setFlashNodeIds] = useState<Set<string> | null>(null)

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

  const handleOpenTable = useCallback(
    (tab: 'books' | 'authors' | 'links' = 'books', linkSourceId: string | null = null) => {
      setTableInitialTab(tab)
      setTableLinkSourceId(linkSourceId)
      setTableMode(true)
    },
    [],
  )

  const handleNodeClick = useCallback((node: GraphTapNode) => {
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
  }, [])

  const handleSelectTextFromPanel = useCallback((node: Book) => {
    setLinkContextNode(null)
    setSelectedLink(null)
    setSelectedAuthor(null)
    setPeekNodeId(null)
    setSelectedNode(node)
    setPanelTab('details')
    setTextsPanelOpen(false)
  }, [])

  const handlePeekTextOnGraph = useCallback((node: Book) => {
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

  const toggleFilter = useCallback((axis: string) => setActiveFilter((prev) => (prev === axis ? null : axis)), [])
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
    function onKeyDown(e: KeyboardEvent) {
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

import type { RefObject } from 'react'
import { AXES_COLORS } from '@/common/utils/categories'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { getIncomingRefs, getLinkNodes, getOutgoingRefs } from '@/features/graph/graphRelations'
import type { GraphImperativeHandle } from '@/features/graph/components/Graph'
import type { Author, Book, BookId, GraphData, Link } from '@/types/domain'

type PanelTab = 'details' | 'edit' | string

export type SidePanelProps = {
  panelOpen: boolean
  panelTab: PanelTab
  selectedNode: Book | null
  selectedLink: Link | null
  linkContextNode: Book | null
  sameAuthorBooks: Book[]
  previousPanelTab: PanelTab
  graphData: GraphData
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  AXES_COLORS: Record<string, string>
  getOutgoingRefs: (node: Book) => Array<{ link: Link; other: Book | undefined }>
  getIncomingRefs: (node: Book) => Array<{ link: Link; other: Book | undefined }>
  getLinkNodes: (link: Link) => { source: Book | undefined; target: Book | undefined }
  handleClosePanel: () => void
  onUpdateLink: (linkId: string, updatedFields: Partial<Link>) => void
  onDeleteLink: (linkId: string) => void
  handleAddBook: (book: Book) => void
  handleAddAuthor: (author: Author) => void
  handleAddLink: (link: Link) => void
  handleUpdateBook: (n: Book) => void
  handleDeleteBook: (nodeId: BookId) => void
  handleMergeBooks: (fromNodeId: BookId, intoNodeId: BookId) => void
  setPreviousPanelTab: (t: PanelTab) => void
  setPanelTab: (t: PanelTab) => void
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  setLinkContextNode: (n: Book | null) => void
  onOpenTable: (tab?: 'books' | 'authors' | 'links', linkSourceId?: string | null, focusBookId?: string | null) => void
}

export function useSidePanelProps({
  graphRef,
  graphData,
  authors,
  authorsMap,
  sameAuthorBooks,
  panelOpen,
  panelTab,
  selectedNode,
  selectedLink,
  linkContextNode,
  previousPanelTab,
  setPreviousPanelTab,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  setLinkContextNode,
  handleClosePanel,
  handleOpenTable,
  handleAddBook,
  handleAddAuthor,
  handleAddLink,
  handleUpdateBook,
  handleDeleteBook,
  handleMergeBooks,
  handleUpdateLink,
  handleDeleteLink,
}: {
  graphRef: RefObject<GraphImperativeHandle | null>
  graphData: GraphData
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  sameAuthorBooks: Book[]
  panelOpen: boolean
  panelTab: PanelTab
  selectedNode: Book | null
  selectedLink: Link | null
  linkContextNode: Book | null
  previousPanelTab: PanelTab
  setPreviousPanelTab: (t: PanelTab) => void
  setPanelTab: (t: PanelTab) => void
  setSelectedNode: (n: Book | null) => void
  setSelectedLink: (l: Link | null) => void
  setLinkContextNode: (n: Book | null) => void
  handleClosePanel: () => void
  handleOpenTable: (tab?: 'books' | 'authors' | 'links', linkSourceId?: string | null, focusBookId?: string | null) => void
  handleAddBook: (book: Book) => void
  handleAddAuthor: (author: Author) => void
  handleAddLink: (link: Link) => void
  handleUpdateBook: (n: Book) => void
  handleDeleteBook: (nodeId: BookId) => boolean
  handleMergeBooks: (fromNodeId: BookId, intoNodeId: BookId) => boolean
  handleUpdateLink: (linkId: string, updatedFields: Partial<Link>) => void
  handleDeleteLink: (linkId: string) => void
}): SidePanelProps {
  return {
    panelOpen,
    panelTab,
    selectedNode,
    selectedLink,
    linkContextNode,
    sameAuthorBooks,
    previousPanelTab,
    graphData,
    authors,
    authorsMap,
    AXES_COLORS,
    getOutgoingRefs: (node: Book) => getOutgoingRefs(graphData, node),
    getIncomingRefs: (node: Book) => getIncomingRefs(graphData, node),
    getLinkNodes: (link: Link) => getLinkNodes(graphData, link),
    handleClosePanel,
    onUpdateLink: handleUpdateLink,
    onDeleteLink: handleDeleteLink,
    handleAddBook,
    handleAddAuthor,
    handleAddLink: (link: Link) => {
      handleAddLink(link)
      handleClosePanel()
      graphRef.current?.centerCamera()
    },
    handleUpdateBook: (n: Book) => {
      handleUpdateBook(n)
      const live = graphData.nodes.find((node) => node.id === n.id)
      if (live) setSelectedNode({ ...live })
      setPanelTab('details')
    },
    handleDeleteBook: (nodeId: BookId) => {
      const deleted = handleDeleteBook(nodeId)
      if (!deleted) return
      setSelectedNode(null)
      setSelectedLink(null)
      setLinkContextNode(null)
      setPanelTab('details')
    },
    handleMergeBooks: (fromNodeId: BookId, intoNodeId: BookId) => {
      const merged = handleMergeBooks(fromNodeId, intoNodeId)
      if (!merged) return
      const intoNode = graphData.nodes.find((n) => n.id === intoNodeId)
      setSelectedLink(null)
      setLinkContextNode(null)
      setSelectedNode(intoNode || null)
      setPanelTab('details')
    },
    setPreviousPanelTab,
    setPanelTab,
    setSelectedNode,
    setSelectedLink,
    setLinkContextNode,
    onOpenTable: handleOpenTable,
  }
}

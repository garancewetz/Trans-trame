import { useMemo } from 'react'
import type { AuthorId, Book, GraphData } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'
import { linkKeyOf } from '../domain/linkStyle'

type Args = {
  graphData: GraphData
  selectedAuthorId: AuthorId | null
  peekNodeId: string | null
  selectedNode: Book | null
}

export function useGraphDerivedLinkState({ graphData, selectedAuthorId, peekNodeId, selectedNode }: Args) {
  // Pré-calcule les IDs canoniques sur chaque lien pour éliminer normalizeEndpointId
  // du hot path (420k appels/s → 0). d3 hydrate source/target de string→objet, mais
  // normalizeEndpointId retourne le même ID dans les deux cas → __key est stable.
  useMemo(() => {
    for (const link of graphData.links) {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      ;(link as any).__srcId = srcId
      ;(link as any).__tgtId = tgtId
      ;(link as any).__key = srcId && tgtId ? linkKeyOf(srcId, tgtId) : null
    }
  }, [graphData.links])

  const authorNodeIds = useMemo(() => {
    if (!selectedAuthorId) return new Set<string>()
    const ids = new Set<string>()
    ids.add(selectedAuthorId)
    graphData.nodes.forEach((n) => {
      if (n.authorIds?.includes(selectedAuthorId)) ids.add(n.id)
    })
    return ids
  }, [selectedAuthorId, graphData.nodes])

  const anchorIds = useMemo(() => {
    if (peekNodeId) return new Set([peekNodeId])
    if (selectedNode) return new Set([selectedNode.id])
    if (authorNodeIds.size) return authorNodeIds
    return null
  }, [peekNodeId, selectedNode, authorNodeIds])

  const connectedLinks = useMemo(() => {
    if (!anchorIds) return new Set<string>()
    const set = new Set<string>()
    graphData.links.forEach((link) => {
      const srcId = (link as any).__srcId as string | null
      const tgtId = (link as any).__tgtId as string | null
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId) || anchorIds.has(tgtId)) set.add((link as any).__key)
    })
    return set
  }, [anchorIds, graphData.links])

  const connectedNodes = useMemo(() => {
    if (!anchorIds) return new Set<string>()
    const set = new Set(anchorIds)
    graphData.links.forEach((link) => {
      const srcId = (link as any).__srcId as string | null
      const tgtId = (link as any).__tgtId as string | null
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId)) set.add(tgtId)
      if (anchorIds.has(tgtId)) set.add(srcId)
    })
    return set
  }, [anchorIds, graphData.links])

  // Comptages basés sur les liens : une seule passe pour tout calculer.
  // - citationsByNodeId : inlinks de citation (cité par N) — hors author-book
  // - linkWeights : multiplicité dirigée A→B (≠ B→A) — hors author-book
  // - degreeByNodeId : degree total (in+out) — hors author-book
  // - bookCountByAuthorId : nombre de livres par auteur (author-book uniquement)
  // - externalCitationsByBookId : citations sortantes vers un livre d'un AUTRE auteur
  const { citationsByNodeId, linkWeights, degreeByNodeId, bookCountByAuthorId, externalCitationsByBookId } = useMemo(() => {
    const citations = new Map<string, number>()
    const weights = new Map<string, number>()
    const degree = new Map<string, number>()
    const bookCount = new Map<string, number>()
    const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) || 0) + 1)

    // Index rapide id→type pour éviter graphData.nodes.find() dans la boucle liens
    const nodeTypeById = new Map<string, string>()
    graphData.nodes.forEach((n) => { if (n.type) nodeTypeById.set(n.id, n.type) })

    // Passe 1 : author-book → bookCount + index inversé bookId→authorIds
    const authorOfBook = new Map<string, Set<string>>()
    graphData.links.forEach((link) => {
      if (link.type !== 'author-book') return
      const srcId = (link as any).__srcId as string | null
      const tgtId = (link as any).__tgtId as string | null
      if (!srcId || !tgtId) return
      let authorId: string | null = null
      let bookId: string | null = null
      if (nodeTypeById.get(srcId) === 'author') { authorId = srcId; bookId = tgtId }
      else if (nodeTypeById.get(tgtId) === 'author') { authorId = tgtId; bookId = srcId }
      if (!authorId || !bookId) return
      bump(bookCount, authorId)
      if (!authorOfBook.has(bookId)) authorOfBook.set(bookId, new Set())
      authorOfBook.get(bookId)!.add(authorId)
    })

    // Passe 2 : citations → degree, weights, citations, externalCitations
    const extCit = new Map<string, number>()
    graphData.links.forEach((link) => {
      if (link.type === 'author-book') return
      const srcId = (link as any).__srcId as string | null
      const tgtId = (link as any).__tgtId as string | null
      if (!srcId || !tgtId) return

      bump(citations, tgtId) // inlinks (cité par N)
      bump(weights, (link as any).__key) // multiplicité dirigée A→B (≠ B→A)
      bump(degree, srcId)
      bump(degree, tgtId)

      // Citation "externe" = la cible appartient à un auteur différent de la source.
      const srcAuthors = authorOfBook.get(srcId)
      const tgtAuthors = authorOfBook.get(tgtId)
      if (srcAuthors && tgtAuthors) {
        let shared = false
        for (const a of srcAuthors) { if (tgtAuthors.has(a)) { shared = true; break } }
        if (!shared) bump(extCit, srcId)
      } else if (srcAuthors || tgtAuthors) {
        // Un des deux n'a pas d'auteur → considéré externe
        bump(extCit, srcId)
      }
    })

    return {
      citationsByNodeId: citations,
      linkWeights: weights,
      degreeByNodeId: degree,
      bookCountByAuthorId: bookCount,
      externalCitationsByBookId: extCit,
    }
  }, [graphData.links, graphData.nodes])

  // Top N livres par degré (in+out) : sert à étiqueter en permanence les
  // carrefours bibliographiques de la constellation, même en vue d'ensemble.
  // N choisi pour rester lisible sans saturer (~12 ancres nommées).
  // Les auteurs sont naturellement exclus : degreeByNodeId ignore les liens
  // author-book, donc ils tombent toujours à 0 et sont filtrés par `d <= 0`.
  const topDegreeNodeIds = useMemo(() => {
    const TOP_LANDMARK_COUNT = 12
    const candidates: Array<{ id: string; degree: number }> = []
    graphData.nodes.forEach((n) => {
      const d = degreeByNodeId.get(n.id) || 0
      if (d <= 0) return
      candidates.push({ id: n.id, degree: d })
    })
    candidates.sort((a, b) => b.degree - a.degree)
    return new Set(candidates.slice(0, TOP_LANDMARK_COUNT).map((c) => c.id))
  }, [graphData.nodes, degreeByNodeId])

  return {
    authorNodeIds,
    anchorIds,
    connectedLinks,
    connectedNodes,
    citationsByNodeId,
    linkWeights,
    degreeByNodeId,
    topDegreeNodeIds,
    bookCountByAuthorId,
    externalCitationsByBookId,
  }
}

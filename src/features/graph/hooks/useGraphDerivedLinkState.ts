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
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId) || anchorIds.has(tgtId)) set.add(linkKeyOf(srcId, tgtId))
    })
    return set
  }, [anchorIds, graphData.links])

  const connectedNodes = useMemo(() => {
    if (!anchorIds) return new Set<string>()
    const set = new Set(anchorIds)
    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      if (anchorIds.has(srcId)) set.add(tgtId)
      if (anchorIds.has(tgtId)) set.add(srcId)
    })
    return set
  }, [anchorIds, graphData.links])

  // Tous les comptages basés sur les liens : une seule passe sur `graphData.links`.
  // - citations / weights / degree : hors author-book (mesures de citation pure)
  // - bookCountByAuthorId : nombre de livres par auteur (pour dimensionner les galaxies)
  // - externalCitationsByBookId : citations d'un livre vers/depuis un livre
  //   d'un auteur différent (pour détecter les livres "passeurs")
  const { citationsByNodeId, linkWeights, degreeByNodeId, bookCountByAuthorId, externalCitationsByBookId } = useMemo(() => {
    const citations = new Map<string, number>()
    const weights = new Map<string, number>()
    const degree = new Map<string, number>()
    const bookCount = new Map<string, number>()
    const externalCit = new Map<string, number>()
    const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) || 0) + 1)

    // Index auteur(s) de chaque livre pour déterminer si une citation est "externe".
    // GraphData.nodes est typé Book[] mais contient aussi des Authors au runtime ;
    // authorIds est propre aux Books, c'est le discriminant pratique.
    const bookAuthors = new Map<string, Set<string>>()
    graphData.nodes.forEach((n) => {
      const ids = (n as { authorIds?: string[] }).authorIds
      if (Array.isArray(ids) && ids.length > 0) {
        bookAuthors.set(n.id, new Set(ids))
      }
    })

    graphData.links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return

      if (link.type === 'author-book') {
        // L'endpoint qui est un livre connu est dans bookAuthors ; l'autre est l'auteur.
        const srcIsBook = bookAuthors.has(srcId)
        const authorId = srcIsBook ? tgtId : srcId
        bump(bookCount, authorId)
        return
      }

      bump(citations, tgtId) // inlinks (cité par N)
      bump(weights, linkKeyOf(srcId, tgtId)) // multiplicité dirigée A→B (≠ B→A)
      bump(degree, srcId)
      bump(degree, tgtId)

      // Citation externe : les deux livres ne partagent aucun auteur.
      const srcAuthors = bookAuthors.get(srcId)
      const tgtAuthors = bookAuthors.get(tgtId)
      if (srcAuthors && tgtAuthors) {
        let shared = false
        for (const a of srcAuthors) {
          if (tgtAuthors.has(a)) { shared = true; break }
        }
        if (!shared) {
          bump(externalCit, srcId)
          bump(externalCit, tgtId)
        }
      }
    })

    return {
      citationsByNodeId: citations,
      linkWeights: weights,
      degreeByNodeId: degree,
      bookCountByAuthorId: bookCount,
      externalCitationsByBookId: externalCit,
    }
  }, [graphData.links, graphData.nodes])

  return {
    authorNodeIds,
    anchorIds,
    connectedLinks,
    connectedNodes,
    citationsByNodeId,
    linkWeights,
    degreeByNodeId,
  }
}

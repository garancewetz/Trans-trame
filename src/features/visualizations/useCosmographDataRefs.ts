import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Book } from '@/types/domain'
import type { LabelData } from './cosmographDrawing'
import { LINK_DEFAULT_RGBA } from './cosmographForces'
import type { CosmographBuffers, SubClusterInfo } from './useCosmographBuffers'
import type { useAdjacencyIndex } from '@/features/graph/hooks/useAdjacencyIndex'

type AdjacencyIndex = ReturnType<typeof useAdjacencyIndex>

export type CosmographDataRefs = {
  flatSizesRef: MutableRefObject<Float32Array>
  labelByIndexRef: MutableRefObject<LabelData[]>
  subClusterByIndexRef: MutableRefObject<number[]>
  subClustersRef: MutableRefObject<SubClusterInfo[]>
  glowHexByIndexRef: MutableRefObject<string[]>
  landmarkIndicesRef: MutableRefObject<number[]>
  landmarkIndicesExtendedRef: MutableRefObject<number[]>
  landmarkIndicesCategoriesRef: MutableRefObject<number[]>
  landmarkIndicesCategoriesExtendedRef: MutableRefObject<number[]>
  minimapIndicesRef: MutableRefObject<number[]>
  booksRef: MutableRefObject<Book[]>
  idToIndexRef: MutableRefObject<Map<string, number>>
  linksByNodeIdRef: MutableRefObject<AdjacencyIndex>
  flatLinksRef: MutableRefObject<Float32Array>
  edgeCountRef: MutableRefObject<number>
  clusterAssignmentsRef: MutableRefObject<(number | undefined)[]>
  liveSizesRef: MutableRefObject<Float32Array>
  liveLinkColorsRef: MutableRefObject<Float32Array>
  prevHoveredRef: MutableRefObject<number | null>
  hoveredIndexRef: MutableRefObject<number | null>
}

/**
 * Miroir des données dans des refs stables. Les callbacks du Graph sont
 * attachés une fois à l'init, mais doivent lire les dernières valeurs après
 * une mutation — sans ça il faudrait reconstruire le Graph à chaque
 * changement de dataset (on perdrait caméra et hover). Les buffers live
 * (sizes, link colors) sont recréés à chaque changement pour invalider
 * proprement l'état de hover précédent.
 */
export function useCosmographDataRefs(
  buffers: CosmographBuffers,
  linksByNodeId: AdjacencyIndex,
): CosmographDataRefs {
  const {
    books, idToIndex, flatSizes, flatLinks, edgeCount, labelByIndex,
    subClusterByIndex, subClusters,
    landmarkIndices, landmarkIndicesExtended,
    landmarkIndicesCategories, landmarkIndicesCategoriesExtended,
    minimapIndices, glowHexByIndex, clusterAssignments,
  } = buffers

  const flatSizesRef = useRef<Float32Array>(flatSizes)
  const labelByIndexRef = useRef<LabelData[]>(labelByIndex)
  const subClusterByIndexRef = useRef<number[]>(subClusterByIndex)
  const subClustersRef = useRef<SubClusterInfo[]>(subClusters)
  const glowHexByIndexRef = useRef<string[]>(glowHexByIndex)
  const landmarkIndicesRef = useRef<number[]>(landmarkIndices)
  const landmarkIndicesExtendedRef = useRef<number[]>(landmarkIndicesExtended)
  const landmarkIndicesCategoriesRef = useRef<number[]>(landmarkIndicesCategories)
  const landmarkIndicesCategoriesExtendedRef = useRef<number[]>(landmarkIndicesCategoriesExtended)
  const minimapIndicesRef = useRef<number[]>(minimapIndices)
  const booksRef = useRef<Book[]>(books)
  const idToIndexRef = useRef<Map<string, number>>(idToIndex)
  const linksByNodeIdRef = useRef<AdjacencyIndex>(linksByNodeId)
  const liveSizesRef = useRef<Float32Array>(new Float32Array(flatSizes))
  const prevHoveredRef = useRef<number | null>(null)
  const hoveredIndexRef = useRef<number | null>(null)
  const flatLinksRef = useRef<Float32Array>(flatLinks)
  const edgeCountRef = useRef<number>(edgeCount)
  const liveLinkColorsRef = useRef<Float32Array>(new Float32Array(edgeCount * 4))
  const clusterAssignmentsRef = useRef<(number | undefined)[]>(clusterAssignments)

  useEffect(() => {
    flatSizesRef.current = flatSizes
    labelByIndexRef.current = labelByIndex
    subClusterByIndexRef.current = subClusterByIndex
    subClustersRef.current = subClusters
    glowHexByIndexRef.current = glowHexByIndex
    landmarkIndicesRef.current = landmarkIndices
    landmarkIndicesExtendedRef.current = landmarkIndicesExtended
    landmarkIndicesCategoriesRef.current = landmarkIndicesCategories
    landmarkIndicesCategoriesExtendedRef.current = landmarkIndicesCategoriesExtended
    minimapIndicesRef.current = minimapIndices
    booksRef.current = books
    idToIndexRef.current = idToIndex
    flatLinksRef.current = flatLinks
    edgeCountRef.current = edgeCount
    clusterAssignmentsRef.current = clusterAssignments
    liveSizesRef.current = new Float32Array(flatSizes)
    const linkBuf = new Float32Array(edgeCount * 4)
    for (let i = 0; i < edgeCount; i++) {
      linkBuf[i * 4] = LINK_DEFAULT_RGBA[0]
      linkBuf[i * 4 + 1] = LINK_DEFAULT_RGBA[1]
      linkBuf[i * 4 + 2] = LINK_DEFAULT_RGBA[2]
      linkBuf[i * 4 + 3] = LINK_DEFAULT_RGBA[3]
    }
    liveLinkColorsRef.current = linkBuf
    prevHoveredRef.current = null
    hoveredIndexRef.current = null
  }, [flatSizes, labelByIndex, subClusterByIndex, subClusters, glowHexByIndex, landmarkIndices, landmarkIndicesExtended, landmarkIndicesCategories, landmarkIndicesCategoriesExtended, minimapIndices, books, idToIndex, flatLinks, edgeCount, clusterAssignments])

  // linksByNodeId est recalculé par useAdjacencyIndex (changement de
  // graphData.links) — son effect dédié évite d'invalider le buffer live
  // des tailles/couleurs ci-dessus à chaque mutation de liens.
  useEffect(() => {
    linksByNodeIdRef.current = linksByNodeId
  }, [linksByNodeId])

  return {
    flatSizesRef, labelByIndexRef, subClusterByIndexRef, subClustersRef,
    glowHexByIndexRef,
    landmarkIndicesRef, landmarkIndicesExtendedRef,
    landmarkIndicesCategoriesRef, landmarkIndicesCategoriesExtendedRef,
    minimapIndicesRef, booksRef, idToIndexRef,
    linksByNodeIdRef, flatLinksRef, edgeCountRef, clusterAssignmentsRef,
    liveSizesRef, liveLinkColorsRef, prevHoveredRef, hoveredIndexRef,
  }
}

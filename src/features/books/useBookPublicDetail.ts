import { useMemo } from 'react'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import { computeSameAuthorBooks, getIncomingRefs, getOutgoingRefs } from '@/features/graph/graphRelations'
import type { Author, Book, GraphData } from '@/types/domain'

/** Données dérivées pour la fiche ouvrage (panneau, exports, etc.). */
export function useBookPublicDetail(book: Book | null, graphData: GraphData, authors: Author[]) {
  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const sameAuthorBooks = useMemo(
    () => (book ? computeSameAuthorBooks(graphData, book) : []),
    [graphData, book],
  )

  const outgoing = useMemo(() => (book ? getOutgoingRefs(graphData, book) : []), [graphData, book])
  const incoming = useMemo(() => (book ? getIncomingRefs(graphData, book) : []), [graphData, book])

  return { authorsMap, sameAuthorBooks, outgoing, incoming }
}

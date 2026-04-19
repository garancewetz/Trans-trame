import type { Link } from '@/types/domain'
import { normalizeEndpointId } from '@/features/graph/domain/graphDataModel'

type CitationEdge = { sourceId: string; targetId: string }

export function getCitationEdges(links: Link[]): CitationEdge[] {
  return links
    .filter((l) => l.type !== 'author-book')
    .flatMap((l) => {
      const src = normalizeEndpointId(l.source)
      const tgt = normalizeEndpointId(l.target)
      return src && tgt ? [{ sourceId: src, targetId: tgt }] : []
    })
}

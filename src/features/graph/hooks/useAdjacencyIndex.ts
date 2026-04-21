import { useMemo } from 'react'
import type { GraphData } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'

type AdjacencyEntry = { neighborIds: string[] }

/** Pre-computed adjacency index: O(degree) hover lookups instead of O(links) */
export function useAdjacencyIndex(links: GraphData['links']) {
  return useMemo(() => {
    const map = new Map<string, AdjacencyEntry>()
    const ensure = (id: string) => {
      let entry = map.get(id)
      if (!entry) { entry = { neighborIds: [] }; map.set(id, entry) }
      return entry
    }
    links.forEach((link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      ensure(srcId).neighborIds.push(tgtId)
      ensure(tgtId).neighborIds.push(srcId)
    })
    return map
  }, [links])
}

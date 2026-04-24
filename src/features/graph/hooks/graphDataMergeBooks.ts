import type { BookId, Link } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'

type BookMergeLinkPlan = {
  remappedLinks: Link[]
  linksToUpdate: { id: string; source_id: string; target_id: string }[]
  linkIdsToDelete: string[]
  citationsToReassign: { fromLinkId: string; toLinkId: string }[]
}

// Two-pass design: unchanged links claim their (src, tgt) slot first, so any
// remapped link that collides is dropped instead of UPDATEd. Without this,
// UPDATE would try to move a link into a slot still held by an unchanged one,
// tripping the `idx_links_source_target_unique` partial index.
export function planLinksAfterBookMerge(
  links: Link[],
  fromNodeId: BookId,
  intoNodeId: BookId
): BookMergeLinkPlan {
  const linksToUpdate: { id: string; source_id: string; target_id: string }[] = []
  const linkIdsToDelete: string[] = []
  const citationsToReassign: { fromLinkId: string; toLinkId: string }[] = []
  const remappedLinks: Link[] = []
  const survivorByEdge = new Map<string, Link>()

  type Resolved = {
    link: Link
    srcId: string
    tgtId: string
    needsRemap: boolean
  }
  const resolved: Resolved[] = []

  links.forEach((link) => {
    const srcIdRaw = normalizeEndpointId(link.source)
    const tgtIdRaw = normalizeEndpointId(link.target)
    if (!srcIdRaw || !tgtIdRaw) {
      linkIdsToDelete.push(link.id)
      return
    }
    const srcId = srcIdRaw === fromNodeId ? intoNodeId : srcIdRaw
    const tgtId = tgtIdRaw === fromNodeId ? intoNodeId : tgtIdRaw
    if (!srcId || !tgtId || srcId === tgtId) {
      linkIdsToDelete.push(link.id)
      return
    }
    resolved.push({
      link,
      srcId,
      tgtId,
      needsRemap: srcId !== srcIdRaw || tgtId !== tgtIdRaw,
    })
  })

  const claim = (item: Resolved) => {
    const edgeKey = `${item.srcId}|${item.tgtId}`
    const survivor = survivorByEdge.get(edgeKey)
    if (survivor) {
      citationsToReassign.push({ fromLinkId: item.link.id, toLinkId: survivor.id })
      linkIdsToDelete.push(item.link.id)
      survivor.citations = [...(survivor.citations ?? []), ...(item.link.citations ?? [])]
      return
    }
    const remapped = { ...item.link, source: item.srcId, target: item.tgtId }
    survivorByEdge.set(edgeKey, remapped)
    remappedLinks.push(remapped)
    if (item.needsRemap) {
      linksToUpdate.push({ id: item.link.id, source_id: item.srcId, target_id: item.tgtId })
    }
  }

  resolved.filter((r) => !r.needsRemap).forEach(claim)
  resolved.filter((r) => r.needsRemap).forEach(claim)

  return { remappedLinks, linksToUpdate, linkIdsToDelete, citationsToReassign }
}

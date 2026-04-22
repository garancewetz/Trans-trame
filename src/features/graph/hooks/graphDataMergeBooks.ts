import type { BookId, Link } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'

type BookMergeLinkPlan = {
  remappedLinks: Link[]
  linksToUpdate: { id: string; source_id: string; target_id: string }[]
  linkIdsToDelete: string[]
}

export function planLinksAfterBookMerge(
  links: Link[],
  fromNodeId: BookId,
  intoNodeId: BookId
): BookMergeLinkPlan {
  const linksToUpdate: { id: string; source_id: string; target_id: string }[] = []
  const linkIdsToDelete: string[] = []
  const dedupe = new Set<string>()
  const remappedLinks: Link[] = []

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
    // Dedup key uses the primary citation's fingerprint. Multiple citations on
    // the same edge live as sibling rows; after a merge only the surviving
    // link keeps them, so collapsing on citations[0] is enough for the
    // post-merge uniqueness check (belt-and-suspenders with the DB UNIQUE
    // partial index on source_id + target_id).
    const primary = link.citations?.[0]
    const key = `${srcId}|${tgtId}|${primary?.citation_text || ''}|${primary?.page || ''}|${primary?.edition || ''}`
    if (dedupe.has(key)) {
      linkIdsToDelete.push(link.id)
      return
    }
    dedupe.add(key)

    if (srcId !== srcIdRaw || tgtId !== tgtIdRaw) {
      linksToUpdate.push({ id: link.id, source_id: srcId, target_id: tgtId })
    }
    remappedLinks.push({ ...link, source: srcId, target: tgtId })
  })

  return { remappedLinks, linksToUpdate, linkIdsToDelete }
}

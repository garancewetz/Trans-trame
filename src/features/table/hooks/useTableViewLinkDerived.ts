import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Book, BookId, Link } from '@/types/domain'
import { maybeNodeId } from '../maybeNodeId'
import { resolveLinks } from '../resolveLinks'

type Resolved = ReturnType<typeof resolveLinks>[number]

type Args = {
  nodes: Book[]
  links: Link[]
  authorsMap: Map<string, AuthorNode>
  linkSourceNode: Book | null
  checklistSearch: string
  linkSearch: string
  linkCheckedIds: Set<BookId>
}

export function useTableViewLinkDerived({
  nodes,
  links,
  authorsMap,
  linkSourceNode,
  checklistSearch,
  linkSearch,
  linkCheckedIds,
}: Args) {
  const resolvedLinks = useMemo(() => resolveLinks(links, nodes), [links, nodes])

  const existingTargetIds = useMemo(() => {
    if (!linkSourceNode) return new Set<BookId>()
    const srcId = linkSourceNode.id
    const set = new Set<BookId>()
    links.forEach((l) => {
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (s === srcId && t) set.add(t)
    })
    return set
  }, [links, linkSourceNode])

  const checklistNodes = useMemo(() => {
    if (!linkSourceNode) return []
    const q = checklistSearch.toLowerCase().trim()
    return nodes
      .filter((n) => n.id !== linkSourceNode.id)
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q)
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [nodes, linkSourceNode, checklistSearch, authorsMap])

  const newLinksCount = useMemo(
    () => [...linkCheckedIds].filter((id) => !existingTargetIds.has(id)).length,
    [linkCheckedIds, existingTargetIds]
  )

  const filteredLinks = useMemo(() => {
    const q = linkSearch.toLowerCase().trim()
    if (!q) return resolvedLinks
    return resolvedLinks.filter(
      (l) =>
        (l.sourceNode?.title || '').toLowerCase().includes(q) ||
        (l.targetNode?.title || '').toLowerCase().includes(q) ||
        bookAuthorDisplay(l.sourceNode || {}, authorsMap).toLowerCase().includes(q) ||
        bookAuthorDisplay(l.targetNode || {}, authorsMap).toLowerCase().includes(q) ||
        ((l.citation_text || l.context || '')).toLowerCase().includes(q)
    )
  }, [resolvedLinks, linkSearch, authorsMap])

  const groupedLinks = useMemo(() => {
    const groups = new Map<string, { sourceNode: Book | undefined; links: Resolved[] }>()
    filteredLinks.forEach((link) => {
      if (!groups.has(link._srcId)) {
        groups.set(link._srcId, { sourceNode: link.sourceNode, links: [] })
      }
      groups.get(link._srcId)!.links.push(link)
    })
    return Array.from(groups.values()).sort((a, b) =>
      (a.sourceNode?.title || '').localeCompare(b.sourceNode?.title || '')
    )
  }, [filteredLinks])

  return {
    resolvedLinks,
    existingTargetIds,
    checklistNodes,
    newLinksCount,
    filteredLinks,
    groupedLinks,
  }
}

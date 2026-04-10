import { useMemo } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { matchAllWords } from '@/common/utils/searchUtils'
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
  linkDirection: 'source' | 'cited'
  checklistSearch: string
  linkSearch: string
  linkCheckedIds: Set<BookId>
}

export function useTableViewLinkDerived({
  nodes,
  links,
  authorsMap,
  linkSourceNode,
  linkDirection,
  checklistSearch,
  linkSearch,
  linkCheckedIds,
}: Args) {
  const resolvedLinks = useMemo(() => resolveLinks(links, nodes), [links, nodes])

  const existingTargetIds = useMemo(() => {
    if (!linkSourceNode) return new Set<BookId>()
    const selectedId = linkSourceNode.id
    const set = new Set<BookId>()
    links.forEach((l) => {
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (linkDirection === 'source') {
        if (s === selectedId && t) set.add(t)
      } else {
        if (t === selectedId && s) set.add(s)
      }
    })
    return set
  }, [links, linkSourceNode, linkDirection])

  const checklistNodes = useMemo(() => {
    if (!linkSourceNode) return []
    const q = checklistSearch.trim()
    return nodes
      .filter((n) => n.id !== linkSourceNode.id)
      .filter(
        (n) =>
          !q ||
          matchAllWords(checklistSearch, n.title + ' ' + bookAuthorDisplay(n, authorsMap))
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [nodes, linkSourceNode, checklistSearch, authorsMap])

  const newLinksCount = useMemo(
    () => [...linkCheckedIds].filter((id) => !existingTargetIds.has(id)).length,
    [linkCheckedIds, existingTargetIds]
  )

  const filteredLinks = useMemo(() => {
    if (!linkSearch.trim()) return resolvedLinks
    return resolvedLinks.filter((l) => {
      const haystack = [
        l.sourceNode?.title || '',
        l.targetNode?.title || '',
        bookAuthorDisplay(l.sourceNode || {}, authorsMap),
        bookAuthorDisplay(l.targetNode || {}, authorsMap),
        l.citation_text || l.context || '',
      ].join(' ')
      return matchAllWords(linkSearch, haystack)
    })
  }, [resolvedLinks, linkSearch, authorsMap])

  const groupedLinks = useMemo(() => {
    const groups = new Map<string, { sourceNode: Book | null; links: Resolved[] }>()
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

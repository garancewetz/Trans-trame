import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import type { Book, Link as GraphLink } from '@/types/domain'

export function linkExcerpt(link: GraphLink) {
  return (link.citation_text || link.context || '').trim()
}

export function refMetaLine(
  other: Book | null | undefined,
  link: GraphLink,
  authorsMap: Map<string, AuthorNode>,
) {
  const parts: string[] = []
  if (other) {
    const a = bookAuthorDisplay(other, authorsMap)
    if (a) parts.push(a)
    if (other.year != null) parts.push(String(other.year))
  }
  if (link.page) parts.push(`p. ${link.page}`)
  return parts.join(' · ')
}

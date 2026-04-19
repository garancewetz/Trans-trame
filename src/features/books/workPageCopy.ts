import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import type { Book } from '@/types/domain'

type CitationFieldsReader = {
  citation_text?: string
  context?: string
  page?: string
  edition?: string
}

export function linkExcerpt(link: CitationFieldsReader) {
  return (link.citation_text || link.context || '').trim()
}

export function citationMetaLine(src: CitationFieldsReader) {
  const parts: string[] = []
  if (src.page) parts.push(src.page)
  if (src.edition) parts.push(src.edition)
  return parts.join(' · ')
}

export function refWorkMetaLine(
  other: Book | null | undefined,
  authorsMap: Map<string, AuthorNode>,
) {
  if (!other) return ''
  const parts: string[] = []
  const a = bookAuthorDisplay(other, authorsMap)
  if (a) parts.push(a)
  if (other.year != null) parts.push(String(other.year))
  return parts.join(' · ')
}

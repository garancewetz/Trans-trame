import type { Author, Book, Link } from '@/types/domain'
import type { ParsedBook } from './parseSmartInput'
import { isThenable, resolveOrCreateAuthors } from './smartImportModal.utils'

type OnAddBook = (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
type OnAddLink = (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void

export async function runSmartImportBatchInsert(params: {
  parsed: ParsedBook[]
  checked: Set<string>
  existingAuthors: Author[]
  onAddAuthor?: (author: Author) => void
  onAddBook?: OnAddBook
  onAddLink?: OnAddLink
  masterNode: Book | null
  linkDirection: string
  masterContext: string
  onQueued?: (titles: string[]) => void
  onImportComplete?: (ids: string[]) => void
}): Promise<void> {
  const {
    parsed,
    checked,
    existingAuthors,
    onAddAuthor,
    onAddBook,
    onAddLink,
    masterNode,
    linkDirection,
    masterContext,
    onQueued,
    onImportComplete,
  } = params

  const toAdd = parsed.filter((r) => checked.has(r.id))
  const newIds: string[] = []
  const localAuthors: Author[] = [...existingAuthors]
  const insertPromises: Promise<unknown>[] = []

  toAdd.forEach((r) => {
    const authorIds = onAddAuthor
      ? resolveOrCreateAuthors(r.authors || [], localAuthors, onAddAuthor)
      : []
    const pending = onAddBook?.({
      id: r.id,
      title: r.title,
      firstName: r.firstName,
      lastName: r.lastName,
      authorIds,
      year: r.year,
      axes: r.axes,
      description: '',
    })
    if (isThenable(pending)) insertPromises.push(Promise.resolve(pending))
    newIds.push(r.id)
  })

  if (insertPromises.length > 0) await Promise.all(insertPromises)

  if (masterNode) {
    toAdd.forEach((r) => {
      const source = linkDirection === 'imported-cites-master' ? r.id : masterNode.id
      const target = linkDirection === 'imported-cites-master' ? masterNode.id : r.id
      onAddLink?.({
        source,
        target,
        citation_text: masterContext.trim(),
        edition: r.edition || '',
        page: '',
        context: '',
      })
    })
  }

  onQueued?.(toAdd.map((r) => r.title))
  onImportComplete?.(newIds)
}

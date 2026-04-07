import type { Author, Book, Link } from '@/types/domain'
import type { ParsedBook } from './parseSmartInput'
import { isThenable, resolveOrCreateAuthors } from './smartImportModal.utils'

type OnAddBook = (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
type OnAddLink = (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void

export async function runSmartImportBatchInsert(params: {
  parsed: ParsedBook[]
  checked: Set<string>
  mergedIds: Set<string>
  existingAuthors: Author[]
  onAddAuthor?: (author: Author) => unknown
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
    mergedIds,
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
  const newItems = toAdd.filter((r) => !mergedIds.has(r.id))
  const mergedItems = toAdd.filter((r) => mergedIds.has(r.id))
  const newIds: string[] = []
  const localAuthors: Author[] = [...existingAuthors]

  // Phase 1: create all author entities for NEW items only
  const authorIdsByBook: string[][] = []
  const authorPromises: PromiseLike<unknown>[] = []
  newItems.forEach((r) => {
    if (onAddAuthor) {
      const { ids, promises } = resolveOrCreateAuthors(r.authors || [], localAuthors, onAddAuthor)
      authorIdsByBook.push(ids)
      authorPromises.push(...promises)
    } else {
      authorIdsByBook.push([])
    }
  })
  if (authorPromises.length > 0) await Promise.all(authorPromises)

  // Phase 2: insert NEW books only (merged books already exist)
  const insertPromises: Promise<unknown>[] = []
  newItems.forEach((r, i) => {
    const pending = onAddBook?.({
      id: r.id,
      title: r.title,
      firstName: r.firstName,
      lastName: r.lastName,
      authorIds: authorIdsByBook[i],
      year: r.year,
      axes: r.axes,
      description: '',
    })
    if (isThenable(pending)) insertPromises.push(Promise.resolve(pending))
    newIds.push(r.id)
  })

  if (insertPromises.length > 0) await Promise.all(insertPromises)

  // Phase 3: create links for ALL checked items (new + merged)
  if (masterNode) {
    toAdd.forEach((r) => {
      const isMerged = mergedIds.has(r.id)
      const bookId = isMerged ? r.existingNode?.id || r.id : r.id
      const source = linkDirection === 'imported-cites-master' ? bookId : masterNode.id
      const target = linkDirection === 'imported-cites-master' ? masterNode.id : bookId
      onAddLink?.({
        source,
        target,
        citation_text: r.citation?.trim() || masterContext.trim(),
        edition: r.edition || '',
        page: r.page || '',
        context: '',
      })
    })
  }

  onQueued?.(toAdd.map((r) => r.title))
  onImportComplete?.(newIds)
}

import type { Author, Book, Link } from '@/types/domain'
import type { ParsedBook } from './parseSmartInput'
import { isThenable, resolveOrCreateAuthors } from './smartImportModal.utils'

type OnAddBook = (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
type OnAddLink = (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
type OnAddLinks = (links: Array<Partial<Link> & Pick<Link, 'source' | 'target'>>) => void

export async function runSmartImportBatchInsert(params: {
  parsed: ParsedBook[]
  checked: Set<string>
  mergedIds: Set<string>
  existingAuthors: Author[]
  onAddAuthor?: (author: Author) => unknown
  onAddBook?: OnAddBook
  onAddLink?: OnAddLink
  onAddLinks?: OnAddLinks
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
    onAddLinks,
    masterNode,
    linkDirection,
    masterContext,
    onQueued,
    onImportComplete,
  } = params

  const toAdd = parsed.filter((r) => checked.has(r.id))
  const newItems = toAdd.filter((r) => !mergedIds.has(r.id))
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
  if (authorPromises.length > 0) {
    const authorResults = await Promise.allSettled(authorPromises)
    const authorErrors = authorResults.filter((r) => r.status === 'rejected')
    if (authorErrors.length > 0 && import.meta.env.DEV) {
      console.warn('[BatchInsert] Some author creations failed:', authorErrors)
    }
  }

  // Phase 2: insert NEW books only (merged books already exist)
  const insertPromises: Promise<unknown>[] = []
  newItems.forEach((r, i) => {
    const themeAxes = (r.suggestedThemes || []).map((t) => `UNCATEGORIZED:${t}`)
    const allAxes = [...new Set([...(r.axes || []), ...themeAxes])]
    const pending = onAddBook?.({
      id: r.id,
      title: r.title,
      originalTitle: r.originalTitle,
      firstName: r.firstName,
      lastName: r.lastName,
      authorIds: authorIdsByBook[i],
      year: r.year,
      axes: allAxes,
      description: '',
      importSourceId: masterNode?.id ?? null,
    })
    if (isThenable(pending)) insertPromises.push(Promise.resolve(pending))
    newIds.push(r.id)
  })

  if (insertPromises.length > 0) {
    const insertResults = await Promise.allSettled(insertPromises)
    const insertErrors = insertResults.filter((r) => r.status === 'rejected')
    if (insertErrors.length > 0 && import.meta.env.DEV) {
      console.warn('[BatchInsert] Some book insertions failed:', insertErrors)
    }
  }

  // Phase 3: batch-create links for ALL checked items (new + merged).
  // Previously a per-item forEach of onAddLink lost rows on large imports
  // (bibliographies of 30+ refs). onAddLinks does chunked bulk insert.
  if (masterNode) {
    const linksToAdd = toAdd.map((r) => {
      const isMerged = mergedIds.has(r.id)
      const bookId = isMerged ? r.existingNode?.id || r.id : r.id
      const source = linkDirection === 'imported-cites-master' ? bookId : masterNode.id
      const target = linkDirection === 'imported-cites-master' ? masterNode.id : bookId
      return {
        source,
        target,
        citation_text: r.citation?.trim() || masterContext.trim(),
        edition: r.edition || '',
        page: r.page || '',
        context: '',
      }
    })
    if (linksToAdd.length > 0) {
      if (onAddLinks) onAddLinks(linksToAdd)
      else linksToAdd.forEach((l) => onAddLink?.(l))
    }
  }

  onQueued?.(toAdd.map((r) => r.title))
  onImportComplete?.(newIds)
}

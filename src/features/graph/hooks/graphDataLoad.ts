import type { Author, Book, Link } from '@/types/domain'
import { loadGraphDataFromSupabase } from '../api/graphDataApi'
import {
  type AxesColorMap,
  dbAuthorToNode,
  dbBookToNode,
  dbLinkToLink,
  sanitizeAuthor,
  sanitizeBook,
} from '../domain/graphDataModel'

export async function loadGraphDatasetFromSupabase(
  axesColors: AxesColorMap
): Promise<{ books: Book[]; authors: Author[]; links: Link[] } | null> {
  try {
    const { booksRes, authorsRes, linksRes, bookAuthorsRes } = await loadGraphDataFromSupabase()
    if (booksRes.error || linksRes.error) return null
    const authorsData = authorsRes.error ? [] : (authorsRes.data || [])

    // Build book→authorIds map from junction table
    const bookAuthorMap = new Map<string, string[]>()
    for (const ba of bookAuthorsRes.data ?? []) {
      const arr = bookAuthorMap.get(ba.book_id) ?? []
      arr.push(ba.author_id)
      bookAuthorMap.set(ba.book_id, arr)
    }

    return {
      books: (booksRes.data || []).map((r) =>
        sanitizeBook(dbBookToNode(r, bookAuthorMap.get(r.id)), axesColors)
      ),
      authors: authorsData.map((r) => sanitizeAuthor(dbAuthorToNode(r), axesColors)),
      links: (linksRes.data || []).map(dbLinkToLink),
    }
  } catch {
    return null
  }
}

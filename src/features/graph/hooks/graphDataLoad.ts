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
    const { booksRes, authorsRes, linksRes } = await loadGraphDataFromSupabase()
    if (booksRes.error || linksRes.error) return null
    const authorsData = authorsRes.error ? [] : (authorsRes.data || [])
    return {
      books: (booksRes.data || []).map((r) => sanitizeBook(dbBookToNode(r), axesColors)),
      authors: authorsData.map((r) => sanitizeAuthor(dbAuthorToNode(r), axesColors)),
      links: (linksRes.data || []).map(dbLinkToLink),
    }
  } catch {
    return null
  }
}

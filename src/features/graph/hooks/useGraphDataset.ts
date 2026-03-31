import { useQuery } from '@tanstack/react-query'
import { loadGraphDataFromSupabase } from '../api/graphDataApi'
import {
  dbAuthorToNode,
  dbBookToNode,
  dbLinkToLink,
  sanitizeAuthor,
  sanitizeBook,
  type AxesColorMap,
} from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

/**
 * Fetches books, authors and links in parallel from Supabase.
 * Replaces the manual useEffect-based initial load in useGraphData.
 * Exposes isLoading and isError so the UI can react to async state.
 */
export function useGraphDataset(axesColors: AxesColorMap) {
  return useQuery({
    queryKey: DATASET_QUERY_KEY,
    queryFn: async () => {
      const { booksRes, authorsRes, linksRes, bookAuthorsRes } = await loadGraphDataFromSupabase()

      if (booksRes.error) throw new Error(booksRes.error.message)
      if (linksRes.error) throw new Error(linksRes.error.message)

      const authorsData = authorsRes.error ? [] : (authorsRes.data ?? [])

      // Build book→authorIds map from junction table
      const bookAuthorMap = new Map<string, string[]>()
      for (const ba of bookAuthorsRes.data ?? []) {
        const arr = bookAuthorMap.get(ba.book_id) ?? []
        arr.push(ba.author_id)
        bookAuthorMap.set(ba.book_id, arr)
      }

      return {
        books: (booksRes.data ?? []).map((r) =>
          sanitizeBook(dbBookToNode(r, bookAuthorMap.get(r.id)), axesColors)
        ),
        authors: authorsData.map((r) => sanitizeAuthor(dbAuthorToNode(r), axesColors)),
        links: (linksRes.data ?? []).map(dbLinkToLink),
      }
    },
  })
}

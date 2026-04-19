import { useQuery } from '@tanstack/react-query'
import type { LinkCitation } from '@/types/domain'
import { loadGraphDataFromSupabase } from '../api/graphDataApi'
import {
  dbAuthorToNode,
  dbBookToNode,
  dbLinkCitationToCitation,
  dbLinkToLink,
  sanitizeAuthor,
  sanitizeBook,
  type AxesColorMap,
} from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

/**
 * Fetches books, authors, links AND link_citations in parallel from Supabase.
 * book_authors are embedded directly in the books query via PostgREST join
 * (avoids the 1000-row default limit on separate SELECT). Citations are fetched
 * separately and grouped by link_id before being attached — we can't use a
 * PostgREST join because link_citations has its own RLS filter on deleted_at.
 */
export function useGraphDataset(axesColors: AxesColorMap) {
  return useQuery({
    queryKey: DATASET_QUERY_KEY,
    queryFn: async () => {
      const { booksRes, authorsRes, linksRes, citationsRes } = await loadGraphDataFromSupabase()

      if (booksRes.error) throw new Error(booksRes.error.message)
      if (linksRes.error) throw new Error(linksRes.error.message)

      const authorsData = authorsRes.error ? [] : (authorsRes.data ?? [])
      const citationsData = citationsRes.error ? [] : (citationsRes.data ?? [])

      const citationsByLinkId = new Map<string, LinkCitation[]>()
      for (const row of citationsData) {
        const c = dbLinkCitationToCitation(row)
        const list = citationsByLinkId.get(c.link_id)
        if (list) list.push(c)
        else citationsByLinkId.set(c.link_id, [c])
      }

      return {
        books: (booksRes.data ?? []).map((r) => {
          const authorIds = (r.resource_authors as { author_id: string }[] | null)?.map(
            (ra) => ra.author_id,
          ) ?? []
          return sanitizeBook(dbBookToNode(r, authorIds), axesColors)
        }),
        authors: authorsData.map((r) => sanitizeAuthor(dbAuthorToNode(r), axesColors)),
        links: (linksRes.data ?? []).map((r) => dbLinkToLink(r, citationsByLinkId.get(r.id) ?? [])),
      }
    },
  })
}

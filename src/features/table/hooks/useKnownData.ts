import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/core/supabase'
import { fetchAllPaginated } from '@/features/graph/api/graphDataApi'

export interface KnownAuthor {
  firstName: string
  lastName: string
}

// Both autocomplete sources MUST be paginated: above 1000 authors / 1000 links
// the SmartImport autocomplete (and edition suggestions) would silently miss
// the most recent entries — same root cause as the orphan-import bug.

export function useKnownAuthors() {
  return useQuery({
    queryKey: ['known-authors'],
    queryFn: async () => {
      const { data, error } = await fetchAllPaginated<{ first_name: string | null; last_name: string | null }>(
        (from, to) => supabase.from('authors').select('first_name, last_name').is('deleted_at', null).range(from, to),
        'knownAuthors',
      )

      if (error) throw new Error(error.message)

      const seen = new Set<string>()
      return (data ?? [])
        .map((r) => ({
          firstName: (r.first_name || '').trim(),
          lastName: (r.last_name || '').trim(),
        }))
        .filter((a) => {
          if (!a.firstName && !a.lastName) return false
          const key = `${a.lastName.toLowerCase()}|${a.firstName.toLowerCase()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) =>
          a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'),
        )
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useKnownEditions() {
  return useQuery({
    queryKey: ['known-editions'],
    queryFn: async () => {
      const { data, error } = await fetchAllPaginated<{ edition: string | null }>(
        (from, to) => supabase.from('links').select('edition').is('deleted_at', null).range(from, to),
        'knownEditions',
      )

      if (error) throw new Error(error.message)

      return [...new Set(
        (data ?? [])
          .map((r) => (r.edition || '').trim())
          .filter((e) => e.length > 0),
      )].sort((a, b) => a.localeCompare(b, 'fr'))
    },
    staleTime: 5 * 60 * 1000,
  })
}

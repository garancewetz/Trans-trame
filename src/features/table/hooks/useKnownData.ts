import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/core/supabase'

export interface KnownAuthor {
  firstName: string
  lastName: string
}

export function useKnownAuthors() {
  return useQuery({
    queryKey: ['known-authors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('first_name, last_name')

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
      const { data, error } = await supabase
        .from('links')
        .select('edition')

      if (error) throw new Error(error.message)

      return [...new Set(
        (data ?? [])
          .map((r) => ((r as { edition?: string }).edition || '').trim())
          .filter((e) => e.length > 0),
      )].sort((a, b) => a.localeCompare(b, 'fr'))
    },
    staleTime: 5 * 60 * 1000,
  })
}

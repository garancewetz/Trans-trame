import { useMemo } from 'react'
import type { Book, BookId, Link } from '@/types/domain'
import { normalizeEndpointId } from '../domain/graphDataModel'

function linkWithStringEndpoints(l: Link, source: BookId, target: BookId): Link {
  return { ...l, source, target }
}

/** Normalise un titre pour le regroupement d'oeuvres (lowercase, diacritics, whitespace). */
function normTitle(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
}

/**
 * Books sharing the same originalTitle are collapsed into a single representative node.
 * Links are remapped and deduplicated accordingly.
 */
export function useCollapsedGraphData(books: Book[], links: Link[]) {
  return useMemo(() => {
    const bookIdToRepId = new Map<string, string>()
    const repNodes = new Map<string, Book>() // normKey -> representative Book node
    const standaloneBooks: Book[] = []

    // Group books by normalized originalTitle
    const byOriginal = new Map<string, Book[]>()
    for (const b of books) {
      const ot = b.originalTitle?.trim()
      if (ot) {
        const key = normTitle(ot)
        if (!byOriginal.has(key)) byOriginal.set(key, [])
        byOriginal.get(key)?.push(b)
      } else {
        standaloneBooks.push(b)
      }
    }

    // For each group, pick a representative and remap all book ids
    for (const [key, group] of byOriginal) {
      if (group.length === 1) {
        // Single book with originalTitle: show originalTitle as graph node title
        const solo = group[0]
        standaloneBooks.push({ ...solo, title: solo.originalTitle || solo.title })
        continue
      }
      // Sort by id for a stable representative across re-renders
      group.sort((a, b) => a.id.localeCompare(b.id))
      const rep = group[0]
      const allAuthorIds = [...new Set(group.flatMap((b) => b.authorIds ?? []))]
      const allAxes = [...new Set(group.flatMap((b) => b.axes ?? []))]
      const years = group.map((b) => b.year).filter((y): y is number => y != null)
      const repNode: Book = {
        ...rep,
        title: rep.originalTitle || rep.title,
        authorIds: allAuthorIds,
        axes: allAxes,
        year: years.length ? Math.min(...years) : rep.year,
      }
      repNodes.set(key, repNode)
      for (const b of group) {
        bookIdToRepId.set(b.id, rep.id)
      }
    }

    const nodes = [...standaloneBooks, ...repNodes.values()]

    // Remap links: redirect endpoints to representative node, deduplicate
    const seen = new Set<string>()
    const remappedLinks = (links || [])
      .map((l) => {
        let source = normalizeEndpointId(l.source)
        let target = normalizeEndpointId(l.target)
        if (!source || !target) return null
        source = bookIdToRepId.get(source) ?? source
        target = bookIdToRepId.get(target) ?? target
        if (source === target) return null
        const [lo, hi] = source < target ? [source, target] : [target, source]
        const dedupKey = `${lo}|${hi}|${l.citation_text || ''}`
        if (seen.has(dedupKey)) return null
        seen.add(dedupKey)
        return linkWithStringEndpoints(l, source, target)
      })
      .filter((x): x is Link => x !== null)

    return { nodes, links: remappedLinks }
  }, [books, links])
}

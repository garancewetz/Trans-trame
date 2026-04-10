import type { Axis } from '@/common/utils/categories.constants'
import type { ParsedAuthor } from './parseSmartInput.types'
import { supabase } from '@/core/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LLMParsedResult {
  authors: ParsedAuthor[]
  title: string
  edition: string
  city: string
  year: number | null
  page: string
  axes: Axis[]
  /** Thematiques emergentes detectees par le LLM (format « UNCATEGORIZED:label ») */
  suggestedThemes: string[]
}

// ─── Validation constants (kept client-side for response validation) ────────

const VALID_AXES = [
  'ANTIRACISM', 'AFROFEMINIST', 'QUEER', 'HEALTH', 'HISTORY',
  'INSTITUTIONAL', 'CHILDHOOD', 'CRIP', 'BODY', 'FEMINIST', 'UNCATEGORIZED',
] as const

const ALLOWED_THEMES = new Set([
  'philosophy', 'psychoanalysis', 'literature', 'science', 'art',
  'religion', 'education', 'media', 'geography', 'technology', 'ecology',
])

// ─── Logic ───────────────────────────────────────────────────────────────────

export async function parseWithLLM(rawLine: string): Promise<LLMParsedResult | null> {
  const results = await parseWithLLMBatch([{ index: 0, raw: rawLine }])
  return results.get(0) ?? null
}

/**
 * Sends lines to the parse-references Edge Function and validates results.
 * Falls back to an empty Map if the function is unavailable.
 */
export async function parseWithLLMBatch(
  lines: { index: number; raw: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()
  if (lines.length === 0) return results

  try {
    const { data, error } = await supabase.functions.invoke('parse-references', {
      body: { lines },
    })

    if (error) {
      console.warn('[LLM] Edge function error:', error.message)
      return results
    }

    const rawResults = data?.results as [number, Record<string, unknown>][] | undefined
    if (!Array.isArray(rawResults)) {
      console.warn('[LLM] Unexpected response format from edge function')
      return results
    }

    for (const [index, item] of rawResults) {
      if (!item) continue

      // Validate axes against known values
      const rawAxes: string[] = (
        Array.isArray(item.axes)
          ? item.axes
          : typeof item.axes === 'string'
            ? [item.axes]
            : []
      )
        .map((a: unknown) => String(a).trim())
        .filter(Boolean)

      const knownAxes = rawAxes.filter(
        (a): a is Axis =>
          VALID_AXES.includes(a as typeof VALID_AXES[number]) &&
          a !== 'UNCATEGORIZED',
      )

      const suggestedThemes = rawAxes
        .flatMap((a) => {
          if (a.startsWith('UNCATEGORIZED:'))
            return [a.slice('UNCATEGORIZED:'.length).trim()]
          if (!VALID_AXES.includes(a as typeof VALID_AXES[number])) return [a]
          return []
        })
        .map((t) => t.toLowerCase().replace(/_/g, ' ').trim())
        .filter((t) => ALLOWED_THEMES.has(t))
        .filter((v, idx, arr) => arr.indexOf(v) === idx)

      const rawAuthors = Array.isArray(item.authors) ? item.authors : []
      results.set(index, {
        authors: rawAuthors
          .filter(
            (a): a is Record<string, unknown> =>
              a != null && typeof a === 'object',
          )
          .map((a) => ({
            firstName: String(a.firstName ?? '').trim(),
            lastName: String(a.lastName ?? '').trim(),
          })),
        title: String(item.title ?? '').trim(),
        edition: String(item.edition ?? '').trim(),
        city: String(item.city ?? '').trim(),
        year: typeof item.year === 'number' ? item.year : null,
        page: String(item.page ?? '').trim(),
        axes: knownAxes.length > 0 ? knownAxes : ['UNCATEGORIZED' as Axis],
        suggestedThemes,
      })
    }

    // Report full progress since the edge function handles chunking internally
    onProgress?.(lines.length, lines.length)
  } catch (err) {
    console.warn('[LLM] Failed to invoke edge function:', err)
  }

  return results
}

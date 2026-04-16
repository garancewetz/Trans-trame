import type { Axis } from '@/common/utils/categories.constants'
import type { ParsedAuthor } from './parseSmartInput.types'
import { supabase } from '@/core/supabase'
import { devWarn } from '@/common/utils/logger'
import { formatSupabaseError } from '@/core/supabaseErrors'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LLMParsedResult {
  authors: ParsedAuthor[]
  title: string
  /**
   * Canonical title in the work's original language (for grouping editions /
   * translations). Empty string when the model does not recognize the work.
   */
  originalTitle: string
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

// ─── Shared result validation ─────────────────────────────────────────────

function validateLLMItem(item: Record<string, unknown>): LLMParsedResult {
  const rawAxes: string[] = (
    Array.isArray(item.axes)
      ? item.axes
      : typeof item.axes === 'string'
        ? [item.axes]
        : []
  )
    .map((a: unknown) => String(a).trim())
    .filter(Boolean)

  const knownAxes = [...new Set(rawAxes.filter(
    (a): a is Axis =>
      VALID_AXES.includes(a as typeof VALID_AXES[number]) &&
      a !== 'UNCATEGORIZED',
  ))]

  // Preserve every UNCATEGORIZED:label and any unrecognized axis as a theme
  // so the front-end can surface them in the preview (AxisDots) and persist
  // them on the book — instead of silently dropping labels the LLM returned.
  const suggestedThemes = rawAxes
    .flatMap((a) => {
      if (a.startsWith('UNCATEGORIZED:'))
        return [a.slice('UNCATEGORIZED:'.length).trim()]
      if (!VALID_AXES.includes(a as typeof VALID_AXES[number])) return [a]
      return []
    })
    .map((t) => t.toLowerCase().replace(/_/g, ' ').trim())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)

  const rawAuthors = Array.isArray(item.authors) ? item.authors : []
  return {
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
    originalTitle: String(item.originalTitle ?? '').trim(),
    edition: String(item.edition ?? '').trim(),
    city: String(item.city ?? '').trim(),
    year: typeof item.year === 'number' ? item.year : null,
    page: String(item.page ?? '').trim(),
    axes: knownAxes.length > 0 ? knownAxes : ['UNCATEGORIZED' as Axis],
    suggestedThemes,
  }
}

function processRawResults(
  rawResults: [number, Record<string, unknown>][] | undefined,
): Map<number, LLMParsedResult> {
  const results = new Map<number, LLMParsedResult>()
  if (!Array.isArray(rawResults)) return results
  for (const [index, item] of rawResults) {
    if (!item) continue
    results.set(index, validateLLMItem(item))
  }
  return results
}

// ─── Logic ───────────────────────────────────────────────────────────────────

// Chunk size tuned for two constraints:
//   1. Each server invocation must complete well under Supabase's Edge Function
//      wall-clock limit. At ~0.3-0.5s per line through Gemini 2.5 Flash,
//      20 lines ≈ 5-10s — comfortable headroom.
//   2. Gemini free tier caps at 15 RPM; at this chunk size, a 100-line import
//      dispatches 5 requests spaced by CHUNK_PAUSE_MS below, staying well
//      within quota.
const LLM_CHUNK_SIZE = 20
// Defensive spacing between chunks. 15 RPM = 4s minimum; our chunks already
// take several seconds of Gemini round-trip, so 1.2s of added pause is enough
// buffer without making the UX feel laggy.
const LLM_CHUNK_PAUSE_MS = 1200

/**
 * Sends lines to the parse-references Edge Function and validates results.
 *
 * Chunks the input client-side and issues one invocation per chunk. This keeps
 * each Edge Function call short-lived so it cannot trip Supabase's wall-clock
 * timeout on large imports (observed as 546 EarlyDrop on ~50+ lines).
 *
 * Individual chunk failures are logged and skipped — the remaining chunks still
 * process normally, so a transient Gemini hiccup doesn't sink the whole batch.
 */
export async function parseWithLLMBatch(
  lines: { index: number; raw: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()
  if (lines.length === 0) return results

  let done = 0
  let chunkCount = 0
  let chunkFailures = 0
  let lastError: string | null = null

  for (let i = 0; i < lines.length; i += LLM_CHUNK_SIZE) {
    if (i > 0) await new Promise((r) => setTimeout(r, LLM_CHUNK_PAUSE_MS))

    const chunk = lines.slice(i, i + LLM_CHUNK_SIZE)
    const chunkNum = Math.floor(i / LLM_CHUNK_SIZE) + 1
    chunkCount += 1

    try {
      const { data, error } = await supabase.functions.invoke('parse-references', {
        body: { lines: chunk },
      })

      if (error) {
        devWarn(`[LLM] Chunk ${chunkNum} failed`, error.message)
        chunkFailures += 1
        lastError = error.message
      } else {
        const parsed = processRawResults(data?.results)
        for (const [k, v] of parsed) results.set(k, v)
      }
    } catch (err) {
      devWarn(`[LLM] Chunk ${chunkNum} threw`, err)
      chunkFailures += 1
      lastError = formatSupabaseError(err, 'Erreur lors de l\'appel à Gemini')
    }

    done += chunk.length
    onProgress?.(done, lines.length)
  }

  // If every chunk failed the caller would otherwise see an empty result with
  // no signal — surface the failure so the UI can show a toast / error state.
  if (chunkCount > 0 && chunkFailures === chunkCount) {
    throw new Error(lastError ?? 'Toutes les requêtes Gemini ont échoué')
  }

  return results
}

/**
 * Sends images to the parse-references Edge Function for multimodal OCR parsing.
 * Throws on failure so the caller can surface the error to the UI (a silent
 * empty result would leave users staring at a spinner that never reports why).
 */
export async function parseWithLLMImages(
  images: { base64: string; mimeType: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()
  if (images.length === 0) return results

  onProgress?.(0, 1)

  const { data, error } = await supabase.functions.invoke('parse-references', {
    body: { images },
  })

  if (error) {
    devWarn('[LLM] Edge function error (images)', error.message)
    throw new Error(error.message ?? 'Erreur Gemini (images)')
  }

  const parsed = processRawResults(data?.results)
  for (const [k, v] of parsed) results.set(k, v)

  onProgress?.(1, 1)
  return results
}

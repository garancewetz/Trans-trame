import type { Axis } from '@/common/utils/categories.constants'
import type { ParsedAuthor } from './parseSmartInput.types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LLMParsedResult {
  authors: ParsedAuthor[]
  title: string
  edition: string
  city: string
  year: number | null
  page: string
  axes: Axis[]
  /** Thématiques émergentes détectées par le LLM (format « UNCATEGORIZED:label ») */
  suggestedThemes: string[]
}

// ─── Configuration ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? ''
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VALID_AXES = [
  'ANTIRACISM', 'AFROFEMINIST', 'QUEER', 'HEALTH', 'HISTORY',
  'INSTITUTIONAL', 'CHILDHOOD', 'CRIP', 'BODY', 'FEMINIST', 'UNCATEGORIZED',
] as const

const SYSTEM_PROMPT = `You are a bibliographic reference parser. You receive a list of numbered lines. For EACH line, extract bibliographic fields and classify the work thematically. Return a JSON array.

Context: this is an intersectional corpus mapping intellectual filiations across feminism, afrofeminism, queer studies, disability, race, body politics, and social justice.

Response format (array, one object per line, in order):
[{"authors":[{"firstName":"","lastName":""}],"title":"","edition":"","city":"","year":null,"page":"","axes":[]}]

Bibliographic fields:
- "authors": ALL authors/co-authors, including (dir.), (eds.), (coord.). Separate first name and last name.
  * IMPORTANT: For collectives (e.g. "Combahee River Collective") or single-name authors (e.g. "bell hooks"), put the full name in "lastName" and leave "firstName" empty.
- "title": full title including subtitles after a colon or period. WITHOUT quotation marks. Do NOT include "tome", "vol.", volume numbers.
  * For articles, this is the article title; the journal/review name goes in "edition".
- "edition": publisher, or journal/review name for articles. If dual publisher (e.g. "Gallimard/Le Seuil"), keep as-is.
- "city": city of publication if present, otherwise "".
- "year": first year of publication (number). For a range "1976-1984", return 1976. If absent, null.
- "page": cited pages AND/OR volume/tome indication. Combine if both present. Examples: "p. 27-29", "tome 2", "Vols. 1, 2, 3", "vol. 2, p. 10-15". If absent, "".

CRITICAL RULE: Ensure that "title" and "authors" are never swapped. For classic authors (e.g., Balzac, Flaubert), extract the person's name even if the source text is ambiguous. If a name like "Le Père Goriot" appears as an author, it is an error; identify "Honoré de Balzac" as the author.

Thematic classification ("axes") — pick 1 to 3 categories from:
- QUEER: queer studies, trans, gender, LGBT sexualities, drag, homonormativity
- HEALTH: health, trauma, care, illness, violence, medical body, grief
- BODY: body, sexology, desire, eroticism, anatomy, reproduction
- HISTORY: history, memory, archives, century, war, era
- ANTIRACISM: race, racism, whiteness, segregation, colonialism, discrimination
- AFROFEMINIST: afrofeminism, negritude, womanism, diaspora, postcolonial
- INSTITUTIONAL: politics, law, sociology, economics, university, state, labor
- CHILDHOOD: childhood, family, parenting, incest
- CRIP: disability, ableism, accessibility, neurodivergence, mad studies
- FEMINIST: feminist theory, patriarchy, sexism, misogyny, gender oppression, emancipation, sisterhood

Priority rules for classification:
1. INTERSECTIONALITY: Actively look for 2-3 axes when relevant (e.g. a Black lesbian author writing about health → AFROFEMINIST + QUEER + HEALTH).
2. SPECIFICITY: Be specific with HISTORY and INSTITUTIONAL. Only use them if the work's primary focus is archives or legal/economic structures. Do not apply them by default to every old book.
3. PREFERENCE: ALWAYS prefer existing categories above. A feminist philosophy book → FEMINIST, not UNCATEGORIZED.
4. ECOLOGY: Do not use ECOLOGY as a main axis. If a work is about ecofeminism or environment, use "UNCATEGORIZED:ecology".
5. UNCATEGORIZED: Only when the work truly does not fit the 10 main axes. You may add a broad family label: "UNCATEGORIZED:label", ONLY from: "philosophy", "psychoanalysis", "literature", "science", "art", "religion", "education", "media", "geography", "technology", "ecology". Lowercase, one word only.

Examples:
Input: Didier Eribon (dir.), Les études gay et lesbiennes, Centre Georges-Pompidou, Paris, 1998.
→ {"authors":[{"firstName":"Didier","lastName":"Eribon"}],"title":"Les études gay et lesbiennes","edition":"Centre Georges-Pompidou","city":"Paris","year":1998,"page":"","axes":["QUEER"]}

Input: Richard Dyer, « Male Gay Porn : Coming to Terms », in Jump Cut, Mars, 1985, p. 27-29.
→ {"authors":[{"firstName":"Richard","lastName":"Dyer"}],"title":"Male Gay Porn : Coming to Terms","edition":"Jump Cut","city":"","year":1985,"page":"p. 27-29","axes":["QUEER","BODY"]}

Input: Audre Lorde, Sister Outsider, Crossing Press, 1984.
→ {"authors":[{"firstName":"Audre","lastName":"Lorde"}],"title":"Sister Outsider","edition":"Crossing Press","city":"","year":1984,"page":"","axes":["AFROFEMINIST","QUEER","FEMINIST"]}

Input: Jacques Lacan, Écrits, Seuil, Paris, 1966.
→ {"authors":[{"firstName":"Jacques","lastName":"Lacan"}],"title":"Écrits","edition":"Seuil","city":"Paris","year":1966,"page":"","axes":["UNCATEGORIZED:psychoanalysis"]}`

// ─── Logic ───────────────────────────────────────────────────────────────────

export async function parseWithLLM(rawLine: string): Promise<LLMParsedResult | null> {
  const results = await parseWithLLMBatch([{ index: 0, raw: rawLine }])
  return results.get(0) ?? null
}

const CHUNK_SIZE = 40

/**
 * Traite les lignes par lots (batches) pour respecter les limites de tokens
 * et éviter de saturer les quotas par minute (pause de 4s entre appels).
 */
export async function parseWithLLMBatch(
  lines: { index: number; raw: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()

  if (!GEMINI_API_KEY) {
    if (import.meta.env.DEV) console.warn('[LLM] pas de clé VITE_GEMINI_API_KEY')
    return results
  }

  if (lines.length === 0) return results

  const chunks: { index: number; raw: string }[][] = []
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    chunks.push(lines.slice(i, i + CHUNK_SIZE))
  }

  let processed = 0
  for (let c = 0; c < chunks.length; c++) {
    if (c > 0) {
      if (import.meta.env.DEV) console.log(`[LLM] pause 4s avant lot ${c + 1}/${chunks.length}…`)
      await new Promise((r) => setTimeout(r, 4000))
    }
    const chunkResults = await _parseChunk(chunks[c])
    for (const [idx, val] of chunkResults) results.set(idx, val)
    processed += chunks[c].length
    onProgress?.(processed, lines.length)
  }

  return results
}

const ALLOWED_THEMES = new Set([
  'philosophy', 'psychoanalysis', 'literature', 'science', 'art',
  'religion', 'education', 'media', 'geography', 'technology', 'ecology',
])

/**
 * Envoie un lot de lignes à l'API et gère les erreurs 429 avec une
 * stratégie de retrait (backoff) basée sur les détails de l'erreur.
 */
async function _parseChunk(
  lines: { index: number; raw: string }[],
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()
  const numberedLines = lines.map((l, i) => `${i + 1}. ${l.raw}`).join('\n')

  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nLines to parse:\n${numberedLines}` }],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })

  const MAX_RETRIES = 2
  let response: Response | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(90000),
        body,
      })

      if (response.status !== 429) break

      const errorBody = await response.json().catch(() => null)
      const details = errorBody?.error?.details as { '@type': string; retryDelay?: string; violations?: { quotaId: string }[] }[] | undefined

      const isDailyExhausted = details?.some((d) =>
        d.violations?.some((v) => v.quotaId?.includes('PerDay')),
      )
      if (isDailyExhausted) {
        if (import.meta.env.DEV) console.warn('[LLM] Quota journalier épuisé.')
        return results
      }

      if (attempt === MAX_RETRIES) break

      const retryInfo = details?.find((d) => d.retryDelay)
      const apiDelay = retryInfo?.retryDelay ? parseFloat(retryInfo.retryDelay) : NaN
      const wait = (!isNaN(apiDelay) ? Math.ceil(apiDelay) + 2 : 45) * 1000

      if (import.meta.env.DEV) console.warn(`[LLM] 429 — retry ${attempt + 1}/${MAX_RETRIES} dans ${wait / 1000}s`)
      await new Promise((r) => setTimeout(r, wait))
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
    }
  }

  try {
    if (!response || !response.ok) return results

    const data = await response.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) return results

    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed)) return results

    for (let i = 0; i < Math.min(parsed.length, lines.length); i++) {
      const item = parsed[i] as Record<string, unknown> | null
      if (!item) continue

      // Sécurité : transformer axes en tableau s'il arrive sous forme de string
      const rawAxes: string[] = (Array.isArray(item.axes) ? item.axes : typeof item.axes === 'string' ? [item.axes] : [])
        .map((a: unknown) => String(a).trim())
        .filter(Boolean)

      const knownAxes = rawAxes.filter((a): a is Axis => VALID_AXES.includes(a as typeof VALID_AXES[number]) && a !== 'UNCATEGORIZED')

      const suggestedThemes = rawAxes
        .flatMap((a) => {
          if (a.startsWith('UNCATEGORIZED:')) return [a.slice('UNCATEGORIZED:'.length).trim()]
          if (!VALID_AXES.includes(a as typeof VALID_AXES[number])) return [a]
          return []
        })
        .map((t) => t.toLowerCase().replace(/_/g, ' ').trim())
        .filter((t) => ALLOWED_THEMES.has(t))
        .filter((v, idx, arr) => arr.indexOf(v) === idx)

      const rawAuthors = Array.isArray(item.authors) ? item.authors : []
      results.set(lines[i].index, {
        authors: rawAuthors
          .filter((a): a is Record<string, unknown> => a != null && typeof a === 'object')
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

    return results
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[LLM] Erreur parsing JSON lot :', err)
    return results
  }
}

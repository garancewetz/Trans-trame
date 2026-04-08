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
}

// ─── Configuration ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? ''
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VALID_AXES = [
  'ANTIRACISM', 'AFROFEMINIST', 'QUEER', 'HEALTH', 'HISTORY',
  'INSTITUTIONAL', 'CHILDHOOD', 'CRIP', 'ECOLOGY', 'BODY', 'UNCATEGORIZED',
] as const

const SYSTEM_PROMPT = `Tu es un parser de références bibliographiques. On te donne une liste de lignes numérotées. Pour CHAQUE ligne, extrais les champs bibliographiques et classe l'ouvrage par catégories thématiques. Renvoie un tableau JSON.

Format de réponse (tableau, un objet par ligne, dans l'ordre) :
[{"authors":[{"firstName":"","lastName":""}],"title":"","edition":"","city":"","year":null,"page":"","axes":[]}]

Champs bibliographiques :
- "authors" : TOUS les auteurs/co-auteurs, y compris (dir.), (eds.), (coord.). Sépare prénom et nom.
- "title" : titre complet de l'ouvrage ou article, SANS guillemets, y compris sous-titres après un point ou deux-points. NE PAS inclure "tome", "vol.", numéros de volume dans le titre.
- "edition" : éditeur ou journal/revue. Si double éditeur (ex: "Gallimard/Le Seuil"), garder tel quel.
- "city" : ville de publication si présente, sinon "".
- "year" : première année de publication (nombre). Pour une plage "1976-1984", renvoyer 1976. Si absente, null.
- "page" : pages citées ET/OU indication de volume/tome. Combiner si les deux sont présents. Exemples : "p. 27-29", "tome 2", "Vols. 1, 2, 3", "vol. 2, p. 10-15", "I, II, III et IV". Si absent, "".

Classification thématique ("axes") — choisis 1 à 3 catégories parmi :
- QUEER : études queer, trans, genre, sexualités LGBT, drag, homonormativité
- HEALTH : santé, trauma, soin, maladie, violence, corps médical, deuil
- BODY : corps, sexologie, désir, érotisme, anatomie, reproduction
- HISTORY : histoire, mémoire, archives, siècle, guerre, époque
- ANTIRACISM : race, racisme, blanchité, ségrégation, colonialisme, discrimination
- AFROFEMINIST : afroféminisme, négritude, womanisme, diaspora, postcolonial
- INSTITUTIONAL : politique, droit, sociologie, économie, université, État
- CHILDHOOD : enfance, famille, parentalité, inceste
- CRIP : handicap, validisme, accessibilité, neurodivergence, mad studies
- ECOLOGY : écologie, environnement, climat, anthropocène
- UNCATEGORIZED : si le texte ne correspond à aucune des catégories ci-dessus

Règles :
- Champ absent → "" (strings) ou null (year).
- axes : tableau de strings parmi les 11 catégories ci-dessus. Si aucune catégorie thématique ne correspond, utilise ["UNCATEGORIZED"] (jamais un tableau vide).
- Le tableau DOIT avoir exactement le même nombre d'éléments que de lignes en entrée.

Exemples :
Entrée : Didier Eribon (dir.), Les études gay et lesbiennes, Centre Georges-Pompidou, Paris, 1998.
→ {"authors":[{"firstName":"Didier","lastName":"Eribon"}],"title":"Les études gay et lesbiennes","edition":"Centre Georges-Pompidou","city":"Paris","year":1998,"page":"","axes":["QUEER"]}

Entrée : Richard Dyer, « Male Gay Porn : Coming to Terms », in Jump Cut, Mars, 1985, p. 27-29.
→ {"authors":[{"firstName":"Richard","lastName":"Dyer"}],"title":"Male Gay Porn : Coming to Terms","edition":"Jump Cut","city":"","year":1985,"page":"p. 27-29","axes":["QUEER","BODY"]}

Entrée : Michel Foucault, Histoire de la sexualité. Vols. 1, 2, 3, Gallimard, Paris, 1976-1984.
→ {"authors":[{"firstName":"Michel","lastName":"Foucault"}],"title":"Histoire de la sexualité","edition":"Gallimard","city":"Paris","year":1976,"page":"Vols. 1, 2, 3","axes":["QUEER","BODY","HISTORY"]}

Entrée : Alain Corbin, Histoire du corps, tome 2, Seuil, 2005.
→ {"authors":[{"firstName":"Alain","lastName":"Corbin"}],"title":"Histoire du corps","edition":"Seuil","city":"","year":2005,"page":"tome 2","axes":["BODY","HISTORY"]}`

// ─── Single-line API call (kept for potential future use) ──────────────────────

export async function parseWithLLM(rawLine: string): Promise<LLMParsedResult | null> {
  const results = await parseWithLLMBatch([{ index: 0, raw: rawLine }])
  return results.get(0) ?? null
}

// ─── Batch helper — single API call for all lines ─────────────────────────────

/** Max lines per Gemini call (~50 lines ≈ 7 500 output tokens, under the 8 192 limit). */
const CHUNK_SIZE = 40

/**
 * Parse multiple lines via Gemini. Splits into chunks of CHUNK_SIZE
 * with a 4s pause between chunks to stay under rate limits.
 */
export async function parseWithLLMBatch(
  lines: { index: number; raw: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()

  if (!GEMINI_API_KEY) {
    if (import.meta.env.DEV) console.warn('[LLM] pas de clé VITE_GEMINI_API_KEY — skip')
    return results
  }

  if (lines.length === 0) return results

  // Split into chunks to avoid output token limit
  const chunks: { index: number; raw: string }[][] = []
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    chunks.push(lines.slice(i, i + CHUNK_SIZE))
  }

  let processed = 0
  for (let c = 0; c < chunks.length; c++) {
    if (c > 0) {
      if (import.meta.env.DEV) console.log(`[LLM] pause 4s avant chunk ${c + 1}/${chunks.length}…`)
      await new Promise((r) => setTimeout(r, 4000))
    }
    const chunkResults = await _parseChunk(chunks[c])
    for (const [idx, val] of chunkResults) results.set(idx, val)
    processed += chunks[c].length
    onProgress?.(processed, lines.length)
  }

  return results
}

async function _parseChunk(
  lines: { index: number; raw: string }[],
): Promise<Map<number, LLMParsedResult>> {
  const results = new Map<number, LLMParsedResult>()

  // Build numbered lines for the prompt
  const numberedLines = lines.map((l, i) => `${i + 1}. ${l.raw}`).join('\n')

  if (import.meta.env.DEV) console.log(`[LLM] appel Gemini pour ${lines.length} ligne(s)…`)

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nLignes à parser :\n${numberedLines}` }],
      },
    ],
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

      // Parse the 429 body to get the actual retry delay and check if daily quota is exhausted
      const errorBody = await response.json().catch(() => null)
      const details = errorBody?.error?.details as { '@type': string; retryDelay?: string; violations?: { quotaId: string }[] }[] | undefined

      // If daily quota is exhausted, don't retry — it won't help
      const isDailyExhausted = details?.some((d) =>
        d.violations?.some((v) => v.quotaId?.includes('PerDay')),
      )
      if (isDailyExhausted) {
        if (import.meta.env.DEV) console.warn('[LLM] quota journalier Gemini épuisé — fallback local')
        return results
      }

      if (attempt === MAX_RETRIES) break

      // Use the retry delay from the API, or default to 45s
      const retryInfo = details?.find((d) => d.retryDelay)
      const apiDelay = retryInfo?.retryDelay ? parseFloat(retryInfo.retryDelay) : NaN
      const wait = (!isNaN(apiDelay) ? Math.ceil(apiDelay) + 2 : 45) * 1000

      if (import.meta.env.DEV) console.warn(`[LLM] 429 — retry dans ${wait / 1000}s (${attempt + 1}/${MAX_RETRIES})`)
      await new Promise((r) => setTimeout(r, wait))
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
    }
  }

  try {
    if (!response || !response.ok) {
      if (import.meta.env.DEV) console.warn(`[LLM] erreur HTTP ${response?.status ?? 'no response'} — fallback local`)
      return results
    }

    const data = await response.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) return results

    const parsed: LLMParsedResult[] = JSON.parse(text)

    if (!Array.isArray(parsed)) {
      if (import.meta.env.DEV) console.warn('[LLM] réponse non-tableau:', parsed)
      return results
    }

    if (import.meta.env.DEV) console.log(`[LLM] ${parsed.length} résultat(s) Gemini reçus`)

    for (let i = 0; i < Math.min(parsed.length, lines.length); i++) {
      const item = parsed[i]
      if (!item || (!item.title && (!item.authors || item.authors.length === 0))) continue

      results.set(lines[i].index, {
        authors: Array.isArray(item.authors)
          ? item.authors.map((a) => ({
              firstName: String(a.firstName ?? '').trim(),
              lastName: String(a.lastName ?? '').trim(),
            }))
          : [],
        title: String(item.title ?? '').trim(),
        edition: String(item.edition ?? '').trim(),
        city: String(item.city ?? '').trim(),
        year: typeof item.year === 'number' ? item.year : null,
        page: String(item.page ?? '').trim(),
        axes: Array.isArray(item.axes)
          ? item.axes.filter((a): a is Axis => VALID_AXES.includes(a as typeof VALID_AXES[number]))
          : [],
      })
    }

    if (import.meta.env.DEV && results.size > 0) {
      console.log('[LLM] exemple premier résultat :', results.values().next().value)
    }

    return results
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[LLM] échec appel Gemini :', err)
    return results
  }
}

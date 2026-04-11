// supabase/functions/parse-references/index.ts
// Deno-based Supabase Edge Function that proxies Gemini API calls for
// bibliographic reference parsing, keeping the API key server-side.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Configuration ──────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const CHUNK_SIZE = 40
const MAX_RETRIES = 2

const VALID_AXES = [
  'ANTIRACISM', 'AFROFEMINIST', 'QUEER', 'HEALTH', 'HISTORY',
  'INSTITUTIONAL', 'CHILDHOOD', 'CRIP', 'BODY', 'FEMINIST', 'UNCATEGORIZED',
] as const

const ALLOWED_THEMES = new Set([
  'philosophy', 'psychoanalysis', 'literature', 'science', 'art',
  'religion', 'education', 'media', 'geography', 'technology', 'ecology',
])

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

// ─── Types ──────────────────────────────────────────────────────────────────

type AxisName = typeof VALID_AXES[number]

interface LineInput {
  index: number
  raw: string
}

interface ImageInput {
  base64: string   // base64-encoded image data (no data URI prefix)
  mimeType: string // e.g. "image/jpeg", "image/png", "image/webp"
}

interface ParsedResult {
  authors: { firstName: string; lastName: string }[]
  title: string
  edition: string
  city: string
  year: number | null
  page: string
  axes: string[]
  suggestedThemes: string[]
}

// ─── Gemini call with retry ─────────────────────────────────────────────────

async function callGemini(
  lines: LineInput[],
  apiKey: string,
): Promise<Map<number, ParsedResult>> {
  const results = new Map<number, ParsedResult>()
  const numberedLines = lines.map((l, i) => `${i + 1}. ${l.raw}`).join('\n')

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${SYSTEM_PROMPT}\n\nLines to parse:\n${numberedLines}` },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })

  let response: Response | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(90_000),
        body,
      })

      if (response.status !== 429) break

      const errorBody = await response.json().catch(() => null)
      const details = errorBody?.error?.details as
        | {
            '@type': string
            retryDelay?: string
            violations?: { quotaId: string }[]
          }[]
        | undefined

      const isDailyExhausted = details?.some((d) =>
        d.violations?.some((v) => v.quotaId?.includes('PerDay')),
      )
      if (isDailyExhausted) {
        console.warn('[parse-references] Daily quota exhausted.')
        return results
      }

      if (attempt === MAX_RETRIES) break

      const retryInfo = details?.find((d) => d.retryDelay)
      const apiDelay = retryInfo?.retryDelay
        ? parseFloat(retryInfo.retryDelay)
        : NaN
      const wait = (!isNaN(apiDelay) ? Math.ceil(apiDelay) + 2 : 45) * 1000

      console.warn(
        `[parse-references] 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${wait / 1000}s`,
      )
      await new Promise((r) => setTimeout(r, wait))
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
    }
  }

  if (!response || !response.ok) return results

  const data = await response.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return results

  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) return results

  for (let i = 0; i < Math.min(parsed.length, lines.length); i++) {
    const item = parsed[i] as Record<string, unknown> | null
    if (!item) continue
    results.set(lines[i].index, validateParsedItem(item))
  }

  return results
}

// ─── Shared result validation ──────────────────────────────────────────────

function validateParsedItem(item: Record<string, unknown>): ParsedResult {
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
    (a): a is AxisName =>
      (VALID_AXES as readonly string[]).includes(a) &&
      a !== 'UNCATEGORIZED',
  )

  const suggestedThemes = rawAxes
    .flatMap((a) => {
      if (a.startsWith('UNCATEGORIZED:'))
        return [a.slice('UNCATEGORIZED:'.length).trim()]
      if (!(VALID_AXES as readonly string[]).includes(a)) return [a]
      return []
    })
    .map((t) => t.toLowerCase().replace(/_/g, ' ').trim())
    .filter((t) => ALLOWED_THEMES.has(t))
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
    edition: String(item.edition ?? '').trim(),
    city: String(item.city ?? '').trim(),
    year: typeof item.year === 'number' ? item.year : null,
    page: String(item.page ?? '').trim(),
    axes: knownAxes.length > 0 ? knownAxes : ['UNCATEGORIZED'],
    suggestedThemes,
  }
}

// ─── Gemini call with images (multimodal) ──────────────────────────────────

const IMAGE_SYSTEM_PROMPT = `You are a bibliographic reference parser. You receive one or more images of bibliographies or reference lists. Extract ALL bibliographic references visible in the image(s).

For EACH reference, extract bibliographic fields and classify the work thematically. Return a JSON array.

${SYSTEM_PROMPT.split('\n').slice(1).join('\n')}`

async function callGeminiWithImages(
  images: ImageInput[],
  apiKey: string,
): Promise<Map<number, ParsedResult>> {
  const results = new Map<number, ParsedResult>()

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: IMAGE_SYSTEM_PROMPT },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
  ]

  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })

  let response: Response | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body,
      })

      if (response.status !== 429) break

      const errorBody = await response.json().catch(() => null)
      const details = errorBody?.error?.details as
        | { '@type': string; retryDelay?: string; violations?: { quotaId: string }[] }[]
        | undefined

      const isDailyExhausted = details?.some((d) =>
        d.violations?.some((v) => v.quotaId?.includes('PerDay')),
      )
      if (isDailyExhausted) {
        console.warn('[parse-references] Daily quota exhausted.')
        return results
      }

      if (attempt === MAX_RETRIES) break

      const retryInfo = details?.find((d) => d.retryDelay)
      const apiDelay = retryInfo?.retryDelay
        ? parseFloat(retryInfo.retryDelay)
        : NaN
      const wait = (!isNaN(apiDelay) ? Math.ceil(apiDelay) + 2 : 45) * 1000

      console.warn(
        `[parse-references] 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${wait / 1000}s`,
      )
      await new Promise((r) => setTimeout(r, wait))
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
    }
  }

  if (!response || !response.ok) return results

  const data = await response.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return results

  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) return results

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown> | null
    if (!item) continue
    results.set(i, validateParsedItem(item))
  }

  return results
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const { lines, images } = (await req.json()) as {
      lines?: LineInput[]
      images?: ImageInput[]
    }

    // ── Image mode ──────────────────────────────────────────────────────
    if (Array.isArray(images) && images.length > 0) {
      if (images.length > 5) {
        return new Response(
          JSON.stringify({ error: 'Maximum 5 images per request' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
      const imageResults = await callGeminiWithImages(images, apiKey)
      const allResults: [number, ParsedResult][] = []
      for (const [idx, val] of imageResults) {
        allResults.push([idx, val])
      }
      return new Response(JSON.stringify({ results: allResults }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ── Text mode (existing) ────────────────────────────────────────────
    if (!Array.isArray(lines) || lines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: lines or images array required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Split into chunks of CHUNK_SIZE
    const chunks: LineInput[][] = []
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push(lines.slice(i, i + CHUNK_SIZE))
    }

    const allResults: [number, ParsedResult][] = []

    for (let c = 0; c < chunks.length; c++) {
      // Pause between chunks to avoid rate limiting
      if (c > 0) {
        console.log(
          `[parse-references] pause 4s before chunk ${c + 1}/${chunks.length}`,
        )
        await new Promise((r) => setTimeout(r, 4000))
      }

      const chunkResults = await callGemini(chunks[c], apiKey)
      for (const [idx, val] of chunkResults) {
        allResults.push([idx, val])
      }
    }

    return new Response(JSON.stringify({ results: allResults }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[parse-references] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})

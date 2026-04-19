// supabase/functions/parse-references/index.ts
// Deno-based Supabase Edge Function that proxies Gemini API calls for
// bibliographic reference parsing, keeping the API key server-side.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allowed origins come from the ALLOWED_ORIGINS secret (comma-separated).
// When unset (local dev), we fall back to reflecting the request origin so
// `supabase functions serve` keeps working across ports.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? origin || '*'
      : ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MAX_RETRIES = 2

const VALID_AXES = [
  'ANTIRACISM', 'AFROFEMINIST', 'QUEER', 'HEALTH', 'HISTORY',
  'INSTITUTIONAL', 'CHILDHOOD', 'CRIP', 'BODY', 'FEMINIST', 'UNCATEGORIZED',
] as const

const SYSTEM_PROMPT = `You are a bibliographic reference parser. You receive a list of numbered lines. For EACH line, extract bibliographic fields and classify the work thematically. Return a JSON array.

Context: this is an intersectional corpus mapping intellectual filiations across feminism, afrofeminism, queer studies, disability, race, body politics, and social justice.

Response format (array, one object per line, in order):
[{"authors":[{"firstName":"","lastName":""}],"title":"","originalTitle":"","edition":"","city":"","year":null,"page":"","axes":[],"resourceType":"book"}]

Bibliographic fields:
- "authors": ALL authors/co-authors, including (dir.), (eds.), (coord.). Separate first name and last name.
  * IMPORTANT: For collectives (e.g. "Combahee River Collective") or single-name authors (e.g. "bell hooks"), put the full name in "lastName" and leave "firstName" empty.
- "title": full title including subtitles after a colon or period. WITHOUT quotation marks. Do NOT include "tome", "vol.", volume numbers.
  * For articles, this is the article title; the journal/review name goes in "edition".
- "originalTitle": canonical title in the work's ORIGINAL language, used to group editions and translations of a single work.
  * IF you recognize the reference as a well-known work: output the title as it was first published in its original language. Example: "The Second Sex" → "Le Deuxième Sexe"; "Capital" → "Das Kapital"; "Les Damnés de la terre" → "Les Damnés de la terre".
  * IF the cited title IS already the original title: repeat it verbatim here.
  * IF you do NOT recognize the work, or have ANY uncertainty about its canonical form: output "" (empty string). NEVER guess. A false canonical title corrupts duplicate detection across the corpus.
  * For articles, chapters, and lesser-known works: almost always "".
- "edition": publisher, or journal/review name for articles. If dual publisher (e.g. "Gallimard/Le Seuil"), keep as-is.
- "city": city of publication if present, otherwise "".
- "year": first year of publication (number). For a range "1976-1984", return 1976. If absent, null.
- "page": cited pages AND/OR volume/tome indication. Combine if both present. Examples: "p. 27-29", "tome 2", "Vols. 1, 2, 3", "vol. 2, p. 10-15". If absent, "".

CRITICAL RULE: Ensure that "title" and "authors" are never swapped. For classic authors (e.g., Balzac, Flaubert), extract the person's name even if the source text is ambiguous. If a name like "Le Père Goriot" appears as an author, it is an error; identify "Honoré de Balzac" as the author.

MISSING AUTHOR RULE: When a line contains "[auteur·ice inconnu·e]", the author is missing from the database. You MUST try to identify the author(s) from the title alone using your knowledge. If you recognize the work, return the correct author(s). Only return an empty authors array if you truly cannot identify who wrote the work.

Resource type ("resourceType") — classify the resource as ONE of:
- "book": monograph, essay collection, book chapter
- "article": journal article, magazine piece, newspaper article, blog post
- "podcast": podcast episode or radio broadcast
- "film": documentary, film, video
- "other": when none of the above apply

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
→ {"authors":[{"firstName":"Didier","lastName":"Eribon"}],"title":"Les études gay et lesbiennes","originalTitle":"","edition":"Centre Georges-Pompidou","city":"Paris","year":1998,"page":"","axes":["QUEER"],"resourceType":"book"}

Input: Richard Dyer, « Male Gay Porn : Coming to Terms », in Jump Cut, Mars, 1985, p. 27-29.
→ {"authors":[{"firstName":"Richard","lastName":"Dyer"}],"title":"Male Gay Porn : Coming to Terms","originalTitle":"","edition":"Jump Cut","city":"","year":1985,"page":"p. 27-29","axes":["QUEER","BODY"],"resourceType":"article"}

Input: Audre Lorde, Sister Outsider, Crossing Press, 1984.
→ {"authors":[{"firstName":"Audre","lastName":"Lorde"}],"title":"Sister Outsider","originalTitle":"Sister Outsider","edition":"Crossing Press","city":"","year":1984,"page":"","axes":["AFROFEMINIST","QUEER","FEMINIST"],"resourceType":"book"}

Input: Simone de Beauvoir, The Second Sex, Vintage, New York, 2011.
→ {"authors":[{"firstName":"Simone","lastName":"de Beauvoir"}],"title":"The Second Sex","originalTitle":"Le Deuxième Sexe","edition":"Vintage","city":"New York","year":2011,"page":"","axes":["FEMINIST"],"resourceType":"book"}

Input: Simone de Beauvoir, Le Deuxième Sexe, Gallimard, Paris, 1949.
→ {"authors":[{"firstName":"Simone","lastName":"de Beauvoir"}],"title":"Le Deuxième Sexe","originalTitle":"Le Deuxième Sexe","edition":"Gallimard","city":"Paris","year":1949,"page":"","axes":["FEMINIST"],"resourceType":"book"}

Input: Jacques Lacan, Écrits, Seuil, Paris, 1966.
→ {"authors":[{"firstName":"Jacques","lastName":"Lacan"}],"title":"Écrits","originalTitle":"Écrits","edition":"Seuil","city":"Paris","year":1966,"page":"","axes":["UNCATEGORIZED:psychoanalysis"],"resourceType":"book"}`

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
  /**
   * Canonical title in the work's original language, used to group editions
   * and translations. Empty string when the LLM doesn't recognize the work.
   * See SYSTEM_PROMPT for the conservative extraction rules.
   */
  originalTitle: string
  edition: string
  city: string
  year: number | null
  page: string
  axes: string[]
  suggestedThemes: string[]
  resourceType: string
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
  const CORS_HEADERS = corsHeaders(req)
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // ── Authentication ────────────────────────────────────────────────────
    // We verify the caller's JWT here (rather than at the gateway via
    // `verify_jwt = true`) because the gateway currently validates in HS256
    // while user sessions are issued in ES256 — producing spurious 401s.
    // Delegating to auth.getUser() asks Supabase Auth directly, which knows
    // the right signing key.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase env not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const jwt = authHeader.slice('Bearer '.length).trim()
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      console.warn('[parse-references] Auth rejected:', authError?.message || 'no user')
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Gemini proxy ──────────────────────────────────────────────────────
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

    // One invocation = one Gemini call. The client (parseSmartInput.llm.ts)
    // is responsible for chunking large imports and spacing requests to stay
    // within the Gemini free-tier quota (15 RPM). This keeps each Edge
    // Function call short-lived and well under the wall-clock timeout.
    const chunkResults = await callGemini(lines, apiKey)
    const allResults: [number, ParsedResult][] = Array.from(chunkResults)

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

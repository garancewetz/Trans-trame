// supabase/functions/reconcile-orphans/index.ts
// Deno-based Supabase Edge Function that uses Gemini to reconcile orphaned
// books and authors by analysing import-batch context and graph topology.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Configuration ──────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MAX_RETRIES = 2

const SYSTEM_PROMPT = `You are an expert in intellectual history and bibliographic analysis. You help reconcile missing associations in a citation-mapping database.

CONTEXT: This database maps intellectual filiations (citations between books) in feminist, afrofeminist, queer studies, disability studies, body politics, and social justice. Books are imported from bibliographies. Authors are created as separate entities linked to books.

PROBLEM: Some books have NO AUTHOR assigned ("missingAuthor": true), and some authors exist in the database but are NOT linked to any book ("orphanedAuthors"). These were often imported in the same batch (same "batchKey" = same minute).

DATA YOU RECEIVE:
1. "orphanedBooks" — books that need reconciliation. Each has:
   - "missingAuthor": true if no author is assigned (THIS IS THE PRIMARY PROBLEM TO SOLVE)
   - "hasLinks": whether the book has citation links in the graph
   - "currentAuthors": existing authors if any (empty string if missing)
   - "batchSiblings": other books imported at the same time, with THEIR authors and links
2. "orphanedAuthors" — authors not linked to any book, with their import timestamp

YOUR MAIN TASK — AUTHOR MATCHING (PRIORITY 1):
For each book where "missingAuthor" is true, determine which orphaned author most likely wrote it:
- STRONGEST signal: same batchKey (imported at the same time) + you recognise the author as the writer of this book from your bibliographic knowledge
- STRONG signal: you recognise the title and know who wrote it, even without batch match
- MEDIUM signal: same batchKey and plausible match based on field/topic
- An orphaned author CAN be matched to MULTIPLE books (co-authorship or multiple works)

SECONDARY TASK — CITATION LINKS (PRIORITY 2):
For books where "hasLinks" is false, suggest which existing book's bibliography it came from (based on what batch siblings link to).

Response format — strict JSON, no markdown:
{
  "authorToBook": [
    { "authorId": "...", "bookId": "...", "confidence": "high", "reason": "..." }
  ],
  "bookToSource": [
    { "orphanBookId": "...", "sourceBookId": "...", "confidence": "high", "reason": "..." }
  ],
  "hints": [
    { "bookId": "...", "hint": "..." }
  ]
}

ABOUT "hints":
For books or authors you CANNOT match with confidence, provide a research hint instead — a concrete suggestion to help the user find the answer manually.

CRITICAL: The hints are for a non-technical user (a researcher, not a developer). NEVER mention batchKey, timestamps, IDs, or any technical term. Instead, refer to books and authors BY NAME. Say "importé·e en même temps que [Titre du livre] de [Auteur]" instead of "importé avec le batchKey 2026-04-05T20:25". Use the titles and author names from batchSiblings to make the hint human-readable.

Good hint examples:
- "Importé·e en même temps que « Sister Outsider » d'Audre Lorde et « Ain't I a Woman » de bell hooks. Cherche dans la bibliographie de l'ouvrage source."
- "Spécialiste de [thématique]. Peut-être auteur·ice de [titre d'un ouvrage sans auteur du même import]."
- "Le titre ressemble à un ouvrage de [auteur·ice connu·e], mais iel n'est pas dans la liste des auteur·ices orphelin·es. Vérifie si iel existe déjà dans la base."
Bad hint examples (NEVER DO THIS):
- "Cherchez des ouvrages importés avec le batchKey 2026-04-05T20:25" ← FORBIDDEN, too technical
- "bookId: abc-123" ← FORBIDDEN

The "bookId" field in hints refers to an orphanedBook id OR an orphanedAuthor id (this is for the system, NOT shown to the user).
ALWAYS provide hints for items you cannot match. Do NOT leave items with no match AND no hint.

Rules:
- PRIORITISE authorToBook matches. This is what the user needs most.
- Use your knowledge of feminist, queer, postcolonial, and critical theory bibliography to identify who wrote what.
- Same batchKey between an author and a book is a strong hint they belong together.
- "reason" must be a short explanation in French for the end user.
- IDs in the response MUST match IDs from the input. Never invent IDs.
- Only suggest matches you have genuine confidence in. Omit uncertain ones — but ALWAYS give a hint instead.
- "confidence": "high" = you recognise the work + batch match, "medium" = batch match + plausible, "low" = weak inference.`

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrphanedBookInput {
  id: string
  title: string
  currentAuthors: string
  missingAuthor: boolean
  hasLinks: boolean
  year?: number | null
  batchKey: string
  batchSiblings: {
    title: string
    authors: string
    linkedTo: { id: string; title: string; authors: string }[]
  }[]
}

interface OrphanedAuthorInput {
  id: string
  firstName: string
  lastName: string
  batchKey: string
}

interface ReconcilePayload {
  orphanedBooks: OrphanedBookInput[]
  orphanedAuthors: OrphanedAuthorInput[]
}

interface ReconcileMatch {
  authorId: string
  bookId: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

interface SourceMatch {
  orphanBookId: string
  sourceBookId: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

interface Hint {
  bookId: string
  hint: string
}

interface ReconcileResult {
  authorToBook: ReconcileMatch[]
  bookToSource: SourceMatch[]
  hints: Hint[]
}

// ─── Gemini call with retry ─────────────────────────────────────────────────

async function callGemini(
  payload: ReconcilePayload,
  apiKey: string,
): Promise<ReconcileResult> {
  const userContent = JSON.stringify(payload, null, 2)

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${SYSTEM_PROMPT}\n\nData to reconcile:\n${userContent}` },
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
        console.warn('[reconcile-orphans] Daily quota exhausted.')
        return { authorToBook: [], bookToSource: [], hints: [] }
      }

      if (attempt === MAX_RETRIES) break

      const retryInfo = details?.find((d) => d.retryDelay)
      const apiDelay = retryInfo?.retryDelay
        ? parseFloat(retryInfo.retryDelay)
        : NaN
      const wait = (!isNaN(apiDelay) ? Math.ceil(apiDelay) + 2 : 45) * 1000

      console.warn(
        `[reconcile-orphans] 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${wait / 1000}s`,
      )
      await new Promise((r) => setTimeout(r, wait))
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
    }
  }

  if (!response || !response.ok) {
    return { authorToBook: [], bookToSource: [], hints: [] }
  }

  const data = await response.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return { authorToBook: [], bookToSource: [], hints: [] }

  const parsed: unknown = JSON.parse(text)
  return validateResult(parsed, payload)
}

// ─── Response validation ────────────────────────────────────────────────────

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low'])

function validateResult(raw: unknown, input: ReconcilePayload): ReconcileResult {
  if (!raw || typeof raw !== 'object') {
    return { authorToBook: [], bookToSource: [], hints: [] }
  }

  const obj = raw as Record<string, unknown>

  // Build ID sets for validation
  const validBookIds = new Set(input.orphanedBooks.map((b) => b.id))
  const validAuthorIds = new Set(input.orphanedAuthors.map((a) => a.id))
  const validSourceIds = new Set<string>()
  for (const b of input.orphanedBooks) {
    for (const s of b.batchSiblings) {
      for (const lt of s.linkedTo) validSourceIds.add(lt.id)
    }
  }

  const authorToBook: ReconcileMatch[] = []
  if (Array.isArray(obj.authorToBook)) {
    for (const item of obj.authorToBook) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      if (
        typeof m.authorId === 'string' &&
        typeof m.bookId === 'string' &&
        typeof m.confidence === 'string' &&
        VALID_CONFIDENCE.has(m.confidence) &&
        validAuthorIds.has(m.authorId) &&
        validBookIds.has(m.bookId)
      ) {
        authorToBook.push({
          authorId: m.authorId,
          bookId: m.bookId,
          confidence: m.confidence as 'high' | 'medium' | 'low',
          reason: String(m.reason ?? ''),
        })
      }
    }
  }

  const bookToSource: SourceMatch[] = []
  if (Array.isArray(obj.bookToSource)) {
    for (const item of obj.bookToSource) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      if (
        typeof m.orphanBookId === 'string' &&
        typeof m.sourceBookId === 'string' &&
        typeof m.confidence === 'string' &&
        VALID_CONFIDENCE.has(m.confidence) &&
        validBookIds.has(m.orphanBookId) &&
        validSourceIds.has(m.sourceBookId)
      ) {
        bookToSource.push({
          orphanBookId: m.orphanBookId,
          sourceBookId: m.sourceBookId,
          confidence: m.confidence as 'high' | 'medium' | 'low',
          reason: String(m.reason ?? ''),
        })
      }
    }
  }

  const hints: Hint[] = []
  if (Array.isArray(obj.hints)) {
    for (const item of obj.hints) {
      if (!item || typeof item !== 'object') continue
      const h = item as Record<string, unknown>
      if (typeof h.bookId === 'string' && typeof h.hint === 'string' && h.hint.trim()) {
        hints.push({ bookId: h.bookId, hint: h.hint.trim() })
      }
    }
  }

  return { authorToBook, bookToSource, hints }
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // ── Authentication ────────────────────────────────────────────────────
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
      console.warn('[reconcile-orphans] Auth rejected:', authError?.message || 'no user')
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

    const payload = (await req.json()) as ReconcilePayload

    if (
      (!Array.isArray(payload.orphanedBooks) || payload.orphanedBooks.length === 0) &&
      (!Array.isArray(payload.orphanedAuthors) || payload.orphanedAuthors.length === 0)
    ) {
      return new Response(
        JSON.stringify({ error: 'No orphans to reconcile' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const result = await callGemini(payload, apiKey)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[reconcile-orphans] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})

import type { ParsedAuthor } from './parseSmartInput.types'

export interface GoogleBooksResult {
  title: string
  authors: ParsedAuthor[]
  year: number | null
  publisher: string
  isbn: string
}

interface VolumeInfo {
  title?: string
  authors?: string[]
  publishedDate?: string
  publisher?: string
  industryIdentifiers?: { type: string; identifier: string }[]
}

function parseAuthorName(name: string): ParsedAuthor {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: '', lastName: parts[0] }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function extractYear(dateStr?: string): number | null {
  if (!dateStr) return null
  const m = dateStr.match(/\d{4}/)
  return m ? parseInt(m[0]) : null
}

function extractIsbn(ids?: { type: string; identifier: string }[]): string {
  if (!ids?.length) return ''
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')
  return isbn13?.identifier || isbn10?.identifier || ''
}

/** Simple word-overlap score between 0 and 1. */
function titleRelevance(query: string, result: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, '')
  const qWords = new Set(normalize(query).split(/\s+/).filter((w) => w.length > 2))
  const rWords = new Set(normalize(result).split(/\s+/).filter((w) => w.length > 2))
  if (qWords.size === 0) return 0
  let overlap = 0
  for (const w of qWords) if (rWords.has(w)) overlap++
  return overlap / qWords.size
}

function buildUrl(q: string): string {
  return `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3&printType=books`
}

function pickBest(items: { volumeInfo: VolumeInfo }[], titleHint: string): VolumeInfo | null {
  const candidates: VolumeInfo[] = items.map((i) => i.volumeInfo)
  const hint = titleHint.toLowerCase()
  return candidates.find((v) => v.title?.toLowerCase().includes(hint))
    || candidates.find((v) => hint.includes(v.title?.toLowerCase() || ''))
    || candidates[0]
    || null
}

/**
 * Query Google Books API with structured title + author.
 * Strategy: try intitle:/inauthor: first (precise), fall back to free-text (fuzzy).
 */
export async function lookupGoogleBooks(
  query: { title: string; author: string },
  signal?: AbortSignal,
): Promise<GoogleBooksResult | null> {
  const title = query.title.trim()
  if (title.length < 3) return null
  const author = query.author.trim()

  // 1. Structured query
  const structured = [
    `intitle:${title}`,
    ...(author ? [`inauthor:${author}`] : []),
  ].join('+')

  try {
    let res = await fetch(buildUrl(structured), { signal })
    let data = res.ok ? await res.json() : null

    // 2. Fallback: free-text query with title + author
    if (!data?.items?.length && author) {
      res = await fetch(buildUrl(`${title} ${author}`), { signal })
      data = res.ok ? await res.json() : null
    }

    if (!data?.items?.length) return null

    const best = pickBest(data.items, title)
    if (!best?.title) return null

    // Reject results that have nothing to do with the query
    if (titleRelevance(title, best.title) < 0.3) return null

    return {
      title: best.title,
      authors: (best.authors || []).map(parseAuthorName),
      year: extractYear(best.publishedDate),
      publisher: best.publisher || '',
      isbn: extractIsbn(best.industryIdentifiers),
    }
  } catch {
    return null
  }
}

/**
 * Enrich multiple lines in parallel with Google Books data.
 * Returns a Map<lineIndex, GoogleBooksResult>.
 */
export async function enrichWithGoogleBooks(
  lines: { index: number; title: string; author: string }[],
  concurrency = 6,
  signal?: AbortSignal,
): Promise<Map<number, GoogleBooksResult>> {
  const results = new Map<number, GoogleBooksResult>()
  const queue = [...lines]

  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) return
      const item = queue.shift()!
      const result = await lookupGoogleBooks({ title: item.title, author: item.author }, signal)
      if (result) results.set(item.index, result)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, lines.length) }, () => worker())
  await Promise.all(workers)
  return results
}

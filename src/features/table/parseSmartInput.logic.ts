import { narrowAxes } from '@/common/utils/categories'
import {
  capitalizeWord,
  isAuthorInitial,
  looksLikeName,
  NAME_PARTICLES,
  parseAuthorString,
} from './parseSmartInput.authorString'
import { detectAxes } from './parseSmartInput.detectAxes'
import { parseWithLLMBatch, parseWithLLMImages } from './parseSmartInput.llm'
import type { ExistingNode, ParsedAuthor, ParsedBook } from './parseSmartInput.types'
import { titleSimilarity } from './parseSmartInput.titleSimilarity'
import type { KnownAuthor } from './hooks/useKnownData'

interface KnownDataLower {
  editions: string[]
  editionsLower: string[]
  authorsLower: { firstName: string; lastName: string; full: string }[]
}

function buildKnownLower(
  knownAuthors: KnownAuthor[],
  knownEditions: string[],
): KnownDataLower {
  // Sort by length descending so longest (most specific) match wins
  const sorted = [...knownEditions].sort((a, b) => b.length - a.length)
  return {
    editions: sorted,
    editionsLower: sorted.map((e) => e.toLowerCase()),
    authorsLower: knownAuthors.map((a) => ({
      firstName: a.firstName.toLowerCase(),
      lastName: a.lastName.toLowerCase(),
      full: `${a.firstName} ${a.lastName}`.toLowerCase().trim(),
    })),
  }
}

/** Returns true if `text` matches (or contains) a known edition name. */
function isKnownEdition(text: string, editionsLower: string[]): boolean {
  const t = text.toLowerCase().trim()
  return editionsLower.some((e) => t === e || t.startsWith(e) || e.startsWith(t))
}

/** Returns true if `text` matches a known author (last name or full name). */
function isKnownAuthor(text: string, authorsLower: KnownDataLower['authorsLower']): boolean {
  const t = text.toLowerCase().trim()
  return authorsLower.some((a) => t === a.full || t === a.lastName || t === `${a.lastName} ${a.firstName}`)
}

// ─── Helpers for the elimination parser ─────────────────────────────────────

/** Extract year (4 digits 18xx–20xx) and remove from string. */
function extractYear(str: string): { year: number | null; rest: string } {
  const m = str.match(/\b((18|19|20)\d{2})\b/)
  if (!m) return { year: null, rest: str }
  const year = parseInt(m[1])
  const rest = str
    .replace(/[([]\s*(18|19|20)\d{2}\s*[)\]]/g, ' ')
    .replace(/\b(18|19|20)\d{2}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return { year, rest }
}

/** Extract page references (p. 3-18, pp. 10-20, n° 33, standalone trailing number). */
function extractPages(str: string): { page: string; rest: string } {
  // "p. 3-18", "pp. 10-20", "p.3", "p 3-18"
  const pageRe = /,?\s*(?:pp?\.?\s*\d[\d\s\-–—,]*)/gi
  let page = ''
  let rest = str
  const m = rest.match(pageRe)
  if (m) {
    page = m[0].replace(/^[,\s]+/, '').trim()
    rest = rest.replace(pageRe, ' ').trim()
  }
  // Standalone trailing number after last comma (e.g. ", 33,")
  if (!page) {
    const trailingNum = rest.match(/,\s*(\d{1,4})\s*[.,]?\s*$/)
    if (trailingNum) {
      page = trailingNum[1]
      rest = rest.slice(0, trailingNum.index).trim()
    }
  }
  return { page, rest }
}

/**
 * Find a known edition name inside the string, remove it, and return
 * both the edition name and the remaining string.
 * Longest match wins (editions are pre-sorted by length desc).
 */
function extractEdition(
  str: string,
  editions: string[],
  editionsLower: string[],
): { edition: string; rest: string } {
  const lower = str.toLowerCase()
  for (let i = 0; i < editionsLower.length; i++) {
    if (editionsLower[i].length < 2) continue
    const idx = lower.indexOf(editionsLower[i])
    if (idx !== -1) {
      const before = str.slice(0, idx)
      const after = str.slice(idx + editionsLower[i].length)
      const rest = (before + ' ' + after)
        .replace(/\s{2,}/g, ' ')
        .trim()
      return { edition: editions[i], rest }
    }
  }
  return { edition: '', rest: str }
}

/**
 * Detect article pattern: text between « » or " " is the title,
 * the text after the closing quote (usually a journal name) becomes edition.
 */
function extractArticle(str: string): { title: string; edition: string; rest: string } | null {
  const m = str.match(/[«"]\s*(.+?)\s*[»"]/)
  if (!m || m.index == null) return null
  const title = m[1].trim()
  const before = str.slice(0, m.index).trim()
  let after = str.slice(m.index + m[0].length).trim()
  // After the closing quote, strip leading comma/semicolon and treat as edition (journal)
  after = after.replace(/^[,;\s]+/, '').trim()
  const edition = after.replace(/\.$/, '').trim()
  return { title, edition, rest: before }
}

/**
 * Extract author(s) from the beginning of a string.
 * Handles: "(dir.)", "(eds.)", multi-authors with "et"/"&"/"and",
 * ALL CAPS last names, initials like "G. W.".
 */
function extractAuthors(
  str: string,
  known: KnownDataLower,
): { authors: ParsedAuthor[]; rest: string } {
  // Strip director/editor markers
  const work = str.replace(/\s*\((dir|eds?|coord|éd)\.?\)\s*/gi, ' ').trim()

  // ── ALL CAPS cluster at start ──────────────────────────────────────────
  const capsRe = /^([A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,}(?:[- ][A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,})*)\b/
  const capsMatch = work.match(capsRe)
  if (capsMatch) {
    const capsCluster = capsMatch[1]
    const afterCaps = work.slice(capsCluster.length).trim()
    // Grab first name tokens after caps (up to next comma)
    const commaIdx = afterCaps.indexOf(',')
    const fnPart = commaIdx > -1 ? afterCaps.slice(0, commaIdx).trim() : ''
    const rest = commaIdx > -1 ? afterCaps.slice(commaIdx + 1).trim() : afterCaps

    const ln = capsCluster.split(/[\s-]+/).map(capitalizeWord).join(' ')
    const fn = fnPart.replace(/^[,.\s]+|[,.\s]+$/g, '').trim()
    return { authors: [{ firstName: fn, lastName: ln }], rest }
  }

  // ── Multi-authors with "et" / "&" / "and" ─────────────────────────────
  const etRe = /\s+(?:et|&|and)\s+/i
  const etIdx = work.search(etRe)
  if (etIdx > -1) {
    const etWord = work.match(etRe)![0]
    const beforeEt = work.slice(0, etIdx).trim()
    const afterEt = work.slice(etIdx + etWord.length)

    // After "et", find end of last author name (next comma or separator)
    const sepMatch = afterEt.match(/[,.;]/)
    let lastAuthorStr: string
    let titleRest: string

    if (sepMatch && sepMatch.index != null) {
      lastAuthorStr = afterEt.slice(0, sepMatch.index).trim()
      titleRest = afterEt.slice(sepMatch.index + 1).trim()
    } else {
      // Take up to 4 capitalized words as author name
      const words = afterEt.trim().split(/\s+/)
      let cut = 0
      for (let i = 0; i < Math.min(words.length, 4); i++) {
        if (/^[A-ZÀ-ÖØ-Ý]/.test(words[i]) || NAME_PARTICLES.has(words[i].toLowerCase())) {
          cut = i + 1
        } else break
      }
      if (cut === 0) cut = 1
      lastAuthorStr = words.slice(0, cut).join(' ')
      titleRest = words.slice(cut).join(' ')
    }

    const allRaw = [
      ...beforeEt.split(',').map((s) => s.trim()).filter(Boolean),
      lastAuthorStr,
    ]
    const valid = allRaw.every(
      (a) => a.split(/\s+/).length <= 5 && looksLikeName(a) && !isKnownEdition(a, known.editionsLower),
    )
    if (valid) {
      return { authors: allRaw.map(parseAuthorString), rest: titleRest }
    }
  }

  // ── "Auteur : Titre" colon format ─────────────────────────────────────
  const colonIdx = work.indexOf(' : ')
  if (colonIdx > 0) {
    const before = work.slice(0, colonIdx).trim()
    const after = work.slice(colonIdx + 3).trim()
    const words = before.split(/\s+/).filter(Boolean)
    if (words.length >= 1 && words.length <= 5 && looksLikeName(before) && !isKnownEdition(before, known.editionsLower)) {
      return { authors: [parseAuthorString(before)], rest: after }
    }
  }

  // ── Single author: first comma-separated segment ──────────────────────
  const commaIdx = work.indexOf(',')
  if (commaIdx > -1) {
    let candidate = work.slice(0, commaIdx).trim()
    let afterComma = work.slice(commaIdx + 1).trim()
    const words = candidate.split(/\s+/).filter(Boolean)

    // If the first segment is only initials (e.g. "G. W."), extend to grab the
    // actual last name from the next comma-segment: "G. W." + "Corner" → "G. W. Corner"
    if (words.length >= 1 && words.every((w) => isAuthorInitial(w))) {
      const nextComma = afterComma.indexOf(',')
      const nextSeg = nextComma > -1 ? afterComma.slice(0, nextComma).trim() : afterComma.trim()
      const nextWords = nextSeg.split(/\s+/).filter(Boolean)
      if (nextWords.length >= 1 && nextWords.length <= 3 && looksLikeName(nextSeg)) {
        candidate = candidate + ' ' + nextSeg
        afterComma = nextComma > -1 ? afterComma.slice(nextComma + 1).trim() : ''
      }
    }

    const updatedWords = candidate.split(/\s+/).filter(Boolean)
    const isInitialed = updatedWords.some((w) => isAuthorInitial(w))

    if (updatedWords.length >= 1 && updatedWords.length <= 5 && (looksLikeName(candidate) || isInitialed) && !isKnownEdition(candidate, known.editionsLower)) {
      // Verify this isn't actually a title (check if second segment is an author)
      const secondSeg = afterComma.split(',')[0]?.trim() || ''
      const secondIsAuthor = isKnownAuthor(secondSeg, known.authorsLower)
      const candidateIsAuthor = isKnownAuthor(candidate, known.authorsLower)

      if (candidateIsAuthor || !secondIsAuthor) {
        return { authors: [parseAuthorString(candidate)], rest: afterComma }
      }
    }
  }

  // ── No author detected ────────────────────────────────────────────────
  return { authors: [], rest: work }
}

/** Clean up separators and trailing dots from edges of a string. */
function trimSeparators(str: string): string {
  return str
    .replace(/^[,.\s;:–-]+|[,.\s;:–-]+$/g, '')
    .trim()
}

// ─── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Heuristic confidence score (0–1) for a locally-parsed result.
 * A low score signals the line should be re-parsed by the LLM.
 */
function computeConfidence(info: {
  hasAuthors: boolean
  title: string
  year: number | null
  edition: string
  knownEditionMatch: boolean
  rawLine: string
}): number {
  let score = 0

  // +0.25 if we found at least one author
  if (info.hasAuthors) score += 0.25

  // +0.20 if the title looks substantial (≥ 3 chars)
  if (info.title.length >= 3) score += 0.20

  // +0.15 if we found a year
  if (info.year) score += 0.15

  // +0.15 if a known edition matched; +0.05 for unknown edition string
  if (info.edition) score += info.knownEditionMatch ? 0.15 : 0.05

  // +0.10 bonus: title looks "clean" (no stray commas left inside)
  if (info.title && !info.title.includes(',')) score += 0.10

  // +0.05 bonus: raw line is short/simple (≤ 3 commas)
  const commaCount = (info.rawLine.match(/,/g) || []).length
  if (commaCount <= 3) score += 0.05

  // Penalty: many commas suggest complex structure the parser may have mangled
  if (commaCount >= 5) score -= 0.20

  // Penalty: title suspiciously long (may contain unparsed fields)
  const titleWords = info.title.split(/\s+/).length
  if (titleWords > 12) score -= 0.15
  else if (titleWords > 8) score -= 0.05

  // Penalty: "tome", "vol" left in title suggests the parser couldn't separate it
  if (/\btome\b|\bvol\.?\b/i.test(info.title)) score -= 0.10

  return Math.max(0, Math.min(1, score))
}

/** Threshold below which the LLM is called. 0.70 = needs author + title + year + clean title. */
const LLM_CONFIDENCE_THRESHOLD = 0.70

// ─── Main parseLine (elimination strategy) ──────────────────────────────────

function parseLine(rawLine: string, known: KnownDataLower) {
  // ── 0. Strip leading bullet points / numbered lists ───────────────────────
  let work = rawLine
    .replace(/^[\s*•·◦▪▸►\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()

  if (work.length < 3) return null

  // ── 1. Extract year (anchor) ──────────────────────────────────────────────
  const { year, rest: afterYear } = extractYear(work)
  work = trimSeparators(afterYear)

  // ── 2. Extract pages (anchor) ─────────────────────────────────────────────
  const { page, rest: afterPages } = extractPages(work)
  work = trimSeparators(afterPages)

  // ── 3. Extract known edition (anchor) ─────────────────────────────────────
  const { edition: knownEd, rest: afterEdition } = extractEdition(
    work,
    known.editions,
    known.editionsLower,
  )
  work = trimSeparators(afterEdition)

  // ── 4. Article detection: « title » → title + journal as edition ──────────
  const article = extractArticle(work)
  if (article) {
    const { authors } = extractAuthors(article.rest, known)
    // For articles, the text after quotes is the journal (edition) unless
    // we already found a known edition
    const edition = knownEd || article.edition
    const first = authors[0] || { firstName: '', lastName: '' }
    const title = article.title.replace(/\.$/, '').trim()
    const hasAuthors = authors.some((a) => a.firstName || a.lastName)
    const confidence = computeConfidence({ hasAuthors, title, year, edition, knownEditionMatch: !!knownEd, rawLine })
    return {
      firstName: first.firstName.trim(),
      lastName: first.lastName.trim(),
      authors: authors.filter((a) => a.firstName || a.lastName),
      title,
      edition: edition.trim(),
      page: page.trim(),
      year: year ?? null,
      yearMissing: !year,
      axes: narrowAxes(detectAxes(rawLine)),
      confidence,
      needsLLM: confidence < LLM_CONFIDENCE_THRESHOLD,
    }
  }

  // ── 5. Extract author(s) from beginning ───────────────────────────────────
  const { authors, rest: afterAuthors } = extractAuthors(work, known)

  // ── 6. Title = whatever remains (the residue) ────────────────────────────
  let title = trimSeparators(afterAuthors).replace(/\.$/, '').trim()
  let edition = knownEd

  // Strip trailing short city/publisher-like segments from the title.
  // When a known edition was already extracted, these are likely residual cities.
  // When no edition was found, they may be the actual publisher info.
  if (title.includes(',')) {
    const segments = title.split(',').map((s) => s.trim()).filter(Boolean)
    const titleStarters = new Set([
      'le','la','les','un','une','des','du','au','aux',
      'the','a','an','of','in','on','for','to',
      'histoire','introduction','essai','traité','manuel',
      'tome','vol','volume',
    ])
    let cutIdx = segments.length
    for (let i = segments.length - 1; i >= 1; i--) {
      const seg = segments[i]
      const words = seg.split(/\s+/)
      const firstWord = words[0]?.toLowerCase() || ''
      if (titleStarters.has(firstWord)) break
      if (words.length > 4) break
      // A single capitalized word is likely a city; only strip 1-word segments
      // when we already have an edition (to avoid cutting titles like "Sexual Communities")
      const maxWords = edition ? 1 : 2
      if (looksLikeName(seg) && words.length <= maxWords) {
        cutIdx = i
      } else break
    }
    if (cutIdx < segments.length) {
      title = segments.slice(0, cutIdx).join(', ').trim()
      if (!edition) {
        edition = segments.slice(cutIdx).join(', ').replace(/\.$/, '').trim()
      }
    }
  }

  title = title.replace(/^["«»""'`]+|["«»""'`]+$/g, '').trim()

  const first = authors[0] || { firstName: '', lastName: '' }
  const hasAuthors = authors.some((a) => a.firstName || a.lastName)
  const confidence = computeConfidence({ hasAuthors, title, year, edition, knownEditionMatch: !!knownEd, rawLine })

  return {
    firstName: first.firstName.trim(),
    lastName: first.lastName.trim(),
    authors: authors.filter((a) => a.firstName || a.lastName),
    title: title.trim(),
    edition: edition.trim(),
    page: page.trim(),
    year: year ?? null,
    yearMissing: !year,
    axes: narrowAxes(detectAxes(rawLine)),
    confidence,
    needsLLM: confidence < LLM_CONFIDENCE_THRESHOLD,
  }
}

/**
 * Parses raw multi-line text (OCR / bibliography) into book objects.
 *
 * Chaque résultat inclut :
 *   authors            — tableau [{firstName, lastName}], un par co-auteur détecté
 *   firstName/lastName — premier auteur (rétrocompat affichage)
 *   isDuplicate        — correspondance exacte sur le titre dans existingNodes
 *   isFuzzyDuplicate   — similarité élevée (≥ 0.82) mais pas exacte
 *   existingNode       — nœud existant correspondant (si doublon)
 */
export function parseSmartInput(
  text: string,
  existingNodes: ExistingNode[] = [],
  knownAuthors: KnownAuthor[] = [],
  knownEditions: string[] = [],
): ParsedBook[] {
  const known = buildKnownLower(knownAuthors, knownEditions)
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3)

  return lines
    .map((line): ParsedBook | null => {
      const parsed = parseLine(line, known)
      if (!parsed || !parsed.title) return null

      if (import.meta.env.DEV) {
        console.log(`[parse] confidence=${parsed.confidence?.toFixed(2)} needsLLM=${parsed.needsLLM} | "${line.slice(0, 60)}…"`)
      }

      let bestNode: ExistingNode | null = null
      let bestScore = 0
      for (const n of existingNodes) {
        const score = titleSimilarity(n.title, parsed.title)
        if (score > bestScore) { bestScore = score; bestNode = n }
      }

      // If title matches well, check if authors also match.
      // Same title + different author → downgrade from exact to fuzzy (or ignore).
      let authorMatch = true
      if (bestNode && bestScore >= 0.82) {
        const parsedLast = (parsed.lastName || '').toLowerCase().trim()
        const existLast = String(bestNode.lastName || '').toLowerCase().trim()
        if (parsedLast && existLast && parsedLast !== existLast) {
          authorMatch = false
        }
      }

      const isDuplicate = bestScore === 1 && authorMatch
      const isFuzzyDuplicate = !isDuplicate && bestScore >= 0.82

      return {
        id: crypto.randomUUID(),
        ...parsed,
        isDuplicate,
        isFuzzyDuplicate,
        citation: '',
        existingNode: (isDuplicate || isFuzzyDuplicate) ? bestNode : null,
        raw: line,
      }
    })
    .filter((row): row is ParsedBook => row != null)
}

// ─── Hybrid async version (local + LLM fallback) ──────────────────────────────

/**
 * Async version of parseSmartInput that sends ALL lines to the LLM
 * (Gemini Flash) for higher-quality parsing. Falls back gracefully
 * to local results if the API key is missing or individual calls fail.
 */
export async function parseSmartInputHybrid(
  localResults: ParsedBook[],
  existingNodes: ExistingNode[] = [],
  onProgress?: (done: number, total: number) => void,
): Promise<ParsedBook[]> {
  // Send ALL lines to LLM
  const allCandidates = localResults.map((r, i) => ({ index: i, raw: r.raw }))
  const llmResults = await parseWithLLMBatch(allCandidates, onProgress)

  if (llmResults.size === 0) return localResults

  // Step 3: merge LLM results back, re-run duplicate detection
  const merged = localResults.map((item, idx) => {
    const llm = llmResults.get(idx)
    if (!llm) return item

    const authors = llm.authors.length > 0 ? llm.authors : item.authors
    const first = authors[0] || { firstName: '', lastName: '' }
    const title = llm.title || item.title
    const edition = llm.edition
      ? (llm.city ? `${llm.edition}, ${llm.city}` : llm.edition)
      : item.edition

    // Re-run duplicate detection on the LLM title
    let bestNode: ExistingNode | null = null
    let bestScore = 0
    for (const n of existingNodes) {
      const score = titleSimilarity(n.title, title)
      if (score > bestScore) { bestScore = score; bestNode = n }
    }
    let authorMatch = true
    if (bestNode && bestScore >= 0.82) {
      const parsedLast = (first.lastName || '').toLowerCase().trim()
      const existLast = String(bestNode.lastName || '').toLowerCase().trim()
      if (parsedLast && existLast && parsedLast !== existLast) authorMatch = false
    }
    const isDuplicate = bestScore === 1 && authorMatch
    const isFuzzyDuplicate = !isDuplicate && bestScore >= 0.82

    return {
      ...item,
      authors: authors.filter((a) => a.firstName || a.lastName),
      firstName: first.firstName.trim(),
      lastName: first.lastName.trim(),
      title: title.trim(),
      edition: edition.trim(),
      page: llm.page || item.page,
      year: llm.year ?? item.year,
      yearMissing: !llm.year && item.yearMissing,
      axes: llm.axes.length > 0 ? llm.axes : item.axes,
      isDuplicate,
      isFuzzyDuplicate,
      existingNode: (isDuplicate || isFuzzyDuplicate) ? bestNode : null,
      confidence: 0.95,
      needsLLM: false,
      parsedByLLM: true,
    }
  })

  return merged
}

// ─── Image-based parsing (fully LLM) ────────────────────────────────────────

/**
 * Parses bibliographic references from images using Gemini multimodal OCR.
 * Bypasses local parsing entirely — everything goes through the LLM.
 */
export async function parseSmartInputFromImages(
  images: { base64: string; mimeType: string }[],
  existingNodes: ExistingNode[] = [],
  onProgress?: (done: number, total: number) => void,
): Promise<ParsedBook[]> {
  const llmResults = await parseWithLLMImages(images, onProgress)

  if (llmResults.size === 0) return []

  const results: ParsedBook[] = []

  for (const [, item] of llmResults) {
    if (!item.title) continue

    const authors = item.authors.filter((a) => a.firstName || a.lastName)
    const first = authors[0] || { firstName: '', lastName: '' }
    const title = item.title.trim()
    const edition = item.edition
      ? (item.city ? `${item.edition}, ${item.city}` : item.edition)
      : ''

    // Duplicate detection
    let bestNode: ExistingNode | null = null
    let bestScore = 0
    for (const n of existingNodes) {
      const score = titleSimilarity(n.title ?? '', title)
      if (score > bestScore) { bestScore = score; bestNode = n }
    }
    let authorMatch = true
    if (bestNode && bestScore >= 0.82) {
      const parsedLast = (first.lastName || '').toLowerCase().trim()
      const existLast = String(bestNode.lastName ?? '').toLowerCase().trim()
      if (parsedLast && existLast && parsedLast !== existLast) authorMatch = false
    }
    const isDuplicate = bestScore === 1 && authorMatch
    const isFuzzyDuplicate = !isDuplicate && bestScore >= 0.82

    results.push({
      id: crypto.randomUUID(),
      authors,
      firstName: first.firstName.trim(),
      lastName: first.lastName.trim(),
      title,
      edition: edition.trim(),
      page: item.page || '',
      year: item.year,
      yearMissing: !item.year,
      axes: item.axes.length > 0 ? item.axes : ['UNCATEGORIZED' as ParsedBook['axes'][number]],
      isDuplicate,
      isFuzzyDuplicate,
      citation: '',
      existingNode: (isDuplicate || isFuzzyDuplicate) ? bestNode : null,
      raw: `[image import]`,
      confidence: 0.95,
      needsLLM: false,
      parsedByLLM: true,
    })
  }

  return results
}

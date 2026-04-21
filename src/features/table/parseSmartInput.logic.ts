import { narrowAxes } from '@/common/utils/categories'
import { looksLikeName } from './parseSmartInput.authorString'
import { detectAxes } from './parseSmartInput.detectAxes'
import { findDuplicate } from './parseSmartInput.duplicates'
import {
  computeConfidence,
  extractArticle,
  extractAuthors,
  extractEdition,
  extractPages,
  extractYear,
  LLM_CONFIDENCE_THRESHOLD,
  trimSeparators,
} from './parseSmartInput.extractors'
import { buildKnownLower, type KnownDataLower } from './parseSmartInput.knownData'
import { parseWithLLMBatch, parseWithLLMImages } from './parseSmartInput.llm'
import type { ExistingNode, ParsedBook } from './parseSmartInput.types'
import type { KnownAuthor } from './hooks/useKnownData'

function parseLine(rawLine: string, known: KnownDataLower) {
  // Strip leading bullet points / numbered lists
  let work = rawLine
    .replace(/^[\s*•·◦▪▸►\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()

  if (work.length < 3) return null

  const { year, rest: afterYear } = extractYear(work)
  work = trimSeparators(afterYear)
  const { page, rest: afterPages } = extractPages(work)
  work = trimSeparators(afterPages)
  const { edition: knownEd, rest: afterEdition } = extractEdition(
    work,
    known.editions,
    known.editionsLower,
  )
  work = trimSeparators(afterEdition)

  const article = extractArticle(work)
  if (article) {
    const { authors } = extractAuthors(article.rest, known)
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

  const { authors, rest: afterAuthors } = extractAuthors(work, known)
  let title = trimSeparators(afterAuthors).replace(/\.$/, '').trim()
  let edition = knownEd

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

/** Parses raw multi-line text (OCR / bibliography) into book objects. */
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

      const { isDuplicate, isFuzzyDuplicate, existingNode } =
        findDuplicate(parsed.title, parsed.lastName, existingNodes)

      return {
        id: crypto.randomUUID(),
        ...parsed,
        originalTitle: null,
        isDuplicate,
        isFuzzyDuplicate,
        citation: '',
        existingNode,
        raw: line,
      }
    })
    .filter((row): row is ParsedBook => row != null)
}

/** Async hybrid: sends all lines to the LLM, falls back to local results. */
export async function parseSmartInputHybrid(
  localResults: ParsedBook[],
  existingNodes: ExistingNode[] = [],
  onProgress?: (done: number, total: number) => void,
): Promise<ParsedBook[]> {
  const allCandidates = localResults.map((r, i) => ({ index: i, raw: r.raw }))
  const llmResults = await parseWithLLMBatch(allCandidates, onProgress)

  if (llmResults.size === 0) return localResults

  return localResults.map((item, idx) => {
    const llm = llmResults.get(idx)
    if (!llm) return item

    const authors = llm.authors.length > 0 ? llm.authors : item.authors
    const first = authors[0] || { firstName: '', lastName: '' }
    const title = llm.title || item.title
    const edition = llm.edition
      ? (llm.city ? `${llm.edition}, ${llm.city}` : llm.edition)
      : item.edition
    const { isDuplicate, isFuzzyDuplicate, existingNode } =
      findDuplicate(title, first.lastName, existingNodes)

    return {
      ...item,
      authors: authors.filter((a) => a.firstName || a.lastName),
      firstName: first.firstName.trim(),
      lastName: first.lastName.trim(),
      title: title.trim(),
      originalTitle: llm.originalTitle ? llm.originalTitle : item.originalTitle,
      edition: edition.trim(),
      page: llm.page || item.page,
      year: llm.year ?? item.year,
      yearMissing: !llm.year && item.yearMissing,
      axes: llm.axes.length > 0 ? llm.axes : item.axes,
      isDuplicate,
      isFuzzyDuplicate,
      existingNode,
      confidence: 0.95,
      needsLLM: false,
      parsedByLLM: true,
      suggestedThemes: llm.suggestedThemes.length > 0 ? llm.suggestedThemes : item.suggestedThemes,
      resourceType: llm.resourceType.trim()
        ? llm.resourceType
        : undefined,
    }
  })
}

/** Parses bibliographic references from images via Gemini multimodal OCR. */
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

    const { isDuplicate, isFuzzyDuplicate, existingNode } =
      findDuplicate(title, first.lastName, existingNodes)

    results.push({
      id: crypto.randomUUID(),
      authors,
      firstName: first.firstName.trim(),
      lastName: first.lastName.trim(),
      title,
      originalTitle: item.originalTitle || null,
      edition: edition.trim(),
      page: item.page || '',
      year: item.year,
      yearMissing: !item.year,
      axes: item.axes.length > 0 ? item.axes : ['UNCATEGORIZED' as ParsedBook['axes'][number]],
      isDuplicate,
      isFuzzyDuplicate,
      citation: '',
      existingNode,
      raw: `[image import]`,
      confidence: 0.95,
      needsLLM: false,
      parsedByLLM: true,
      suggestedThemes: item.suggestedThemes.length > 0 ? item.suggestedThemes : undefined,
      resourceType: item.resourceType?.trim() ? item.resourceType : undefined,
    })
  }

  return results
}

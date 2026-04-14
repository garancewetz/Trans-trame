import {
  capitalizeWord,
  isAuthorInitial,
  looksLikeName,
  NAME_PARTICLES,
  parseAuthorString,
} from './parseSmartInput.authorString'
import type { KnownDataLower } from './parseSmartInput.knownData'
import { isKnownAuthor, isKnownEdition } from './parseSmartInput.knownData'
import type { ParsedAuthor } from './parseSmartInput.types'

/** Extract year (4 digits 18xx–20xx) and remove from string. */
export function extractYear(str: string): { year: number | null; rest: string } {
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
export function extractPages(str: string): { page: string; rest: string } {
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
export function extractEdition(
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
export function extractArticle(str: string): { title: string; edition: string; rest: string } | null {
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
export function extractAuthors(
  str: string,
  known: KnownDataLower,
): { authors: ParsedAuthor[]; rest: string } {
  // Strip director/editor markers
  const work = str.replace(/\s*\((dir|eds?|coord|éd)\.?\)\s*/gi, ' ').trim()

  // ALL CAPS cluster at start
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

  // Multi-authors with "et" / "&" / "and"
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

  // "Auteur : Titre" colon format
  const colonIdx = work.indexOf(' : ')
  if (colonIdx > 0) {
    const before = work.slice(0, colonIdx).trim()
    const after = work.slice(colonIdx + 3).trim()
    const words = before.split(/\s+/).filter(Boolean)
    if (words.length >= 1 && words.length <= 5 && looksLikeName(before) && !isKnownEdition(before, known.editionsLower)) {
      return { authors: [parseAuthorString(before)], rest: after }
    }
  }

  // Single author: first comma-separated segment
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

  // No author detected
  return { authors: [], rest: work }
}

/** Clean up leading/trailing separators and dots. */
export function trimSeparators(str: string): string {
  return str
    .replace(/^[,.\s;:–-]+|[,.\s;:–-]+$/g, '')
    .trim()
}

// ─── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Heuristic confidence score (0–1) for a locally-parsed result.
 * A low score signals the line should be re-parsed by the LLM.
 */
export function computeConfidence(info: {
  hasAuthors: boolean
  title: string
  year: number | null
  edition: string
  knownEditionMatch: boolean
  rawLine: string
}): number {
  let score = 0

  if (info.hasAuthors) score += 0.25
  if (info.title.length >= 3) score += 0.20
  if (info.year) score += 0.15
  if (info.edition) score += info.knownEditionMatch ? 0.15 : 0.05
  if (info.title && !info.title.includes(',')) score += 0.10
  const commaCount = (info.rawLine.match(/,/g) || []).length
  if (commaCount <= 3) score += 0.05
  if (commaCount >= 5) score -= 0.20
  const titleWords = info.title.split(/\s+/).length
  if (titleWords > 12) score -= 0.15
  else if (titleWords > 8) score -= 0.05
  if (/\btome\b|\bvol\.?\b/i.test(info.title)) score -= 0.10

  return Math.max(0, Math.min(1, score))
}

/** Threshold below which the LLM is called. 0.70 = needs author + title + year + clean title. */
export const LLM_CONFIDENCE_THRESHOLD = 0.70

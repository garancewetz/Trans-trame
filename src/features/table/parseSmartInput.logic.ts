import { narrowAxes } from '@/common/utils/categories'
import {
  capitalizeWord,
  isAuthorInitial,
  looksLikeName,
  NAME_PARTICLES,
  parseAuthorString,
} from './parseSmartInput.authorString'
import { detectAxes } from './parseSmartInput.detectAxes'
import type { ExistingNode, ParsedAuthor, ParsedBook } from './parseSmartInput.types'
import { titleSimilarity } from './parseSmartInput.titleSimilarity'
import type { KnownAuthor } from './hooks/useKnownData'

const CURRENT_YEAR = new Date().getFullYear()

interface KnownDataLower {
  editionsLower: string[]
  authorsLower: { firstName: string; lastName: string; full: string }[]
}

function buildKnownLower(
  knownAuthors: KnownAuthor[],
  knownEditions: string[],
): KnownDataLower {
  return {
    editionsLower: knownEditions.map((e) => e.toLowerCase()),
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

function parseLine(rawLine: string, known: KnownDataLower) {
  // ── 1. Strip leading bullet points / numbered lists ───────────────────────
  const line = rawLine
    .replace(/^[\s*•·◦▪▸►\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()

  if (line.length < 3) return null

  // ── 2. Extract year ───────────────────────────────────────────────────────
  const yearMatch = line.match(/\b(18|19|20)\d{2}\b/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null

  // ── 3. Remove year from string ────────────────────────────────────────────
  const cleaned = line
    .replace(/[([]\s*(18|19|20)\d{2}\s*[)\]]/g, ' ')
    .replace(/\b(18|19|20)\d{2}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[,.\s;:–-]+|[,.\s;:–-]+$/g, '')
    .trim()

  let firstName = ''
  let lastName = ''
  let title = ''
  let edition = ''
  let authors: ParsedAuthor[] = []

  // ── 4. Colon separator (highest priority): "Auteur : Titre" ──────────────
  // Also handles multi-authors before colon: "Ehrenreich et English : Titre"
  // Priority: if " : " exists with valid author(s) before it, use this format.
  const colonIdx = cleaned.indexOf(' : ')
  if (colonIdx > 0) {
    const beforeColon = cleaned.slice(0, colonIdx).trim()
    const afterColon = cleaned.slice(colonIdx + 3).trim()

    // Check if beforeColon contains "et"/"&"/"and" → multi-author colon format
    const etRe = /\s+(?:et|&|and)\s+/i
    const etInAuthor = beforeColon.search(etRe)

    if (etInAuthor > -1) {
      const etWord = beforeColon.match(etRe)![0]
      const allRawAuthors = [
        ...beforeColon.slice(0, etInAuthor).split(',').map((s) => s.trim()).filter(Boolean),
        beforeColon.slice(etInAuthor + etWord.length).trim(),
      ]
      const looksLikeAuthors = allRawAuthors.every(
        (a) => a.split(/\s+/).length <= 5 && looksLikeName(a) && !isKnownEdition(a, known.editionsLower),
      )
      if (looksLikeAuthors) {
        authors = allRawAuthors.map(parseAuthorString)
        firstName = authors[0]?.firstName || ''
        lastName = authors[0]?.lastName || ''
      }
    }

    // Single author before colon
    if (!authors.length) {
      const beforeWords = beforeColon.split(/\s+/).filter(Boolean)
      if (
        beforeWords.length >= 1 &&
        beforeWords.length <= 5 &&
        looksLikeName(beforeColon) &&
        !isKnownEdition(beforeColon, known.editionsLower)
      ) {
        const parsed = parseAuthorString(beforeColon)
        firstName = parsed.firstName
        lastName = parsed.lastName
        authors = [{ firstName, lastName }]
      }
    }

    // Extract title from after colon (strip parenthetical publication info)
    if (authors.length) {
      const withoutParens = afterColon.replace(/\s*\([^)]*\)\s*\.?\s*$/, '').trim()
      const titleParts = withoutParens.split(',').map((p) => p.trim())
      title = (titleParts[0] || '').replace(/\.$/, '').trim()
      if (titleParts.length > 1) {
        const rest = titleParts.slice(1).join(', ').replace(/\.$/, '').trim()
        if (rest) edition = rest
      }
    }
  }

  // ── 4b. Multi-auteurs sans colon : "Pardo et Delor, Titre" ─────────────
  if (!authors.length) {
    const etRe = /\s+(?:et|&|and)\s+/i
    const etIdx = cleaned.search(etRe)

    if (etIdx > -1) {
      const etWord = cleaned.match(etRe)![0]
      const beforeEt = cleaned.slice(0, etIdx).trim()
      const afterEt = cleaned.slice(etIdx + etWord.length)

      // Après "et", trouver où finit le dernier auteur (séparateur , . ;)
      const sepMatch = afterEt.match(/[,.;]/)
      let lastAuthorStr: string
      let titleAndRest: string

      if (sepMatch && sepMatch.index != null) {
        lastAuthorStr = afterEt.slice(0, sepMatch.index).trim()
        titleAndRest = afterEt.slice(sepMatch.index + 1).trim()
      } else {
        // Heuristique par mots (max 4 mots-nom)
        const TITLE_STARTERS = new Set([
          'le','la','les','un','une','des','du','au','aux',
          'the','a','an','of','in','on','for','to',
          'histoire','introduction','essai','traité','manuel',
          'sociologie','philosophie','politique','critique','analyse',
        ])
        const words = afterEt.trim().split(/\s+/)
        let cut = 0
        for (let i = 0; i < Math.min(words.length, 4); i++) {
          const w = words[i]
          if (TITLE_STARTERS.has(w.toLowerCase())) break
          if (/^[A-ZÀ-ÖØ-Ý]/.test(w) || NAME_PARTICLES.has(w.toLowerCase())) {
            cut = i + 1
          } else break
        }
        if (cut === 0) cut = 1
        lastAuthorStr = words.slice(0, cut).join(' ')
        titleAndRest = words.slice(cut).join(' ')
      }

      const allRawAuthors = [
        ...beforeEt.split(',').map((s) => s.trim()).filter(Boolean),
        lastAuthorStr,
      ]

      const looksLikeAuthors = allRawAuthors.every(
        (a) => a.split(/\s+/).length <= 5 && looksLikeName(a) && !isKnownEdition(a, known.editionsLower),
      )

      if (looksLikeAuthors) {
        authors = allRawAuthors.map(parseAuthorString)
        firstName = authors[0]?.firstName || ''
        lastName = authors[0]?.lastName || ''

        const afterParts = titleAndRest.split(',').map((p) => p.trim())
        title = (afterParts[0] || '').replace(/\.$/, '').trim()
        edition = afterParts.length > 1 ? afterParts.slice(1).join(', ').replace(/\.$/, '').trim() : ''
      }
    }
  }

  // ── 5. ALL CAPS cluster (French bib: "BEAUVOIR Simone de" or "DE BEAUVOIR") ─
  if (!authors.length) {
    const capsRe = /\b([A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,}(?:[- ][A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,})*)\b/
    const allCapsMatch = cleaned.match(capsRe)

    if (allCapsMatch) {
      const capsCluster = allCapsMatch[1]
      const capsEnd = cleaned.indexOf(capsCluster) + capsCluster.length
      const afterCaps = cleaned.slice(capsEnd)

      const commaOffset = afterCaps.indexOf(',')
      const dotOffset = afterCaps.indexOf('.')

      let sepOffset = -1
      if (commaOffset > -1 && commaOffset <= 35) sepOffset = commaOffset
      else if (dotOffset > -1 && dotOffset <= 35) sepOffset = dotOffset

      let authorPart, titlePart

      if (sepOffset > -1) {
        authorPart = cleaned.slice(0, capsEnd + sepOffset).trim()
        titlePart = cleaned.slice(capsEnd + sepOffset + 1).trim()
      } else {
        const firstSep = Math.min(
          cleaned.indexOf(',') > -1 ? cleaned.indexOf(',') : Infinity,
          cleaned.indexOf('.') > -1 ? cleaned.indexOf('.') : Infinity
        )
        if (firstSep < Infinity) {
          authorPart = cleaned.slice(0, firstSep).trim()
          titlePart = cleaned.slice(firstSep + 1).trim()
        } else {
          authorPart = ''
          titlePart = cleaned
        }
      }

      lastName = capsCluster.split(/[\s-]+/).map(capitalizeWord).join(' ')
      firstName = authorPart
        .replace(capsCluster, '')
        .replace(/^[,.\s]+|[,.\s]+$/g, '')
        .trim()

      if (titlePart) {
        const titleParts = titlePart.split(',').map((p) => p.trim())
        title = titleParts[0].replace(/\.$/, '').trim()
        edition = titleParts.length > 1 ? titleParts.slice(1).join(', ').replace(/\.$/, '').trim() : ''
      }
      authors = [{ firstName, lastName }]
    } else {
      // ── 6. Comma / period-based splitting (no ALL CAPS) ──────────────────
      const hasSeparatingPeriods = !cleaned.includes(',') && /\.\s+[A-ZÀÁÂÃ\u00C0-\u00DC]/.test(cleaned)
      const normalized = hasSeparatingPeriods
        ? cleaned.replace(/\.\s+/g, ', ').replace(/\.$/, '')
        : cleaned

      const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean)

      if (parts.length >= 2) {
        const firstPart = parts[0]
        const words = firstPart.split(/\s+/).filter(Boolean)
        // Title-first heuristic: if the second part looks like an author name
        // and the first part doesn't strongly look like one, treat as Title, Author
        const secondPart = parts[1] || ''
        const secondWords = secondPart.split(/\s+/).filter(Boolean)
        const secondLooksLikeName = (secondWords.length >= 2 && secondWords.length <= 4 && looksLikeName(secondPart) && !isKnownEdition(secondPart, known.editionsLower)) || isKnownAuthor(secondPart, known.authorsLower)
        const firstLooksLikeAuthor = (words.length <= 4 && looksLikeName(firstPart) && !secondLooksLikeName && !isKnownEdition(firstPart, known.editionsLower)) || isKnownAuthor(firstPart, known.authorsLower)

        if (firstLooksLikeAuthor) {
          let titleIndex
          if (words.length === 1) {
            lastName = words[0]
            if (parts.length >= 3 && isAuthorInitial(parts[1])) {
              firstName = parts[1].replace('.', '').trim()
              titleIndex = 2
            } else {
              titleIndex = 1
            }
          } else {
            const firstWordIsLower = /^[a-zàáâãäçèéêëìíîïñòóôùúûü]/.test(words[0])
            if (firstWordIsLower) {
              firstName = words[0]
              lastName = words.slice(1).join(' ')
            } else {
              firstName = words.slice(0, -1).join(' ')
              lastName = words[words.length - 1]
            }
            titleIndex = 1
          }
          title = (parts[titleIndex] || '').replace(/\.$/, '').trim()
          const editionParts = parts.slice(titleIndex + 1)
          if (editionParts.length) edition = editionParts.join(', ').replace(/\.$/, '').trim()
        } else {
          title = firstPart.replace(/\.$/, '').trim()
          const rest = parts.slice(1)
          const authorParts: string[] = []
          const editionParts: string[] = []
          for (const p of rest) {
            const w = p.split(/\s+/).filter(Boolean)
            if (isKnownEdition(p, known.editionsLower)) {
              editionParts.push(p)
            } else if (isKnownAuthor(p, known.authorsLower)) {
              authorParts.push(p)
            } else if (w.length <= 4 && looksLikeName(p) && !authorParts.length && !editionParts.length) {
              authorParts.push(p)
            } else if (authorParts.length && w.length <= 4 && looksLikeName(p) && !editionParts.length) {
              authorParts.push(p)
            } else {
              editionParts.push(p)
            }
          }
          if (authorParts.length) {
            authors = authorParts.map(parseAuthorString)
            firstName = authors[0]?.firstName || ''
            lastName = authors[0]?.lastName || ''
          }
          if (editionParts.length) edition = editionParts.join(', ').replace(/\.$/, '').trim()
        }
      } else {
        title = cleaned.replace(/\.$/, '').trim()
      }

      authors = [{ firstName, lastName }]
    }
  }

  title = title.replace(/^["«»""'`]+|["«»""'`]+$/g, '').trim()

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    authors: authors.filter((a) => a.firstName || a.lastName),
    title: title.trim(),
    edition: edition.trim(),
    page: '',
    year: year || CURRENT_YEAR,
    yearMissing: !year,
    axes: narrowAxes(detectAxes(rawLine)),
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

      let bestNode: ExistingNode | null = null
      let bestScore = 0
      for (const n of existingNodes) {
        const score = titleSimilarity(n.title, parsed.title)
        if (score > bestScore) { bestScore = score; bestNode = n }
      }

      const isDuplicate = bestScore === 1
      const isFuzzyDuplicate = !isDuplicate && bestScore >= 0.82

      return {
        id: crypto.randomUUID(),
        ...parsed,
        isDuplicate,
        isFuzzyDuplicate,
        existingNode: (isDuplicate || isFuzzyDuplicate) ? bestNode : null,
        raw: line,
      }
    })
    .filter((row): row is ParsedBook => row != null)
}

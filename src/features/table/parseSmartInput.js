const CURRENT_YEAR = new Date().getFullYear()

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function isInitial(s) {
  return /^[A-ZÀ-Ü]\.?$/.test(s.trim())
}

function parseLine(rawLine) {
  // ── 1. Strip leading bullet points / numbered lists ───────────────────────
  let line = rawLine
    .replace(/^[\s*•·◦▪▸►\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()

  if (line.length < 3) return null

  // ── 2. Extract year ───────────────────────────────────────────────────────
  const yearMatch = line.match(/\b(18|19|20)\d{2}\b/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null

  // ── 3. Remove year from string ────────────────────────────────────────────
  let cleaned = line
    .replace(/[(\[]\s*(18|19|20)\d{2}\s*[)\]]/g, ' ')
    .replace(/\b(18|19|20)\d{2}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[,.\s;:–-]+|[,.\s;:–-]+$/g, '')
    .trim()

  let firstName = ''
  let lastName = ''
  let title = ''

  // ── 4. Multi-author: "Pardo et Delor" or "Smith & Jones" ─────────────────
  // Detected before comma split: "Author1 et|& Author2, Title"
  const multiAuthorMatch = cleaned.match(
    /^([\w\sÀ-ÖØ-öø-ÿ]+?)\s+(?:et|&|and)\s+([\w\sÀ-ÖØ-öø-ÿ]+?)(?:,|$)/i
  )

  if (multiAuthorMatch) {
    const a1 = multiAuthorMatch[1].trim()
    const a2 = multiAuthorMatch[2].trim()
    const fullMatch = multiAuthorMatch[0]
    lastName = `${a1} & ${a2}`
    firstName = ''
    // Title is everything after the full author match
    const afterAuthors = cleaned.slice(fullMatch.length).replace(/^[,.\s]+/, '').trim()
    title = afterAuthors.split(',')[0].replace(/\.$/, '').trim()
  }

  // ── 5. ALL CAPS cluster (French bib: "BEAUVOIR Simone de" or "DE BEAUVOIR") ─
  else {
    const capsRe = /\b([A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,}(?:[- ][A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,})*)\b/
    const allCapsMatch = cleaned.match(capsRe)

    if (allCapsMatch) {
      const capsCluster = allCapsMatch[1]
      const capsEnd = cleaned.indexOf(capsCluster) + capsCluster.length
      const afterCaps = cleaned.slice(capsEnd)

      // Try comma first, then period as fallback separator
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

      lastName = capsCluster.split(/[\s-]+/).map(capitalize).join(' ')
      firstName = authorPart
        .replace(capsCluster, '')
        .replace(/^[,.\s]+|[,.\s]+$/g, '')
        .trim()

      title = titlePart ? titlePart.split(',')[0].replace(/\.$/, '').trim() : ''

    } else {
      // ── 6. Comma / period-based splitting (no ALL CAPS) ──────────────────
      // Normalize: if periods are used as separators instead of commas, convert
      // "Butler J. Gender Trouble." → treat '. ' as potential separator
      const hasSeparatingPeriods = !cleaned.includes(',') && /\.\s+[A-ZÀÁÂÃ\u00C0-\u00DC]/.test(cleaned)
      const normalized = hasSeparatingPeriods
        ? cleaned.replace(/\.\s+/g, ', ').replace(/\.$/, '')
        : cleaned

      const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean)

      if (parts.length >= 2) {
        const firstPart = parts[0]
        const words = firstPart.split(/\s+/).filter(Boolean)
        const looksLikeAuthor = words.length <= 4

        if (looksLikeAuthor) {
          if (words.length === 1) {
            lastName = words[0]
            if (parts.length >= 3 && isInitial(parts[1])) {
              firstName = parts[1].replace('.', '').trim()
              title = parts.slice(2)[0].replace(/\.$/, '').trim()
            } else {
              title = parts[1].replace(/\.$/, '').trim()
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
            title = parts.slice(1)[0].replace(/\.$/, '').trim()
          }
        } else {
          title = firstPart.replace(/\.$/, '').trim()
        }
      } else {
        title = cleaned.replace(/\.$/, '').trim()
      }
    }
  }

  title = title.replace(/^["«»""'`]+|["«»""'`]+$/g, '').trim()

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    title: title.trim(),
    year: year || CURRENT_YEAR,
    yearMissing: !year,
    axes: [],
  }
}

// Normalize title for comparison: lowercase, strip punctuation, collapse spaces
function normTitle(s) {
  return s
    .toLowerCase()
    .replace(/[^\wàáâãäçèéêëìíîïñòóôùúûü\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Returns overlap ratio [0–1] between two normalized title strings
function titleSimilarity(a, b) {
  const s1 = normTitle(a)
  const s2 = normTitle(b)
  if (!s1 || !s2) return 0
  if (s1 === s2) return 1
  const longer = s1.length >= s2.length ? s1 : s2
  const shorter = s1.length >= s2.length ? s2 : s1
  if (longer.includes(shorter)) return shorter.length / longer.length
  return 0
}

/**
 * Parses raw multi-line text (OCR / bibliography) into book objects.
 *
 * Each result includes:
 *   isDuplicate        — exact title match in existingNodes
 *   isFuzzyDuplicate   — high similarity (≥ 0.82) but not exact
 *   existingNode       — the matching existing node (if any)
 */
export function parseSmartInput(text, existingNodes = []) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3)

  return lines
    .map((line) => {
      const parsed = parseLine(line)
      if (!parsed || !parsed.title) return null

      // Find the best matching existing node
      let bestNode = null
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
    .filter(Boolean)
}

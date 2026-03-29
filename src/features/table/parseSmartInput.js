const CURRENT_YEAR = new Date().getFullYear()

// ── Auto-tagging par mots-clés ──────────────────────────────────────────────

const AXIS_KEYWORDS = {
  ECOLOGY: [
    'écologie', 'ecology', 'écologis', 'environnement', 'environment', 'climat',
    'climate', 'écofémin', 'ecofem', 'anthropocène', 'anthropocene', 'nature',
    'capitalocène', 'capitalocene', 'extractivi', 'biodiversi', 'durable',
    'sustainable', 'terre', 'vivant',
  ],
  QUEER: [
    'queer', 'trans ', 'transgenre', 'transgender', 'transidentit', 'non-binaire',
    'nonbinary', 'non binaire', 'lgbtq', 'gender trouble', 'trouble dans le genre',
    'sexualit', 'hétéronorm', 'heteronorm', 'homonorm', 'cisgenre', 'drag',
    'homosexual', 'lesbien', 'lesbian', 'gay', 'bisexu',
  ],
  AFROFEMINIST: [
    'afrofémin', 'afrofem', 'négritude', 'negritude', 'black feminis',
    'womanism', 'bell hooks', 'audre lorde', 'angela davis', 'toni morrison',
    'décolonial', 'decolonial', 'postcolonial', 'panafri', 'diaspora',
    'afrodescend', 'néocolonial', 'neocolonial',
  ],
  ANTIRACISM: [
    "afro", 'arabe','asiat','colonis', 'décolonis', 'race', 'blanc', 'racis', 'antiracis', 'anti-racis', 'racial', 'blanchité', 'whiteness',
    'privilège blanc', 'white privilege', 'ségrégation', 'segregation',
    'discriminat', 'islamophob', 'xénophob', 'xenophob', 'minorit',
    'racisé', 'racialized', 'coloris',
  ],
  HEALTH: [
    'santé', 'health', 'trauma', 'psychi', 'soin', 'care ', 'médical',
    'medical', 'thérap', 'therap', 'guéri', 'healing', 'maladie', 'illness',
    'douleur', 'pain', 'corps', 'body', 'violenc', 'abus', 'surviv',
    'résilience', 'resilience', 'burn.?out', 'deuil', 'grief',
  ],
  CRIP: [
    'handicap', 'disabilit', 'crip', 'validis', 'ableism', 'capacitis',
    'accessibil', 'inclusion', 'neurodivergen', 'autis', 'surd', 'sourd',
    'aveugle', 'blind', 'fauteuil', 'wheelchair', 'mad studies',
  ],
  HISTORY: [
    'histoir', 'history', 'historical', 'historique', 'mémoir', 'memoir',
    'archives', 'archéolog', 'archaeolog', 'généalog', 'genealog',
    'antiquit', 'médiéval', 'medieval', 'révolution', 'revolution',
    'guerre', 'war ', 'siècle', 'century', 'époque', 'colonial',
  ],
  INSTITUTIONAL: [
    'institution', 'politique', 'politic', 'état', 'state', 'gouvern',
    'govern', 'droit', 'law ', 'legal', 'juridiq', 'législat', 'legislat',
    'universi', 'académi', 'academ', 'sociolog', 'économi', 'econom',
    'néolibéral', 'neoliberal', 'capitalisme', 'capitalism', 'bureaucra',
    'administrat', 'parlement', 'parliament',
  ],
}

/**
 * Détecte les axes pertinents à partir du texte brut d'une ligne bibliographique.
 * Retourne un tableau d'axes (ex. ['QUEER', 'HEALTH']).
 */
function detectAxes(rawLine) {
  const text = rawLine.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  const matched = []
  for (const [axis, keywords] of Object.entries(AXIS_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.normalize('NFD').replace(/\p{Diacritic}/gu, ''))) {
        matched.push(axis)
        break
      }
    }
  }
  return matched
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function isInitial(s) {
  return /^[A-ZÀ-Ü]\.?$/.test(s.trim())
}

const NAME_PARTICLES = new Set([
  'de', 'du', 'des', 'von', 'van', 'di', 'da', 'le', 'la', 'el', 'al',
  'ben', 'ibn', 'del', 'della', 'der', 'den', 'het', 'los', 'las',
])

/** Vérifie qu'une chaîne ressemble à un nom de personne (au moins un mot
 *  capitalisé qui n'est pas une simple particule nobiliaire). */
function looksLikeName(str) {
  const words = str.trim().split(/[\s-]+/)
  return words.some(
    (w) => /^[A-ZÀ-ÖØ-Ý]/.test(w) && !NAME_PARTICLES.has(w.toLowerCase()),
  )
}

/**
 * Tente de décomposer une chaîne brute en {firstName, lastName}.
 * Gère : "BEAUVOIR Simone", "bell hooks", "Ahmed", "J. Butler"
 */
function parseAuthorString(raw) {
  const s = raw.trim()
  if (!s) return { firstName: '', lastName: '' }

  // ALL CAPS cluster = nom de famille
  const capsMatch = s.match(
    /\b([A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,}(?:[- ][A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,})*)\b/
  )
  if (capsMatch) {
    const ln = capsMatch[1].split(/[\s-]+/).map(capitalize).join(' ')
    const fn = s
      .replace(capsMatch[1], '')
      .replace(/^[,.\s]+|[,.\s]+$/g, '')
      .trim()
    return { firstName: fn, lastName: ln }
  }

  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 1) return { firstName: '', lastName: words[0] }

  // Première lettre minuscule → prénom (ex. "bell hooks")
  if (/^[a-zàáâãäçèéêëìíîïñòóôùúûü]/.test(words[0])) {
    return { firstName: words[0], lastName: words.slice(1).join(' ') }
  }

  // Initiale seule (J.) → initiale = prénom
  if (isInitial(words[0])) {
    return { firstName: words[0].replace('.', ''), lastName: words.slice(1).join(' ') }
  }

  // Défaut : premier mot = prénom, reste = nom
  return { firstName: words[0], lastName: words.slice(1).join(' ') }
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
  let edition = ''
  let authors = []

  // ── 4. Multi-auteurs : "Pardo et Delor" / "Smith & Jones" / "A, B et C" ──
  // Détecte une liste d'auteurs avant le titre (séparés par et|&|,)
  const etMatch = cleaned.match(
    /^([\w\s\-À-ÖØ-öø-ÿ]+?(?:,\s*[\w\s\-À-ÖØ-öø-ÿ]+?)*)\s+(?:et|&|and)\s+([\w\s\-À-ÖØ-öø-ÿ]+?)(?:,|$)/i
  )

  if (etMatch) {
    // Tout ce qui est avant "et" peut contenir plusieurs auteurs séparés par ","
    const beforeEt = etMatch[1]
    const lastAuthor = etMatch[2].trim()
    const fullMatch = etMatch[0]

    // Segmenter les auteurs intermédiaires
    const allRawAuthors = [
      ...beforeEt.split(',').map((s) => s.trim()).filter(Boolean),
      lastAuthor,
    ]

    // Vérifier que chaque partie ressemble à un auteur (court, pas de sous-titre)
    const looksLikeAuthors = allRawAuthors.every(
      (a) => a.split(/\s+/).length <= 5 && looksLikeName(a),
    )

    if (looksLikeAuthors) {
      authors = allRawAuthors.map(parseAuthorString)
      firstName = authors[0]?.firstName || ''
      lastName = authors[0]?.lastName || ''

      // Titre = tout ce qui suit le match auteurs
      const afterAuthors = cleaned.slice(fullMatch.length).replace(/^[,.\s]+/, '').trim()
      const afterParts = afterAuthors.split(',').map((p) => p.trim())
      title = (afterParts[0] || '').replace(/\.$/, '').trim()
      edition = afterParts.length > 1 ? afterParts.slice(1).join(', ').replace(/\.$/, '').trim() : ''
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

      lastName = capsCluster.split(/[\s-]+/).map(capitalize).join(' ')
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
        const looksLikeAuthor = words.length <= 4

        if (looksLikeAuthor) {
          let titleIndex
          if (words.length === 1) {
            lastName = words[0]
            if (parts.length >= 3 && isInitial(parts[1])) {
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
          const editionParts = parts.slice(1)
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
    year: year || CURRENT_YEAR,
    yearMissing: !year,
    axes: detectAxes(rawLine),
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
 * Chaque résultat inclut :
 *   authors            — tableau [{firstName, lastName}], un par co-auteur détecté
 *   firstName/lastName — premier auteur (rétrocompat affichage)
 *   isDuplicate        — correspondance exacte sur le titre dans existingNodes
 *   isFuzzyDuplicate   — similarité élevée (≥ 0.82) mais pas exacte
 *   existingNode       — nœud existant correspondant (si doublon)
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

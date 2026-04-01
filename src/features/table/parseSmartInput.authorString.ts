import type { ParsedAuthor } from './parseSmartInput.types'

export function capitalizeWord(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function isAuthorInitial(s: string): boolean {
  return /^[A-ZÀ-Ü]\.?$/.test(s.trim())
}

const NAME_PARTICLES = new Set([
  'de', 'du', 'des', 'von', 'van', 'di', 'da', 'le', 'la', 'el', 'al',
  'ben', 'ibn', 'del', 'della', 'der', 'den', 'het', 'los', 'las',
])

/** Au moins un mot capitalisé qui n'est pas une simple particule. */
export function looksLikeName(str: string): boolean {
  const words = str.trim().split(/[\s-]+/)
  return words.some(
    (w) => /^[A-ZÀ-ÖØ-Ý]/.test(w) && !NAME_PARTICLES.has(w.toLowerCase()),
  )
}

/**
 * Décompose une chaîne brute en prénom / nom (caps, initiales, « bell hooks », etc.).
 */
export function parseAuthorString(raw: string): ParsedAuthor {
  const s = raw.trim()
  if (!s) return { firstName: '', lastName: '' }

  const capsMatch = s.match(
    /\b([A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,}(?:[- ][A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÙÚÛÜÝ]{2,})*)\b/
  )
  if (capsMatch) {
    const ln = capsMatch[1].split(/[\s-]+/).map(capitalizeWord).join(' ')
    const fn = s
      .replace(capsMatch[1], '')
      .replace(/^[,.\s]+|[,.\s]+$/g, '')
      .trim()
    return { firstName: fn, lastName: ln }
  }

  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 1) return { firstName: '', lastName: words[0] }

  if (/^[a-zàáâãäçèéêëìíîïñòóôùúûü]/.test(words[0])) {
    return { firstName: words[0], lastName: words.slice(1).join(' ') }
  }

  if (isAuthorInitial(words[0])) {
    return { firstName: words[0].replace('.', ''), lastName: words.slice(1).join(' ') }
  }

  return { firstName: words[0], lastName: words.slice(1).join(' ') }
}

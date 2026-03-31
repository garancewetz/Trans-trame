import { AXIS_KEYWORDS } from '@/common/utils/keywords.constants'

/**
 * Détecte les axes pertinents à partir du texte brut d'une ligne bibliographique.
 */
export function detectAxes(rawLine: string): string[] {
  const text = rawLine.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  const matched: string[] = []
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

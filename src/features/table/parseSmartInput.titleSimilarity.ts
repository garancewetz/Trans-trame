/** Normalise un titre pour comparaison : minuscules, sans ponctuation, espaces repliés. */
function normTitle(s: string | undefined): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\wàáâãäçèéêëìíîïñòóôùúûü\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Recouvrement [0–1] entre deux titres normalisés. */
export function titleSimilarity(a: string | undefined, b: string | undefined): number {
  const s1 = normTitle(a)
  const s2 = normTitle(b)
  if (!s1 || !s2) return 0
  if (s1 === s2) return 1
  const longer = s1.length >= s2.length ? s1 : s2
  const shorter = s1.length >= s2.length ? s2 : s1
  if (longer.includes(shorter)) return shorter.length / longer.length
  return 0
}

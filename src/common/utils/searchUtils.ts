export function matchAllWords(query: string, haystack: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return false
  const words = q.split(/\s+/).filter(Boolean)
  const h = haystack.toLowerCase()
  return words.every((w) => h.includes(w))
}

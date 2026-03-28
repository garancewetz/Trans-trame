/** Full display name: "Prénom Nom" */
export function authorName(node) {
  if (node.firstName || node.lastName) {
    return [node.firstName, node.lastName].filter(Boolean).join(' ')
  }
  return node.author || ''
}

/**
 * Heuristic: first token → prénom, reste → nom (ex. « Simone de Beauvoir »).
 */
export function splitAuthorDisplayName(name) {
  const t = (name || '').trim()
  if (!t) return { firstName: '', lastName: '' }
  const i = t.indexOf(' ')
  if (i === -1) return { firstName: '', lastName: t }
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() }
}

/** Sort key based on lastName (lowercased, for locale compare) */
export function authorSortKey(node) {
  if (node.lastName) return node.lastName
  // Fallback for old data: take last word
  const parts = (node.author || '').trim().split(/\s+/)
  return parts[parts.length - 1] || ''
}

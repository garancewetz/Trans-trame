/** Full display name: "Prénom Nom" */
export function authorName(node) {
  if (node.firstName || node.lastName) {
    return [node.firstName, node.lastName].filter(Boolean).join(' ')
  }
  return node.author || ''
}

/** Sort key based on lastName (lowercased, for locale compare) */
export function authorSortKey(node) {
  if (node.lastName) return node.lastName
  // Fallback for old data: take last word
  const parts = (node.author || '').trim().split(/\s+/)
  return parts[parts.length - 1] || ''
}

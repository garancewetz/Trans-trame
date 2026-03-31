/** Extrait l’id d’un nœud D3 / graphe (string ou objet avec id). */
export function maybeNodeId(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'id' in v) {
    const id = Reflect.get(v, 'id')
    return typeof id === 'string' ? id : null
  }
  return null
}

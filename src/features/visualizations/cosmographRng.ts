// Seed stable pour tout l'aléa (positions initiales + forces cosmos.gl).
// Incrémenter le suffixe invalide les layouts mémorisés si la sémantique change.
export const RANDOM_SEED = 'trans-trame-v1'

/** PRNG Mulberry32 — ~1 ns/call, state 32 bits, distribution correcte. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash FNV-1a 32 bits — stable entre runs, sans collision sur seeds courts. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

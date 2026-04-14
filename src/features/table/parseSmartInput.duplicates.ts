import type { ExistingNode } from './parseSmartInput.types'
import { titleSimilarity } from './parseSmartInput.titleSimilarity'

/**
 * Find a duplicate or fuzzy-duplicate among existing nodes by comparing
 * title similarity and (optionally) author last name.
 *
 * Consolidates the triplicated duplicate-detection pattern that was
 * previously inlined in parseSmartInput, parseSmartInputHybrid, and
 * parseSmartInputFromImages.
 */
export function findDuplicate(
  title: string,
  lastName: string,
  existingNodes: ExistingNode[],
): { isDuplicate: boolean; isFuzzyDuplicate: boolean; existingNode: ExistingNode | null } {
  let bestNode: ExistingNode | null = null
  let bestScore = 0

  for (const n of existingNodes) {
    const score = titleSimilarity(n.title ?? '', title)
    if (score > bestScore) {
      bestScore = score
      bestNode = n
    }
  }

  // If title matches well, check if authors also match.
  // Same title + different author → downgrade from exact to fuzzy (or ignore).
  let authorMatch = true
  if (bestNode && bestScore >= 0.82) {
    const parsedLast = (lastName || '').toLowerCase().trim()
    const existLast = String(bestNode.lastName ?? '').toLowerCase().trim()
    if (parsedLast && existLast && parsedLast !== existLast) {
      authorMatch = false
    }
  }

  const isDuplicate = bestScore === 1 && authorMatch
  const isFuzzyDuplicate = !isDuplicate && bestScore >= 0.82

  return {
    isDuplicate,
    isFuzzyDuplicate,
    existingNode: (isDuplicate || isFuzzyDuplicate) ? bestNode : null,
  }
}

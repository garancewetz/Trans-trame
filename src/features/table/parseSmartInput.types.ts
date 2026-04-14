import type { Axis } from '@/common/utils/categories.constants'

export type ParsedAuthor = { firstName: string; lastName: string }

export type ExistingNode = {
  id?: string
  title?: string
  [key: string]: unknown
}

export type ParsedBook = {
  id: string
  authors: ParsedAuthor[]
  firstName: string
  lastName: string
  title: string
  /**
   * Canonical title in the work's original language, as recognized by the LLM.
   * Used to group editions/translations at dedup time. Null when the LLM did
   * not recognize the work (most articles, obscure references, manual entries).
   */
  originalTitle: string | null
  edition: string
  page: string
  year: number | null
  yearMissing: boolean
  axes: Axis[]
  isDuplicate: boolean
  isFuzzyDuplicate: boolean
  citation: string
  existingNode: ExistingNode | null
  raw: string
  /** Confidence score from the local parser (0–1). Low score triggers LLM fallback. */
  confidence?: number
  /** True if the local parser flagged this line for LLM re-parsing. */
  needsLLM?: boolean
  /** True if this result was enriched/replaced by the LLM. */
  parsedByLLM?: boolean
  /** Emerging themes detected by the LLM (e.g. "philosophy", "psychoanalysis"). */
  suggestedThemes?: string[]
}

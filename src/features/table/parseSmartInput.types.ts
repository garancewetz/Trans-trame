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
}

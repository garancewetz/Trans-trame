import { parseSmartInput as parseSmartInputJs } from './parseSmartInput.logic'
import type { Axis } from '@/lib/categories.constants'

export type Author = { firstName: string; lastName: string }

export type ExistingNode = {
  id?: string
  title?: string
  [key: string]: unknown
}

export type ParsedBook = {
  id: string
  authors: Author[]
  firstName: string
  lastName: string
  title: string
  edition: string
  year: number
  yearMissing: boolean
  axes: Axis[]
  isDuplicate: boolean
  isFuzzyDuplicate: boolean
  existingNode: ExistingNode | null
  raw: string
}

export function parseSmartInput(text: string, existingNodes: ExistingNode[] = []): ParsedBook[] {
  // La logique de parsing existante est en JS : on fournit ici une couche TS typée.
  return parseSmartInputJs(text, existingNodes) as ParsedBook[]
}


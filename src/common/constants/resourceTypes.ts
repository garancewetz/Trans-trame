import { BookOpen, FileText, Mic, Film, FileQuestion } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ResourceTypeValue = 'book' | 'article' | 'podcast' | 'film' | 'other'

export const RESOURCE_TYPES: { value: ResourceTypeValue; label: string; icon: LucideIcon }[] = [
  { value: 'book',    label: 'Livre',   icon: BookOpen },
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'podcast', label: 'Podcast', icon: Mic },
  { value: 'film',    label: 'Film',    icon: Film },
  { value: 'other',   label: 'Autre',   icon: FileQuestion },
]

export function getResourceType(value: string | undefined) {
  return RESOURCE_TYPES.find((t) => t.value === value) ?? RESOURCE_TYPES[0]
}

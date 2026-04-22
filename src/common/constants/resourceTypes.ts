import { BookOpen, FileText, Mic, Film, Music, FileQuestion } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ResourceTypeValue = 'book' | 'article' | 'podcast' | 'film' | 'music' | 'other'

export const RESOURCE_TYPES: { value: ResourceTypeValue; label: string; icon: LucideIcon }[] = [
  { value: 'book',    label: 'Livre',   icon: BookOpen },
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'podcast', label: 'Podcast', icon: Mic },
  { value: 'film',    label: 'Film',    icon: Film },
  { value: 'music',   label: 'Musique', icon: Music },
  { value: 'other',   label: 'Autre',   icon: FileQuestion },
]

export function getResourceType(value: string | undefined) {
  return RESOURCE_TYPES.find((t) => t.value === value) ?? RESOURCE_TYPES[0]
}

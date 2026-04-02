import type { Link } from '@/types/domain'
import { AXES_COLORS } from '@/common/utils/categories'

export function normalizeId(endpoint: unknown): string | null {
  if (typeof endpoint === 'string') return endpoint
  if (endpoint && typeof endpoint === 'object' && 'id' in endpoint)
    return (endpoint as { id: string }).id
  return null
}

export type CitationEdge = { sourceId: string; targetId: string }

export function getCitationEdges(links: Link[]): CitationEdge[] {
  return links
    .filter((l) => l.type !== 'author-book')
    .flatMap((l) => {
      const src = normalizeId(l.source)
      const tgt = normalizeId(l.target)
      return src && tgt ? [{ sourceId: src, targetId: tgt }] : []
    })
}

export function axisColor(axes?: string[] | null): string {
  const axis = axes?.[0]
  if (!axis) return '#888888'
  return AXES_COLORS[axis as keyof typeof AXES_COLORS] ?? '#888888'
}

export function shortTitle(title: string, maxLen = 28): string {
  return title.length > maxLen ? title.slice(0, maxLen - 1) + '…' : title
}

export function linearScale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  const span = domainMax - domainMin || 1
  return rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

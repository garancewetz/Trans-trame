import { useCallback, type MutableRefObject } from 'react'
import {
  LINK_CITED_BY_COLOR_STRONG,
  LINK_CITES_COLOR_STRONG,
  linkCitedByRgba,
  linkCitesRgba,
} from '@/common/constants/linkRelationColors'
import { normalizeEndpointId } from '../domain/graphDataModel'

/** Sens du lien book→book : source cite la cible. */
function citationAnchorRole(
  link: { source: unknown; target: unknown; type?: string },
  anchorIds: Set<string> | null,
): 'cites' | 'citedBy' | null {
  if (!anchorIds || link.type === 'author-book') return null
  const srcId = normalizeEndpointId(link.source)
  const tgtId = normalizeEndpointId(link.target)
  if (!srcId || !tgtId) return null
  if (anchorIds.has(srcId)) return 'cites'
  if (anchorIds.has(tgtId)) return 'citedBy'
  return null
}

import type { Highlight } from '@/core/FilterContext'

type Args = {
  hasSelection: boolean
  activeFilter: string | null
  activeHighlight: Highlight | null
  anchorIds: Set<string> | null
  connectedLinks: Set<string>
  linkWeights: Map<string, number>
  hoveredNodeRef: MutableRefObject<unknown>
  hoveredLinksRef: MutableRefObject<Set<string>>
}

export function useGraphLinkCallbacks({
  hasSelection,
  activeFilter,
  activeHighlight,
  anchorIds,
  connectedLinks,
  linkWeights,
  hoveredNodeRef,
  hoveredLinksRef,
}: Args) {
  const isLinkActive = useCallback(
    (link: { source: unknown; target: unknown }) => {
      if (!anchorIds) return false
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return false
      return connectedLinks.has(`${srcId}-${tgtId}`)
    },
    [anchorIds, connectedLinks],
  )

  const isLinkHovered = useCallback((link: { source: unknown; target: unknown }) => {
    const srcId = normalizeEndpointId(link.source)
    const tgtId = normalizeEndpointId(link.target)
    if (!srcId || !tgtId) return false
    return hoveredLinksRef.current.has(`${srcId}-${tgtId}`)
  }, [])

  const getLinkWeight = useCallback(
    (link: { source: unknown; target: unknown }) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return 1
      const key = [srcId, tgtId].sort().join('-')
      return linkWeights.get(key) || 1
    },
    [linkWeights],
  )

  const linkColor = useCallback(
    (link: { source: unknown; target: unknown; type?: string }) => {
      if (hoveredNodeRef.current && isLinkHovered(link)) return 'rgba(0,0,0,0)'
      if (hoveredNodeRef.current && !hasSelection && !isLinkHovered(link)) return linkCitesRgba(0.03)
      if (link.type === 'author-book') {
        if (isLinkActive(link)) return linkCitesRgba(0.45)
        return linkCitesRgba(0.1)
      }
      if (!hasSelection && !activeFilter && !activeHighlight) return linkCitesRgba(0.15)
      if (isLinkActive(link)) {
        const role = citationAnchorRole(link, anchorIds)
        if (role === 'citedBy') return linkCitedByRgba(0.85)
        return linkCitesRgba(0.85)
      }
      return linkCitesRgba(0.1)
    },
    [hasSelection, activeFilter, activeHighlight, isLinkActive, isLinkHovered, anchorIds],
  )

  const linkWidth = useCallback(
    (link: { source: unknown; target: unknown; type?: string }) => {
      if (link.type === 'author-book') {
        return isLinkActive(link) ? 1.2 : 0.5
      }
      const weight = getLinkWeight(link)
      const isStrong = weight > 1
      if (!hasSelection && !hoveredNodeRef.current) return isStrong ? 1.0 : 0.5
      if (isLinkActive(link)) return isStrong ? 2.8 : 2.2
      if (hoveredNodeRef.current && isLinkHovered(link)) return isStrong ? 1.5 : 1.0
      return 0.5
    },
    [hasSelection, isLinkActive, isLinkHovered, getLinkWeight],
  )

  const linkCanvasObject = useCallback(
    (link: { source: unknown; target: unknown; type?: string; __controlPoints?: number[] }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!hoveredNodeRef.current || hasSelection) return
      if (!isLinkHovered(link)) return
      if (link.type === 'author-book') return
      const src = link.source as { x?: number; y?: number } | null
      const tgt = link.target as { x?: number; y?: number } | null
      if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return
      const sx = src.x!, sy = src.y!, tx = tgt.x!, ty = tgt.y!
      const weight = getLinkWeight(link)
      const isStrong = weight > 1
      const lineWidth = (isStrong ? 2.2 : 1.4) / globalScale
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      const cp = link.__controlPoints
      if (!cp) {
        ctx.lineTo(tx, ty)
      } else if (cp.length === 2) {
        ctx.quadraticCurveTo(cp[0], cp[1], tx, ty)
      } else {
        ctx.bezierCurveTo(cp[0], cp[1], cp[2], cp[3], tx, ty)
      }
      const grad = ctx.createLinearGradient(sx, sy, tx, ty)
      grad.addColorStop(0, linkCitesRgba(isStrong ? 1.0 : 0.9))
      grad.addColorStop(0.25, linkCitesRgba(0.7))
      grad.addColorStop(0.6, linkCitedByRgba(0.35))
      grad.addColorStop(1, linkCitedByRgba(isStrong ? 0.45 : 0.2))
      ctx.strokeStyle = grad
      ctx.lineWidth = lineWidth
      ctx.stroke()
    },
    [hasSelection, isLinkHovered, getLinkWeight],
  )

  const arrowColor = useCallback(
    (link: { source: unknown; target: unknown; type?: string }) => {
      if (link.type === 'author-book') return 'rgba(0,0,0,0)'
      if (hoveredNodeRef.current && !hasSelection && isLinkHovered(link)) {
        return linkCitedByRgba(0.85)
      }
      if (!hasSelection) return linkCitesRgba(0.5)
      if (isLinkActive(link)) {
        const role = citationAnchorRole(link, anchorIds)
        if (role === 'citedBy') return LINK_CITED_BY_COLOR_STRONG
        return LINK_CITES_COLOR_STRONG
      }
      return 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered, anchorIds],
  )

  const linkDirectionalArrowLength = useCallback(
    (link: { source: unknown; target: unknown }) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 6 : 0
      return !hasSelection ? 4 : isLinkActive(link) ? 7 : 3
    },
    [hasSelection, isLinkActive, isLinkHovered],
  )

  const linkDirectionalParticles = useCallback(
    (link: { source: unknown; target: unknown }) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 3 : 0
      return !hasSelection ? 0 : isLinkActive(link) ? 5 : 0
    },
    [hasSelection, isLinkActive, isLinkHovered],
  )

  const linkDirectionalParticleWidth = useCallback(
    (link: { source: unknown; target: unknown }) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 2 : 0
      return !hasSelection ? 0 : isLinkActive(link) ? 2 : 0
    },
    [hasSelection, isLinkActive, isLinkHovered],
  )

  const linkDirectionalParticleColor = useCallback(
    (link: { source: unknown; target: unknown }) => {
      if (hoveredNodeRef.current && !hasSelection && isLinkHovered(link)) {
        return linkCitesRgba(0.9)
      }
      if (!hasSelection) return linkCitesRgba(0.6)
      if (isLinkActive(link)) {
        const role = citationAnchorRole(link, anchorIds)
        if (role === 'citedBy') return LINK_CITED_BY_COLOR_STRONG
        return LINK_CITES_COLOR_STRONG
      }
      return 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered, anchorIds],
  )

  return {
    isLinkActive,
    isLinkHovered,
    getLinkWeight,
    linkColor,
    linkWidth,
    linkCanvasObject,
    arrowColor,
    linkDirectionalArrowLength,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleColor,
  }
}

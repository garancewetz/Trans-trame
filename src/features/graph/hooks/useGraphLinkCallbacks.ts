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

type Args = {
  hasSelection: boolean
  activeFilter: string | null
  viewMode: string
  anchorIds: Set<string> | null
  connectedLinks: Set<string>
  linkWeights: Map<string, number>
  hoveredNodeRef: MutableRefObject<unknown>
  hoveredLinksRef: MutableRefObject<Set<string>>
}

export function useGraphLinkCallbacks({
  hasSelection,
  activeFilter,
  viewMode,
  anchorIds,
  connectedLinks,
  linkWeights,
  hoveredNodeRef,
  hoveredLinksRef,
}: Args) {
  const isLinkActive = useCallback(
    (link) => {
      if (!anchorIds) return false
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return false
      return connectedLinks.has(`${srcId}-${tgtId}`)
    },
    [anchorIds, connectedLinks],
  )

  const isLinkHovered = useCallback((link) => {
    const srcId = normalizeEndpointId(link.source)
    const tgtId = normalizeEndpointId(link.target)
    if (!srcId || !tgtId) return false
    return hoveredLinksRef.current.has(`${srcId}-${tgtId}`)
  }, [])

  const getLinkWeight = useCallback(
    (link) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return 1
      const key = [srcId, tgtId].sort().join('-')
      return linkWeights.get(key) || 1
    },
    [linkWeights],
  )

  const linkColor = useCallback(
    (link) => {
      if (hoveredNodeRef.current && isLinkHovered(link)) return 'rgba(0,0,0,0)'
      if (hoveredNodeRef.current && !hasSelection && !isLinkHovered(link)) return linkCitesRgba(0.03)
      if (link.type === 'author-book') {
        if (isLinkActive(link)) return linkCitesRgba(0.45)
        return linkCitesRgba(0.1)
      }
      if (viewMode === 'genealogy') {
        if (!hasSelection) return linkCitesRgba(0.45)
        if (isLinkActive(link)) {
          const role = citationAnchorRole(link, anchorIds)
          if (role === 'citedBy') return linkCitedByRgba(0.95)
          return linkCitesRgba(0.95)
        }
        return linkCitesRgba(0.28)
      }
      if (!hasSelection && !activeFilter) return linkCitesRgba(0.15)
      if (isLinkActive(link)) {
        const role = citationAnchorRole(link, anchorIds)
        if (role === 'citedBy') return linkCitedByRgba(0.85)
        return linkCitesRgba(0.85)
      }
      return linkCitesRgba(0.1)
    },
    [hasSelection, activeFilter, isLinkActive, isLinkHovered, viewMode, anchorIds],
  )

  const linkWidth = useCallback(
    (link) => {
      if (link.type === 'author-book') {
        return isLinkActive(link) ? 1.2 : 0.5
      }
      const weight = getLinkWeight(link)
      const isStrong = weight > 1
      if (viewMode === 'genealogy') {
        if (!hasSelection) return isStrong ? 1.8 : 1.4
        return isLinkActive(link) ? (isStrong ? 3.0 : 2.6) : 1
      }
      if (!hasSelection && !hoveredNodeRef.current) return isStrong ? 1.0 : 0.5
      if (isLinkActive(link)) return isStrong ? 2.8 : 2.2
      if (hoveredNodeRef.current && isLinkHovered(link)) return isStrong ? 1.5 : 1.0
      return 0.5
    },
    [hasSelection, isLinkActive, isLinkHovered, getLinkWeight, viewMode],
  )

  const linkCanvasObject = useCallback(
    (link, ctx, globalScale) => {
      if (!hoveredNodeRef.current || hasSelection) return
      if (!isLinkHovered(link)) return
      if (link.type === 'author-book') return
      const src = link.source
      const tgt = link.target
      if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return
      const weight = getLinkWeight(link)
      const isStrong = weight > 1
      const lineWidth = (isStrong ? 2.2 : 1.4) / globalScale
      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      const cp = link.__controlPoints
      if (!cp) {
        ctx.lineTo(tgt.x, tgt.y)
      } else if (cp.length === 2) {
        ctx.quadraticCurveTo(cp[0], cp[1], tgt.x, tgt.y)
      } else {
        ctx.bezierCurveTo(cp[0], cp[1], cp[2], cp[3], tgt.x, tgt.y)
      }
      const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y)
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
    (link) => {
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
    (link) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 6 : 0
      return !hasSelection ? 4 : isLinkActive(link) ? 7 : 3
    },
    [hasSelection, isLinkActive, isLinkHovered],
  )

  const linkDirectionalParticles = useCallback(
    (link) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 3 : 0
      if (viewMode === 'genealogy') {
        if (!hasSelection) return 2
        return isLinkActive(link) ? 6 : 2
      }
      return !hasSelection ? 2 : isLinkActive(link) ? 5 : 0
    },
    [hasSelection, isLinkActive, isLinkHovered, viewMode],
  )

  const linkDirectionalParticleWidth = useCallback(
    (link) => {
      if (hoveredNodeRef.current && !hasSelection) return isLinkHovered(link) ? 2 : 0
      if (viewMode === 'genealogy') {
        if (!hasSelection) return 1
        return isLinkActive(link) ? 2 : 1
      }
      return !hasSelection ? 1 : isLinkActive(link) ? 2 : 0
    },
    [hasSelection, isLinkActive, isLinkHovered, viewMode],
  )

  const linkDirectionalParticleColor = useCallback(
    (link) => {
      if (hoveredNodeRef.current && !hasSelection && isLinkHovered(link)) {
        return linkCitesRgba(0.9)
      }
      if (viewMode === 'genealogy') {
        if (!hasSelection) return linkCitesRgba(0.6)
        if (isLinkActive(link)) {
          const role = citationAnchorRole(link, anchorIds)
          if (role === 'citedBy') return LINK_CITED_BY_COLOR_STRONG
          return LINK_CITES_COLOR_STRONG
        }
        return linkCitesRgba(0.22)
      }
      if (!hasSelection) return linkCitesRgba(0.6)
      if (isLinkActive(link)) {
        const role = citationAnchorRole(link, anchorIds)
        if (role === 'citedBy') return LINK_CITED_BY_COLOR_STRONG
        return LINK_CITES_COLOR_STRONG
      }
      return 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered, viewMode, anchorIds],
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

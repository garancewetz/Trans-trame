import { useCallback, type MutableRefObject } from 'react'
import { blendAxesColors } from '@/common/utils/categories'
import { normalizeEndpointId } from '../domain/graphDataModel'

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

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
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
      if (hoveredNodeRef.current && !hasSelection && !isLinkHovered(link)) return 'rgba(140, 220, 255, 0.03)'
      if (link.type === 'author-book') {
        if (isLinkActive(link)) return 'rgba(180, 220, 255, 0.45)'
        return 'rgba(140, 200, 255, 0.10)'
      }
      if (viewMode === 'genealogy') {
        if (!hasSelection) return 'rgba(190, 210, 255, 0.6)'
        if (isLinkActive(link)) return 'rgba(220, 238, 255, 0.95)'
        return 'rgba(160, 185, 235, 0.35)'
      }
      if (!hasSelection && !activeFilter) return 'rgba(140, 220, 255, 0.15)'
      if (isLinkActive(link)) return 'rgba(190, 240, 255, 0.85)'
      return 'rgba(140, 220, 255, 0.10)'
    },
    [hasSelection, activeFilter, isLinkActive, isLinkHovered, viewMode],
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
      const src = link.source
      const tgt = link.target
      if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return
      const srcColor = blendAxesColors(src.axes || [])
      const tgtColor = blendAxesColors(tgt.axes || [])
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
      grad.addColorStop(0, withAlpha(srcColor, isStrong ? 1.0 : 0.9))
      grad.addColorStop(0.25, withAlpha(srcColor, 0.7))
      grad.addColorStop(0.6, withAlpha(tgtColor, 0.35))
      grad.addColorStop(1, withAlpha(tgtColor, isStrong ? 0.45 : 0.2))
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
        const src = typeof link.source === 'object' ? link.source : null
        if (src) return withAlpha(blendAxesColors(src.axes || []), 0.8)
      }
      if (!hasSelection) return 'rgba(140, 220, 255, 0.5)'
      return isLinkActive(link) ? '#b4e6ff' : 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered],
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
        const src = typeof link.source === 'object' ? link.source : null
        if (src) return withAlpha(blendAxesColors(src.axes || []), 0.9)
      }
      return viewMode === 'genealogy'
        ? !hasSelection
          ? 'rgba(140, 220, 255, 0.6)'
          : isLinkActive(link)
            ? '#b4e6ff'
            : 'rgba(140, 220, 255, 0.22)'
        : !hasSelection
          ? 'rgba(140, 220, 255, 0.6)'
          : isLinkActive(link)
            ? '#b4e6ff'
            : 'rgba(255,255,255,0.05)'
    },
    [hasSelection, isLinkActive, isLinkHovered, viewMode],
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

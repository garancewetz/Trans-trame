import { useCallback, useMemo, type RefObject } from 'react'
import type { Highlight } from '@/core/FilterContext'
import {
  computeLinkVisualState,
  getArrowColor,
  getArrowLength,
  getDirectionalGradientLineWidth,
  getDirectionalGradientStops,
  getLinkColor,
  getLinkWidth,
  getParticleColor,
  getParticleCount,
  getParticleWidth,
  shouldPaintDirectionalGradient,
  type LinkLike,
} from '../domain/linkStyle'

type Args = {
  hasSelection: boolean
  activeFilter: string | null
  activeHighlight: Highlight | null
  connectedLinks: Set<string>
  linkWeights: Map<string, number>
  hoveredNodeRef: RefObject<unknown>
  hoveredLinksRef: RefObject<Set<string>>
}

export function useGraphLinkCallbacks({
  hasSelection,
  activeFilter,
  activeHighlight,
  connectedLinks,
  linkWeights,
  hoveredNodeRef,
  hoveredLinksRef,
}: Args) {
  // Calcule l'état visuel d'un lien à la volée. `hasHover` et `hoveredLinks`
  // sont lus *live* depuis les refs : pas de dépendance React nécessaire, et
  // react-force-graph rappelle les callbacks à chaque frame.
  const stateFor = useCallback(
    (link: LinkLike) =>
      computeLinkVisualState(link, {
        hasSelection,
        hasHover: Boolean(hoveredNodeRef.current),
        isFiltered: Boolean(activeFilter || activeHighlight),
        connectedLinks,
        hoveredLinks: hoveredLinksRef.current,
        linkWeights,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasSelection, activeFilter, activeHighlight, connectedLinks, linkWeights],
  )

  return useMemo(
    () => ({
      linkColor: (l: LinkLike) => getLinkColor(stateFor(l)),
      linkWidth: (l: LinkLike) => getLinkWidth(stateFor(l)),
      arrowColor: (l: LinkLike) => getArrowColor(stateFor(l)),
      linkDirectionalArrowLength: (l: LinkLike) => getArrowLength(stateFor(l)),
      linkDirectionalParticles: (l: LinkLike) => getParticleCount(stateFor(l)),
      linkDirectionalParticleWidth: (l: LinkLike) => getParticleWidth(stateFor(l)),
      linkDirectionalParticleColor: (l: LinkLike) => getParticleColor(stateFor(l)),

      // Dégradé directionnel (cyan→orange) peint sur les liens focaux :
      // survolés en browsing OU connectés à l'ancre en selected.
      linkCanvasObject: (link: LinkLike, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const s = stateFor(link)
        if (!shouldPaintDirectionalGradient(s)) return
        const src = link.source as { x?: number; y?: number } | null
        const tgt = link.target as { x?: number; y?: number } | null
        if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return
        const sx = src.x!
        const sy = src.y!
        const tx = tgt.x!
        const ty = tgt.y!

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        const cp = link.__controlPoints
        if (!cp) ctx.lineTo(tx, ty)
        else if (cp.length === 2) ctx.quadraticCurveTo(cp[0], cp[1], tx, ty)
        else ctx.bezierCurveTo(cp[0], cp[1], cp[2], cp[3], tx, ty)

        const grad = ctx.createLinearGradient(sx, sy, tx, ty)
        for (const [stop, color] of getDirectionalGradientStops(s)) grad.addColorStop(stop, color)
        ctx.strokeStyle = grad
        ctx.lineWidth = getDirectionalGradientLineWidth(s) / globalScale
        ctx.stroke()
      },
    }),
    [stateFor],
  )
}

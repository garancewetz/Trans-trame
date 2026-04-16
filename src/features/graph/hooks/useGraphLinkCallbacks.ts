import { useCallback, useMemo, useRef, type RefObject } from 'react'
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
  type LinkVisualState,
} from '../domain/linkStyle'

type CachedLinkState = LinkVisualState & { _gen: number }

type Args = {
  hasSelection: boolean
  activeFilter: string | null
  activeHighlight: Highlight | null
  connectedLinks: Set<string>
  linkWeights: Map<string, number>
  hoveredNodeRef: RefObject<unknown>
  hoveredLinksRef: RefObject<Set<string>>
  hoverGenRef: RefObject<number>
}

export function useGraphLinkCallbacks({
  hasSelection,
  activeFilter,
  activeHighlight,
  connectedLinks,
  linkWeights,
  hoveredNodeRef,
  hoveredLinksRef,
  hoverGenRef,
}: Args) {
  // Cache de déduplication : react-force-graph appelle 7-8 accesseurs par lien
  // par frame, chacun déclenchant stateFor() → computeLinkVisualState(). Le cache
  // stocke le résultat du 1er appel et le réutilise pour les 6-7 suivants.
  // Invalidation par génération : hoverGenRef est incrémenté à chaque changement
  // de hover, depsGen à chaque changement de deps React (sélection, filtre…).
  const cacheRef = useRef(new WeakMap<object, CachedLinkState>())
  const depsGenRef = useRef(0)
  const prevDepsRef = useRef<unknown>(null)

  // Calcule l'état visuel d'un lien à la volée. `hasHover` et `hoveredLinks`
  // sont lus *live* depuis les refs : pas de dépendance React nécessaire, et
  // react-force-graph rappelle les callbacks à chaque frame.
  const stateFor = useCallback(
    (link: LinkLike): LinkVisualState => {
      // Combinaison de la génération hover (refs mutables) et deps (React state)
      // en un seul compteur monotone pour l'invalidation du cache.
      const combinedGen = hoverGenRef.current + depsGenRef.current

      const cache = cacheRef.current
      const existing = cache.get(link)
      if (existing && existing._gen === combinedGen) return existing

      const raw = computeLinkVisualState(link, {
        hasSelection,
        hasHover: Boolean(hoveredNodeRef.current),
        isFiltered: Boolean(activeFilter || activeHighlight),
        connectedLinks,
        hoveredLinks: hoveredLinksRef.current,
        linkWeights,
      })

      // Réutilise l'objet caché existant pour éviter les allocations après le 1er frame
      if (existing) {
        existing.mode = raw.mode
        existing.kind = raw.kind
        existing.isAnchored = raw.isAnchored
        existing.isHovered = raw.isHovered
        existing.isStrong = raw.isStrong
        existing.isFiltered = raw.isFiltered
        existing._gen = combinedGen
        return existing
      }

      const entry: CachedLinkState = {
        mode: raw.mode,
        kind: raw.kind,
        isAnchored: raw.isAnchored,
        isHovered: raw.isHovered,
        isStrong: raw.isStrong,
        isFiltered: raw.isFiltered,
        _gen: combinedGen,
      }
      cache.set(link, entry)
      return entry
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredNodeRef/hoveredLinksRef/hoverGenRef are stable refs read live each frame; listing them would only add churn.
    [hasSelection, activeFilter, activeHighlight, connectedLinks, linkWeights],
  )

  // Bump depsGen quand les deps React changent (stateFor identity = proxy)
  const depsKey = stateFor
  if (depsKey !== prevDepsRef.current) {
    prevDepsRef.current = depsKey
    depsGenRef.current++
  }

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

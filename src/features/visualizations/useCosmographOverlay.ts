import { useCallback, useRef, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import { axisColor, axisLabel } from '@/common/utils/categories'
import { drawGlow } from '@/features/graph/canvas/canvasUtils'
import {
  FLASH_COLOR_RGB, HOVER_RADIUS_BONUS,
  type LabelData, drawClusterLabel, drawLabel,
} from './cosmographDrawing'
import { CLUSTER_RING, UNCATEGORIZED_CLUSTER_INDEX } from './useCosmographBuffers'

type OverlayRefs = {
  graphRef: RefObject<Graph | null>
  labelCanvasRef: RefObject<HTMLCanvasElement | null>
  hoveredIndexRef: MutableRefObject<number | null>
  selectedVisualIndexRef: MutableRefObject<number | null>
  flatSizesRef: MutableRefObject<Float32Array>
  labelByIndexRef: MutableRefObject<LabelData[]>
  glowHexByIndexRef: MutableRefObject<string[]>
  landmarkIndicesRef: MutableRefObject<number[]>
  landmarkIndicesCategoriesRef: MutableRefObject<number[]>
  visibleIndexSetRef: MutableRefObject<Set<number> | null>
  clusterByAxisRef: MutableRefObject<boolean>
  clusterAssignmentsRef: MutableRefObject<(number | undefined)[]>
  flashNodeIdsRef: MutableRefObject<Set<string>>
  flashAlphaRef: MutableRefObject<number>
  idToIndexRef: MutableRefObject<Map<string, number>>
  // Hover d'un lien : on peint glow + label sur ses 2 extrémités. Les indices
  // sont tracés via syncTrackedPositionsForFocal pour être accessibles via
  // getTrackedPointPositionsMap().
  hoveredLinkRef: MutableRefObject<{ index: number; source: number; target: number } | null>
}

/** Synchronise la taille du canvas overlay au container (DPR-aware). */
export function syncOverlayCanvasSize(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
): void {
  const dpr = window.devicePixelRatio || 1
  const w = container.clientWidth
  const h = container.clientHeight
  if (canvas.width !== w * dpr) canvas.width = w * dpr
  if (canvas.height !== h * dpr) canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/**
 * Redessine le canvas overlay (glow + labels + ring de flash). Fonction
 * stable — appelée depuis les effets et les handlers cosmos sans être
 * recréée à chaque render.
 *
 * IMPORTANT : l'identité de drawOverlay doit rester *stable* — les effets
 * consommateurs (cluster, visibility, focalCamera, flash) la déclarent en
 * dep. Si elle change à chaque render, ces effets re-fire en boucle et
 * cassent la convergence de la simu cosmos (ex : `g.start(1)` répété →
 * `onSimulationEnd` ne tire jamais). D'où le pattern refsRef : on capte les
 * refs dans un conteneur stable, et le useCallback a des deps vides.
 */
export function useCosmographOverlay(refs: OverlayRefs): () => void {
  const refsRef = useRef(refs)
  refsRef.current = refs
  const drawOverlay = useCallback(() => {
    const refs = refsRef.current
    const g = refs.graphRef.current
    const canvas = refs.labelCanvasRef.current
    if (!g || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const tracked = g.getTrackedPointPositionsMap()
    const hov = refs.hoveredIndexRef.current
    const sel = refs.selectedVisualIndexRef.current
    const rawFocal = hov !== null ? hov : sel
    const sizes = refs.flatSizesRef.current
    const labels = refs.labelByIndexRef.current
    const glowHex = refs.glowHexByIndexRef.current
    const visible = refs.visibleIndexSetRef.current
    const categoriesMode = refs.clusterByAxisRef.current
    // En mode Catégories, on prend les landmarks triés par taille (plus
    // pertinent quand les liens sont masqués). Sinon top-N par degré comme
    // Galaxy.
    const landmarks = categoriesMode
      ? refs.landmarkIndicesCategoriesRef.current
      : refs.landmarkIndicesRef.current
    // Focal visible : si hors-range timeline/filtres, on le traite comme
    // absent pour le rendu (glow + label). Même règle que applyFocalStyling
    // côté GL — évite un glow accroché à un nœud greyed-out.
    const focal = rawFocal !== null && (visible === null || visible.has(rawFocal))
      ? rawFocal
      : null

    // (1) Glow du focal (hover sinon sélection) — même rendu que hover.
    if (focal !== null && focal < sizes.length) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const baseR = sizes[focal]
        const hoverR = baseR + HOVER_RADIUS_BONUS
        const glowColor = glowHex[focal] ?? '#ffffff'
        drawGlow(ctx, sx, sy, hoverR, hoverR + 6, glowColor, 0.42)
      }
    }

    // (2) Labels landmarks. Masqués si point filtré (greyout). La liste est
    // déjà choisie selon le mode (par degré en Cosmograph, par taille en
    // Catégories) — plus besoin d'un second filtre par taille ici.
    for (const idx of landmarks) {
      if (idx === focal) continue
      if (visible !== null && !visible.has(idx)) continue
      const space = tracked.get(idx)
      if (!space) continue
      const [sx, sy] = g.spaceToScreenPosition(space)
      const r = sizes[idx]
      drawLabel(ctx, sx, sy, r, labels[idx], false)
    }

    // (3) Label du focal en mode « hover » (curseur ou sélection persistée).
    // La visibilité est déjà filtrée par le calcul de `focal` plus haut.
    if (focal !== null && focal < sizes.length) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const r = sizes[focal] + HOVER_RADIUS_BONUS
        drawLabel(ctx, sx, sy, r, labels[focal], true)
      }
    }

    // (4) Labels des pôles d'axes — uniquement en mode Catégories. Y :
    // juste au-dessus du point tracké le plus haut de chaque cluster, sinon
    // le label atterrit au centroïde et masque les nœuds denses.
    if (categoriesMode) {
      drawClusterRingLabels(ctx, g, refs.clusterAssignmentsRef.current, tracked)
    }

    // (4b) Hover de lien : glow + label sur les 2 extrémités. Mutuellement
    // exclusif avec le hover de nœud côté cosmos (prioritise hoveredPoint),
    // donc rendu indépendamment du bloc focal.
    const hoveredLink = refs.hoveredLinkRef.current
    if (hoveredLink) {
      for (const idx of [hoveredLink.source, hoveredLink.target]) {
        if (idx < 0 || idx >= sizes.length) continue
        if (visible !== null && !visible.has(idx)) continue
        const space = tracked.get(idx)
        if (!space) continue
        const [sx, sy] = g.spaceToScreenPosition(space)
        const baseR = sizes[idx]
        const hoverR = baseR + HOVER_RADIUS_BONUS
        const glowColor = glowHex[idx] ?? '#ffffff'
        drawGlow(ctx, sx, sy, hoverR, hoverR + 6, glowColor, 0.42)
        drawLabel(ctx, sx, sy, hoverR, labels[idx], true)
      }
    }

    // (5) Flash d'import : anneau vert pulsant autour des IDs fraîchement
    // ajoutés. Peint par-dessus tout (après les labels) pour rester lisible.
    const flashIds = refs.flashNodeIdsRef.current
    const flashAlpha = refs.flashAlphaRef.current
    if (flashIds.size > 0 && flashAlpha > 0.02) {
      const idToIdx = refs.idToIndexRef.current
      const expansion = (1 - flashAlpha) * 10
      ctx.save()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = `rgba(${FLASH_COLOR_RGB}, ${flashAlpha * 0.85})`
      for (const id of flashIds) {
        const i = idToIdx.get(id)
        if (i === undefined) continue
        const space = tracked.get(i)
        if (!space) continue
        const [sx, sy] = g.spaceToScreenPosition(space)
        const r = sizes[i] + 3 + expansion
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }, [])

  return drawOverlay
}

/**
 * Labels des 10 axes nommés du ring + UNCATEGORIZED central.  Utilise
 * getClusterPositions() pour rester aligné sur ce que cosmos utilise
 * réellement (rescale éventuel côté moteur) — s'appuyer sur
 * clusterCenterFor() pourrait placer les labels à côté des clusters visibles.
 */
function drawClusterRingLabels(
  ctx: CanvasRenderingContext2D,
  g: Graph,
  clusters: (number | undefined)[],
  tracked: ReadonlyMap<number, [number, number]>,
): void {
  const clusterPositions = g.getClusterPositions()
  const LABEL_PAD_ABOVE = 20

  const clusterTopY = new Map<number, number>()
  for (const [pointIdx, pos] of tracked) {
    const ci = clusters[pointIdx]
    if (ci === undefined) continue
    const [, sy] = g.spaceToScreenPosition(pos)
    const cur = clusterTopY.get(ci)
    if (cur === undefined || sy < cur) clusterTopY.set(ci, sy)
  }
  const labelYFor = (clusterIdx: number, centroidSy: number): number => {
    const top = clusterTopY.get(clusterIdx)
    return top !== undefined ? top - LABEL_PAD_ABOVE : centroidSy
  }

  for (let i = 0; i < CLUSTER_RING.length; i++) {
    const cx = clusterPositions[i * 2]
    const cy = clusterPositions[i * 2 + 1]
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
    const axis = CLUSTER_RING[i]
    const [sx, sy] = g.spaceToScreenPosition([cx, cy])
    const label = axisLabel(axis) ?? axis
    const color = axisColor(axis) ?? '#ffffff'
    drawClusterLabel(ctx, sx, labelYFor(i, sy), label.toUpperCase(), color)
  }
  const uCx = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2]
  const uCy = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2 + 1]
  if (Number.isFinite(uCx) && Number.isFinite(uCy)) {
    const [sx, sy] = g.spaceToScreenPosition([uCx, uCy])
    const color = axisColor('UNCATEGORIZED') ?? '#999999'
    drawClusterLabel(ctx, sx, labelYFor(UNCATEGORIZED_CLUSTER_INDEX, sy), 'SANS CATÉGORIE', color)
  }
}

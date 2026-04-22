import { useCallback, useRef, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import { axisColor, axisLabel } from '@/common/utils/categories'
import { drawGlow } from '@/features/graph/canvas/canvasUtils'
import {
  FLASH_COLOR_RGB, HOVER_RADIUS_BONUS,
  type ClusterLabelVariant, type LabelBox, type LabelData,
  drawClusterLabel, drawHoverRing, drawLabel, measureClusterLabel, measureLabel,
} from './cosmographDrawing'
import {
  CLUSTER_RING, UNCATEGORIZED_CLUSTER_INDEX, type SubClusterInfo,
} from './useCosmographBuffers'

// ── Zoom-LOD ──────────────────────────────────────────────────────────────
// Plus on zoome, plus on nomme de nœuds. Seuils choisis à la main sur le
// dataset : à z=1 on lit les 12 hubs, à z=2 on commence à voir les nœuds
// secondaires, à z=4 on nomme une bonne partie du cluster courant. La
// détection de collision filtre les labels qui se chevaucheraient, donc
// augmenter la borne n'élargit que les ressources nommables, pas la
// saturation visuelle.
function landmarkCountForZoom(zoom: number, pool: number): number {
  if (zoom <= 1.2) return Math.min(12, pool)
  if (zoom <= 2) return Math.min(22, pool)
  if (zoom <= 3.5) return Math.min(35, pool)
  if (zoom <= 5) return Math.min(48, pool)
  return pool
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

type OverlayRefs = {
  graphRef: RefObject<Graph | null>
  labelCanvasRef: RefObject<HTMLCanvasElement | null>
  hoveredIndexRef: MutableRefObject<number | null>
  selectedVisualIndexRef: MutableRefObject<number | null>
  flatSizesRef: MutableRefObject<Float32Array>
  labelByIndexRef: MutableRefObject<LabelData[]>
  glowHexByIndexRef: MutableRefObject<string[]>
  landmarkIndicesExtendedRef: MutableRefObject<number[]>
  landmarkIndicesCategoriesExtendedRef: MutableRefObject<number[]>
  visibleIndexSetRef: MutableRefObject<Set<number> | null>
  clusterByAxisRef: MutableRefObject<boolean>
  clusterAssignmentsRef: MutableRefObject<(number | undefined)[]>
  subClusterByIndexRef: MutableRefObject<number[]>
  subClustersRef: MutableRefObject<SubClusterInfo[]>
  flashNodeIdsRef: MutableRefObject<Set<string>>
  flashAlphaRef: MutableRefObject<number>
  idToIndexRef: MutableRefObject<Map<string, number>>
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
    // pertinent quand les liens sont masqués). Sinon top-N par degré. On
    // lit le pool *étendu* — le préfixe effectif est calé au zoom juste
    // après (LOD).
    const pool = categoriesMode
      ? refs.landmarkIndicesCategoriesExtendedRef.current
      : refs.landmarkIndicesExtendedRef.current
    // Focal visible : si hors-range timeline/filtres, on le traite comme
    // absent pour le rendu (glow + label). Même règle que applyFocalStyling
    // côté GL — évite un glow accroché à un nœud greyed-out.
    const focal = rawFocal !== null && (visible === null || visible.has(rawFocal))
      ? rawFocal
      : null

    // (1) Glow du focal (hover sinon sélection) — même rendu que hover.
    // L'anneau fin qui suit le glow remplace le renderHoveredPointRing natif
    // de cosmos.gl : on l'a désactivé pour piloter le pick en tolérance, il
    // faut donc redessiner nous-mêmes l'affordance « je suis pile dessus ».
    if (focal !== null && focal < sizes.length) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const baseR = sizes[focal]
        const hoverR = baseR + HOVER_RADIUS_BONUS
        const glowColor = glowHex[focal] ?? '#ffffff'
        drawGlow(ctx, sx, sy, hoverR, hoverR + 6, glowColor, 0.42)
        drawHoverRing(ctx, sx, sy, baseR)
      }
    }

    // Zoom-LOD : combien de landmarks on a le droit de nommer à ce niveau
    // de zoom. Le reste est filtré par la collision detection — on prend le
    // préfixe ordonné (hubs en tête) et on s'arrête dès qu'un label
    // chevauche un label de priorité supérieure.
    const zoom = g.getZoomLevel()
    const effectiveCount = landmarkCountForZoom(zoom, pool.length)

    // File des boîtes déjà dessinées — priorité : focal (dessiné en dernier
    // mais mesuré en premier) > landmarks dans l'ordre du pool (par degré
    // ou taille). On empile chaque boîte retenue, on rejette une boîte qui
    // chevaucherait une précédente.
    const drawnBoxes: LabelBox[] = []

    // (2a) On *réserve* la place du focal en premier (priorité max). On ne
    // le dessine pas encore — le label focal doit être peint par-dessus les
    // landmarks pour rester lisible.
    let focalBox: LabelBox | null = null
    let focalScreen: { sx: number; sy: number; r: number } | null = null
    if (focal !== null && focal < sizes.length) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const r = sizes[focal] + HOVER_RADIUS_BONUS
        focalBox = measureLabel(ctx, sx, sy, r, labels[focal], true)
        focalScreen = { sx, sy, r }
        drawnBoxes.push(focalBox)
      }
    }

    // (2b) Labels des pôles d'axes — dessinés *avant* les landmarks pour
    // avoir priorité sur eux (le repère macro doit rester lisible), et
    // mesurés ici pour bloquer les landmarks qui les chevaucheraient.
    // Eux-mêmes peuvent être éliminés par collision entre axes au zoom
    // très faible (les clusters se rapprochent).
    if (categoriesMode) {
      drawClusterRingLabels(ctx, g, refs.clusterAssignmentsRef.current, tracked, drawnBoxes)
      drawSubClusterLabels(ctx, g, refs.subClustersRef.current, drawnBoxes)
    }

    // (3) Labels landmarks, en ordre de priorité (pool trié par degré /
    // taille). On mesure d'abord, on rejette par collision, sinon on dessine.
    for (let k = 0; k < effectiveCount; k++) {
      const idx = pool[k]
      if (idx === focal) continue
      if (visible !== null && !visible.has(idx)) continue
      const space = tracked.get(idx)
      if (!space) continue
      const [sx, sy] = g.spaceToScreenPosition(space)
      const r = sizes[idx]
      const box = measureLabel(ctx, sx, sy, r, labels[idx], false)
      let collides = false
      for (const prev of drawnBoxes) {
        if (boxesOverlap(box, prev)) { collides = true; break }
      }
      if (collides) continue
      drawLabel(ctx, sx, sy, r, labels[idx], false)
      drawnBoxes.push(box)
    }

    // (4) Label du focal en mode « hover » (curseur ou sélection persistée)
    // rendu *en dernier* pour passer par-dessus les landmarks. Sa boîte a
    // déjà bloqué les landmarks en (3) donc elle ne sera pas masquée.
    if (focal !== null && focalScreen) {
      drawLabel(ctx, focalScreen.sx, focalScreen.sy, focalScreen.r, labels[focal], true)
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
 *
 * `drawnBoxes` est l'accumulateur global de collision du caller : chaque
 * label d'axe posé y est ajouté pour bloquer les landmarks qui viendraient
 * dessus. Les axes qui se chevauchent eux-mêmes (zoom très faible → les
 * clusters se rapprochent) sont silencieusement masqués.
 */
function drawClusterRingLabels(
  ctx: CanvasRenderingContext2D,
  g: Graph,
  clusters: (number | undefined)[],
  tracked: ReadonlyMap<number, [number, number]>,
  drawnBoxes: LabelBox[],
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

  const tryDraw = (
    sx: number, sy: number,
    text: string, color: string,
    variant: ClusterLabelVariant = 'major',
  ): LabelBox | null => {
    const box = measureClusterLabel(ctx, sx, sy, text, variant)
    for (const prev of drawnBoxes) {
      if (boxesOverlap(box, prev)) return null
    }
    drawClusterLabel(ctx, sx, sy, text, color, variant)
    drawnBoxes.push(box)
    return box
  }

  for (let i = 0; i < CLUSTER_RING.length; i++) {
    const cx = clusterPositions[i * 2]
    const cy = clusterPositions[i * 2 + 1]
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
    const axis = CLUSTER_RING[i]
    const [sx, sy] = g.spaceToScreenPosition([cx, cy])
    const label = axisLabel(axis) ?? axis
    const color = axisColor(axis) ?? '#ffffff'
    // Pas d'uppercase : incompatible avec le point médian en français et lit
    // comme un CRI. Le tracking et la font-weight 700 suffisent à marquer la
    // hiérarchie visuelle.
    tryDraw(sx, labelYFor(i, sy), label, color)
  }
  // "Autres disciplines" — auto-placé comme pair du ring (cosmos.gl ne
  // supporte pas le nesting, donc UNCATEGORIZED est un cluster *simple*
  // dans lequel les livres de sous-cluster sont mélangés). Les sous-clusters
  // sont distingués par la couleur des nœuds + un label overlay rendu
  // séparément (drawSubClusterLabels).
  const uCx = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2]
  const uCy = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2 + 1]
  if (Number.isFinite(uCx) && Number.isFinite(uCy)) {
    const [sx, sy] = g.spaceToScreenPosition([uCx, uCy])
    const color = axisColor('UNCATEGORIZED') ?? '#999999'
    tryDraw(sx, labelYFor(UNCATEGORIZED_CLUSTER_INDEX, sy), 'Autres disciplines', color)
  }
}

/**
 * Labels des sous-clusters (philosophie, literature, art…) — chacun a son
 * propre centroïde cosmos (position fixée dans useCosmographLayoutEffect).
 * Le label se dessine au-dessus du centroïde, variante `minor`. Collision
 * contre les labels déjà posés (ring + UNCATEGORIZED) pour éviter la
 * superposition avec le label parent.
 */
function drawSubClusterLabels(
  ctx: CanvasRenderingContext2D,
  g: Graph,
  subClusters: SubClusterInfo[],
  drawnBoxes: LabelBox[],
): void {
  const clusterPositions = g.getClusterPositions()
  const LABEL_PAD_ABOVE = 14
  for (const sc of subClusters) {
    const cx = clusterPositions[sc.clusterIdx * 2]
    const cy = clusterPositions[sc.clusterIdx * 2 + 1]
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
    const [sx, sy] = g.spaceToScreenPosition([cx, cy])
    // Probe pour obtenir la hauteur, puis positionner le label juste
    // au-dessus du centroïde (middle-baseline).
    const probe = measureClusterLabel(ctx, sx, sy, sc.label, 'minor')
    const labelSy = sy - LABEL_PAD_ABOVE - probe.h / 2
    const box = measureClusterLabel(ctx, sx, labelSy, sc.label, 'minor')
    let collides = false
    for (const prev of drawnBoxes) {
      if (boxesOverlap(box, prev)) { collides = true; break }
    }
    if (collides) continue
    drawClusterLabel(ctx, sx, labelSy, sc.label, sc.color, 'minor')
    drawnBoxes.push(box)
  }
}

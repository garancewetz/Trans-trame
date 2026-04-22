import { axisColor } from '@/common/utils/categories'
import { roundRect, withAlpha } from '@/features/graph/canvas/canvasUtils'

// Durée de l'anneau de flash sur import — aligné sur Constellation
// (useFlashAnimation.ts DURATION=3500 ms).
export const FLASH_DURATION_MS = 3500
export const FLASH_COLOR_RGB = '0, 255, 135'

export const FALLBACK_RGBA: [number, number, number, number] = [0.78, 0.78, 0.84, 1]

// Taille de la texture gradient (px). 256 = bon compromis qualité/mem à 5k
// nœuds. Le cache est indexé par combo d'axes unique (pas par nœud), donc
// ~50 combos max × 256² × 4 bytes = ~13 MB GPU. Reste net jusqu'à zoom ×5
// sur les plus gros hubs.
export const GRADIENT_TEX_SIZE = 256

// Bonus de rayon au hover — aligné sur Galaxy (hoveredRadius : baseR + 12).
export const HOVER_RADIUS_BONUS = 12

// Tolérance de pick en px écran : distance max entre le curseur et le centre
// d'un point pour qu'il soit considéré comme hovered. Remplace la détection
// stricte de cosmos.gl qui exigeait un pixel pile sur le disque — fastidieux
// sur les petits points (~2–4 px à bas zoom).
export const HOVER_TOLERANCE_PX = 14

// Déplacement max autorisé entre pointerdown et click pour qu'on considère
// l'interaction comme un clic (et pas un pan). Au-delà, le click event natif
// est ignoré — évite qu'un pan ne déclenche onNodeClick.
export const CLICK_MOVE_THRESHOLD_PX = 5

// Anneau dessiné autour du nœud hovered — remplace le renderHoveredPointRing
// natif de cosmos.gl (qu'on désactive pour piloter le pick en tolérance).
export const HOVER_RING_COLOR = '#ece9ff'

/**
 * Peint un fin anneau circulaire autour du nœud focal. Remplace le
 * renderHoveredPointRing natif de cosmos : même aspect visuel, mais suit
 * notre détection en tolérance au lieu du pick strict interne.
 */
export function drawHoverRing(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2)
  ctx.strokeStyle = HOVER_RING_COLOR
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

// Tokens typographiques — miroir de Galaxy (nodeObject.ts drawBookLabel).
const LABEL_FONT = "'Space Grotesk', system-ui, sans-serif"
const LABEL_BG_IDLE = 'rgba(8, 4, 22, 0.72)'
// Hover : alpha 0.9 plutôt qu'opaque. Sur un cluster dense, un fond full
// opaque masquait complètement les voisins du nœud focalisé — pile ce qu'on
// cherche à voir en contexte.
const LABEL_BG_HOVER = 'rgba(8, 4, 22, 0.9)'
const LABEL_BORDER = 'rgba(255, 255, 255, 0.1)'
const LABEL_TEXT_IDLE = 'rgba(236, 233, 255, 0.88)'
const LABEL_TEXT_DIM_IDLE = 'rgba(255, 255, 255, 0.55)'
const LABEL_TEXT_HOVER = '#ece9ff'
const LABEL_TEXT_DIM_HOVER = 'rgba(255, 255, 255, 0.55)'
const LABEL_TEXT_ORIGINAL_HOVER = 'rgba(255, 220, 180, 0.72)'

export type LabelData = {
  author: string
  title: string
  // Titre dans la langue d'origine, si différent du titre traduit. Rendu en
  // 3ᵉ ligne, en italique grisé, uniquement au hover — montrer d'où l'œuvre
  // vient sans surcharger le rendu idle.
  originalTitle?: string
}

/** Convert `#rrggbb` / `#rgb` → `[r,g,b,a]` in [0,1]. cosmos.gl expects floats. */
export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return FALLBACK_RGBA
  const n = parseInt(h, 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, alpha]
}

/**
 * Rend un disque avec gradient conique multi-axes en ImageData pour
 * setImageData() de cosmos.gl. Clone visuel du gradient Galaxy
 * (cache/nodeCache.ts).
 */
export function axesGradientImageData(axes: readonly string[]): ImageData | null {
  const SZ = GRADIENT_TEX_SIZE
  const C = SZ / 2
  const canvas = document.createElement('canvas')
  canvas.width = SZ
  canvas.height = SZ
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const colors = axes.map((ax) => axisColor(ax) ?? '#c8c8d6')
  ctx.clearRect(0, 0, SZ, SZ)

  // Clip to circle — cosmos.gl rend le rectangle tel quel, donc on doit
  // masquer nous-mêmes pour obtenir un disque.
  ctx.save()
  ctx.beginPath()
  ctx.arc(C, C, C - 1, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, SZ, SZ)
  } else {
    const grad = ctx.createConicGradient(0, C, C)
    colors.forEach((c, i) => grad.addColorStop(i / colors.length, c))
    grad.addColorStop(1, colors[0])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SZ, SZ)
  }
  ctx.restore()

  return ctx.getImageData(0, 0, SZ, SZ)
}

// Cache module-level pour wrapLines. Le drawOverlay tourne 60 fps et
// recalcule ~12 landmarks + focal à chaque frame — la mise en cache évite
// des centaines de `ctx.measureText()` inutiles. Clé = texte+font+maxW
// arrondi. Borne LRU simple pour éviter la fuite (1000 entrées ≈ taille
// largement supérieure au corpus + tailles fontes courantes).
type WrapResult = { lines: string[]; maxLineWidth: number }
const WRAP_CACHE_MAX = 1000
const wrapCache = new Map<string, WrapResult>()

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): WrapResult {
  if (!text) return { lines: [], maxLineWidth: 0 }
  const key = `${ctx.font}|${Math.round(maxW)}|${text}`
  const hit = wrapCache.get(key)
  if (hit) {
    // LRU refresh — re-insert to move to end.
    wrapCache.delete(key)
    wrapCache.set(key, hit)
    return hit
  }
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  let maxLineWidth = 0
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    if (ctx.measureText(candidate).width <= maxW) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  for (const l of lines) {
    const w = ctx.measureText(l).width
    if (w > maxLineWidth) maxLineWidth = w
  }
  const result = { lines, maxLineWidth }
  if (wrapCache.size >= WRAP_CACHE_MAX) {
    const firstKey = wrapCache.keys().next().value
    if (firstKey !== undefined) wrapCache.delete(firstKey)
  }
  wrapCache.set(key, result)
  return result
}

/**
 * AABB retournée par `measureLabel` / `drawLabel`, utilisée par la détection
 * de collision côté overlay — deux labels dont les boîtes se chevauchent sont
 * masqués (le moins prioritaire).
 */
export type LabelBox = { x: number; y: number; w: number; h: number }

type LabelLayout = {
  box: LabelBox
  nameWrap: WrapResult
  titleWrap: WrapResult
  origTitleWrap: WrapResult
  baseFont: number
  lineH: number
  subFont: number
  subLineH: number
  padX: number
  padY: number
  border: number
  nameH: number
}

function computeLabelLayout(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  data: LabelData,
  hover: boolean,
): LabelLayout {
  const baseFont = hover ? 14 : 11
  const lineH = baseFont * 1.25
  const subFont = baseFont * 0.9
  const subLineH = subFont * 1.25
  const maxW = baseFont * 14

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  const nameWrap = wrapLines(ctx, data.author, maxW)

  ctx.font = `400 ${subFont}px ${LABEL_FONT}`
  const titleWrap = data.title ? wrapLines(ctx, data.title, maxW) : { lines: [], maxLineWidth: 0 }

  // Titre original : rendu uniquement au hover pour ne pas alourdir les
  // landmarks idle. Même taille que le titre traduit, italique.
  ctx.font = `italic 400 ${subFont}px ${LABEL_FONT}`
  const origTitleWrap = hover && data.originalTitle
    ? wrapLines(ctx, data.originalTitle, maxW)
    : { lines: [], maxLineWidth: 0 }

  const padX = baseFont * (hover ? 0.8 : 0.5)
  const padY = baseFont * (hover ? 0.5 : 0.3)
  const border = baseFont * (hover ? 0.6 : 0.4)
  const contentW = Math.max(nameWrap.maxLineWidth, titleWrap.maxLineWidth, origTitleWrap.maxLineWidth)
  const boxW = contentW + padX * 2
  const nameH = lineH * nameWrap.lines.length
  const titleH = subLineH * titleWrap.lines.length
  const origTitleH = origTitleWrap.lines.length > 0
    ? subLineH * origTitleWrap.lines.length + subFont * 0.3 // petit gap avant
    : 0
  const boxH = nameH + titleH + origTitleH + padY * 2
  const boxX = x - boxW / 2
  const boxY = y - radius - boxH - baseFont * 0.4

  return {
    box: { x: boxX, y: boxY, w: boxW, h: boxH },
    nameWrap, titleWrap, origTitleWrap,
    baseFont, lineH, subFont, subLineH,
    padX, padY, border, nameH,
  }
}

/** Mesure seulement — pas de rendu. Pour la détection de collision. */
export function measureLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  data: LabelData,
  hover: boolean,
): LabelBox {
  return computeLabelLayout(ctx, x, y, radius, data, hover).box
}

/**
 * Peint un label 2-3 lignes (AUTEUR maj + titre + titre original en italique
 * au hover) au-dessus du point. Retourne l'AABB rendue pour permettre au
 * dessinateur amont de gérer les collisions.
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  data: LabelData,
  hover: boolean,
): LabelBox {
  const L = computeLabelLayout(ctx, x, y, radius, data, hover)
  const { box, nameWrap, titleWrap, origTitleWrap } = L
  const { baseFont, lineH, subFont, subLineH, padY, border, nameH } = L

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.fillStyle = hover ? LABEL_BG_HOVER : LABEL_BG_IDLE
  roundRect(ctx, box.x, box.y, box.w, box.h, border)
  ctx.fill()
  if (hover) {
    ctx.strokeStyle = LABEL_BORDER
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  ctx.fillStyle = hover ? LABEL_TEXT_HOVER : LABEL_TEXT_IDLE
  for (let i = 0; i < nameWrap.lines.length; i++) {
    ctx.fillText(nameWrap.lines[i], x, box.y + padY + lineH * i)
  }

  const titleStart = box.y + padY + nameH
  if (titleWrap.lines.length > 0) {
    ctx.font = `400 ${subFont}px ${LABEL_FONT}`
    ctx.fillStyle = hover ? LABEL_TEXT_DIM_HOVER : LABEL_TEXT_DIM_IDLE
    for (let i = 0; i < titleWrap.lines.length; i++) {
      ctx.fillText(titleWrap.lines[i], x, titleStart + subLineH * i)
    }
  }

  if (origTitleWrap.lines.length > 0) {
    ctx.font = `italic 400 ${subFont}px ${LABEL_FONT}`
    ctx.fillStyle = LABEL_TEXT_ORIGINAL_HOVER
    const titleH = subLineH * titleWrap.lines.length
    const origStart = titleStart + titleH + subFont * 0.3
    for (let i = 0; i < origTitleWrap.lines.length; i++) {
      ctx.fillText(origTitleWrap.lines[i], x, origStart + subLineH * i)
    }
  }

  ctx.restore()
  return box
}

/**
 * Variante visuelle d'un label de cluster.
 * - `major` : axe principal du ring + "Autres disciplines". Typo large,
 *   tracking 2px, weight 700 — repère macro, priorité de lecture.
 * - `minor` : sous-cluster à l'intérieur de "Autres disciplines"
 *   (Philosophie…). Typo plus petite, tracking réduit, weight 600,
 *   alpha plus bas — signale la subordination hiérarchique.
 */
export type ClusterLabelVariant = 'major' | 'minor'

type ClusterLabelStyle = {
  font: number
  weight: number
  letterSpacing: string
  padX: number
  padY: number
  strokeAlpha: number
  bgAlpha: number
}

const CLUSTER_LABEL_STYLES: Record<ClusterLabelVariant, ClusterLabelStyle> = {
  major: { font: 13, weight: 700, letterSpacing: '2px', padX: 14, padY: 8, strokeAlpha: 0.7, bgAlpha: 0.92 },
  minor: { font: 10, weight: 600, letterSpacing: '1px', padX: 10, padY: 5, strokeAlpha: 0.45, bgAlpha: 0.78 },
}

function clusterLabelBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  variant: ClusterLabelVariant = 'major',
): LabelBox {
  const s = CLUSTER_LABEL_STYLES[variant]
  ctx.save()
  ctx.font = `${s.weight} ${s.font}px ${LABEL_FONT}`
  ctx.letterSpacing = s.letterSpacing
  const metrics = ctx.measureText(text)
  ctx.restore()
  const w = metrics.width + s.padX * 2
  const h = s.font + s.padY * 2
  return { x: x - w / 2, y: y - h / 2, w, h }
}

/** Mesure seulement — pour la détection de collision entre labels d'axes. */
export function measureClusterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  variant: ClusterLabelVariant = 'major',
): LabelBox {
  return clusterLabelBox(ctx, x, y, text, variant)
}

/**
 * Peint le label d'un axe à sa position de cluster. Pill assombrie + stroke
 * couleur d'axe pour identifier le pôle au premier coup d'œil. La variante
 * `minor` est utilisée pour les sous-clusters (mini-pôles à l'intérieur de
 * "Autres disciplines") — plus petite, plus discrète.
 */
export function drawClusterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  color: string,
  variant: ClusterLabelVariant = 'major',
): LabelBox {
  const s = CLUSTER_LABEL_STYLES[variant]
  const box = clusterLabelBox(ctx, x, y, text, variant)
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${s.weight} ${s.font}px ${LABEL_FONT}`
  ctx.letterSpacing = s.letterSpacing

  ctx.fillStyle = `rgba(8, 4, 22, ${s.bgAlpha})`
  roundRect(ctx, box.x, box.y, box.w, box.h, box.h / 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(color, s.strokeAlpha)
  ctx.lineWidth = variant === 'minor' ? 1 : 1.5
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
  return box
}

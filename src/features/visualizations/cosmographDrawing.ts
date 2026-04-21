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

// Tokens typographiques — miroir de Galaxy (nodeObject.ts drawBookLabel).
const LABEL_FONT = "'Space Grotesk', system-ui, sans-serif"
const LABEL_BG_IDLE = 'rgba(8, 4, 22, 0.72)'
const LABEL_BG_HOVER = '#080416'
const LABEL_BORDER = 'rgba(255, 255, 255, 0.1)'
const LABEL_TEXT_IDLE = 'rgba(236, 233, 255, 0.88)'
const LABEL_TEXT_DIM_IDLE = 'rgba(255, 255, 255, 0.55)'
const LABEL_TEXT_HOVER = '#ece9ff'
const LABEL_TEXT_DIM_HOVER = 'rgba(255, 255, 255, 0.55)'

export type LabelData = { author: string; title: string }

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

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): { lines: string[]; maxLineWidth: number } {
  if (!text) return { lines: [], maxLineWidth: 0 }
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
  return { lines, maxLineWidth }
}

/**
 * Peint un label 2-lignes (AUTEUR maj + titre) au-dessus du point. Clone
 * visuel de drawBookLabel dans Galaxy (features/graph/nodeObject.ts L257-341).
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  data: LabelData,
  hover: boolean,
): void {
  const baseFont = hover ? 14 : 11
  const lineH = baseFont * 1.25
  const subFont = baseFont * 0.9
  const subLineH = subFont * 1.25
  const maxW = baseFont * 14

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  const nameWrap = wrapLines(ctx, data.author, maxW)

  ctx.font = `400 ${subFont}px ${LABEL_FONT}`
  const titleWrap = data.title ? wrapLines(ctx, data.title, maxW) : { lines: [], maxLineWidth: 0 }

  const padX = baseFont * (hover ? 0.8 : 0.5)
  const padY = baseFont * (hover ? 0.5 : 0.3)
  const border = baseFont * (hover ? 0.6 : 0.4)
  const contentW = Math.max(nameWrap.maxLineWidth, titleWrap.maxLineWidth)
  const boxW = contentW + padX * 2
  const nameH = lineH * nameWrap.lines.length
  const titleH = subLineH * titleWrap.lines.length
  const boxH = nameH + titleH + padY * 2
  const boxX = x - boxW / 2
  const boxY = y - radius - boxH - baseFont * 0.4

  ctx.fillStyle = hover ? LABEL_BG_HOVER : LABEL_BG_IDLE
  roundRect(ctx, boxX, boxY, boxW, boxH, border)
  ctx.fill()
  if (hover) {
    ctx.strokeStyle = LABEL_BORDER
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  ctx.fillStyle = hover ? LABEL_TEXT_HOVER : LABEL_TEXT_IDLE
  for (let i = 0; i < nameWrap.lines.length; i++) {
    ctx.fillText(nameWrap.lines[i], x, boxY + padY + lineH * i)
  }

  if (titleWrap.lines.length > 0) {
    ctx.font = `400 ${subFont}px ${LABEL_FONT}`
    ctx.fillStyle = hover ? LABEL_TEXT_DIM_HOVER : LABEL_TEXT_DIM_IDLE
    const titleStart = boxY + padY + nameH
    for (let i = 0; i < titleWrap.lines.length; i++) {
      ctx.fillText(titleWrap.lines[i], x, titleStart + subLineH * i)
    }
  }

  ctx.restore()
}

/**
 * Peint le label d'un axe à sa position de cluster. Typo large, uppercase,
 * tracking marqué — c'est le repère macro, il doit se lire au-dessus de la
 * masse des labels de livres sans les noyer. Pill assombrie + stroke couleur
 * d'axe pour identifier le pôle au premier coup d'œil.
 */
export function drawClusterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  color: string,
): void {
  const font = 13
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${font}px ${LABEL_FONT}`
  ctx.letterSpacing = '2px'

  const metrics = ctx.measureText(text)
  const padX = 14
  const padY = 8
  const w = metrics.width + padX * 2
  const h = font + padY * 2

  ctx.fillStyle = 'rgba(8, 4, 22, 0.92)'
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(color, 0.7)
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

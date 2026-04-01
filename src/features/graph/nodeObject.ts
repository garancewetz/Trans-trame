// @ts-nocheck — domain types have optional x/y (d3 adds them at runtime); avoiding widespread casts.
import { blendAxesColors, AXES_COLORS } from '@/common/utils/categories'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Book, Author } from '@/types/domain'

// ── Caches ────────────────────────────────────────────────────────────────────

const hoverAnimById = new Map()
export function clearHoverAnim(): void { hoverAnimById.clear() }

const gradientCanvasCache = new Map<string, HTMLCanvasElement>()
const GRAD_SIZE = 64

function getGradientCanvas(axes: string[] | undefined | null): HTMLCanvasElement {
  const key = (axes || []).join('|') || '_empty'
  const cached = gradientCanvasCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = GRAD_SIZE
  canvas.height = GRAD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    gradientCanvasCache.set(key, canvas)
    return canvas
  }

  let colors = (axes || [])
    .map((a) => AXES_COLORS[a])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
  if (colors.length === 0) colors = ['#ffffff']

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  } else {
    const gradient = ctx.createConicGradient(0, GRAD_SIZE / 2, GRAD_SIZE / 2)
    colors.forEach((c, i) => gradient.addColorStop(i / colors.length, c))
    gradient.addColorStop(1, colors[0])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  }

  gradientCanvasCache.set(key, canvas)
  return canvas
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function withAlpha(hex, alpha) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`)
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function computeHover(nodeId: string, isHovered: boolean): number {
  const prev = hoverAnimById.get(nodeId) ?? 0
  const hover = prev + ((isHovered ? 1 : 0) - prev) * 0.22
  hoverAnimById.set(nodeId, hover)
  return hover
}

function drawGlow(ctx, x, y, innerR, outerR, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, innerR, x, y, outerR)
  grad.addColorStop(0, withAlpha(color, alpha))
  grad.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, outerR, 0, Math.PI * 2)
  ctx.fill()
}

// ── Shared node state ─────────────────────────────────────────────────────────

function computeNodeState(node, opts) {
  const {
    selectedNode, selectedAuthorId, peekNodeId, hoveredNode, hoveredNeighborIds,
    connectedNodes, hoveredFilter, isNodeVisible,
  } = opts

  const isHovered = hoveredNode?.id === node.id
  const hover = computeHover(node.id, isHovered)

  const hasAnySelection = !!(selectedNode || selectedAuthorId || peekNodeId)
  const nodeAxes = node.axes || []
  const matchesHover = !!(hoveredFilter && nodeAxes.includes(hoveredFilter))
  const dimmedByHover = !!(hoveredFilter && !matchesHover)

  const hasHoverFocus = !!(hoveredNode && !hasAnySelection)
  const isHoverNeighbor = !!(hasHoverFocus && hoveredNeighborIds?.has(node.id))
  const isConnected = !!connectedNodes?.has(node.id)

  const isHighlighted = node.type === 'author'
    ? !!(selectedAuthorId && node.id === selectedAuthorId)
    : !!((selectedAuthorId && node.authorIds?.includes(selectedAuthorId)) || (peekNodeId && node.id === peekNodeId))

  const isActive = node.type === 'author'
    ? !hasAnySelection || isConnected || isHighlighted
    : (!hasAnySelection || isConnected) && (isNodeVisible?.(node) ?? true)

  const opacity = hasHoverFocus && !isHovered && !isHoverNeighbor ? 0.05
    : hover > 0.01 ? 1
    : dimmedByHover ? 0.06
    : node.type === 'author'
      ? ((isHighlighted || isActive) ? 0.85 : 0.25)
      : ((isHighlighted || isActive) ? 1 : 0.22)

  const blendedColor = node.type === 'author'
    ? (nodeAxes.length ? blendAxesColors(nodeAxes) : '#b0b8d0')
    : blendAxesColors(nodeAxes)

  return { hover, opacity, isActive, isHighlighted, matchesHover, blendedColor, hasHoverFocus, isHoverNeighbor }
}

function shouldShowLabel(node, globalScale, state, opts) {
  const { hover, isHighlighted, hasHoverFocus, isHoverNeighbor } = state
  const { selectedNode, connectedNodes } = opts
  if (hasHoverFocus && hover <= 0.01 && !isHoverNeighbor) return false
  return hover > 0.01 || globalScale > 0.35 || isHighlighted
    || !!(selectedNode && connectedNodes?.has(node.id))
    || (hasHoverFocus && isHoverNeighbor)
}

// ── Node radius ───────────────────────────────────────────────────────────────

export function getNodeRadius(node: { type?: string }, citationCount: number, degree = 0): number {
  if (node.type === 'author') return 11
  const citationBoost = Math.min(Math.sqrt(Math.max(0, Number.isFinite(citationCount) ? citationCount : 0)) * 5.2, 34)
  const degreeBoost = Math.min(Math.sqrt(Math.max(0, Number.isFinite(degree) ? degree : 0)) * 4, 28)
  return 6 + Math.max(citationBoost, degreeBoost)
}

function hoveredRadius(baseR, hover, globalScale) {
  const minR = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  return Math.max(baseR + hover * 12, minR)
}

const POINTER_PAD = 3

/**
 * Rayon pour `nodePointerAreaPaint` : au moins celui du nœud **entièrement** survolé,
 * pour ne pas perdre le hover quand le disque grossit (le pointeur reste dans la zone peinte).
 */
export function getNodePointerHitRadius(
  node: { type?: string },
  citationCount: number,
  degree: number,
  globalScale: number,
): number {
  const scale = Number.isFinite(globalScale) && globalScale > 0 ? globalScale : 1
  if (node.type === 'author') {
    const BASE_R = 9
    const maxOuterRing = BASE_R + 6 + 4 // aligné sur l'anneau hover max dans drawAuthorNode
    return maxOuterRing + POINTER_PAD
  }
  const baseR = getNodeRadius(node, citationCount, degree)
  return hoveredRadius(baseR, 1, scale) + POINTER_PAD
}

// ── Author node ───────────────────────────────────────────────────────────────

function drawAuthorNode(node, ctx, globalScale, opts) {
  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return

  const state = computeNodeState(node, opts)
  const { hover, opacity, isActive, isHighlighted, matchesHover, blendedColor } = state
  const BASE_R = 9
  const ringR = BASE_R + 2

  ctx.save()

  // Aura
  if (isActive || matchesHover || isHighlighted) {
    const alpha = hover > 0.01 ? 0.3 : isHighlighted ? 0.28 : 0.12
    drawGlow(ctx, node.x, node.y, BASE_R, BASE_R + 5 + hover * 7, blendedColor, alpha)
  }

  ctx.globalAlpha = opacity

  // Cœur semi-transparent
  ctx.beginPath()
  ctx.arc(node.x, node.y, BASE_R, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(blendedColor, 0.18 + hover * 0.2)
  ctx.fill()

  // Anneau extérieur
  ctx.beginPath()
  ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2)
  ctx.strokeStyle = blendedColor
  ctx.lineWidth = (hover > 0.01 ? 2.2 : 1.6) / Math.max(globalScale, 0.1)
  ctx.stroke()

  // Double anneau (hover / sélection)
  if (hover > 0.05 || isHighlighted) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, BASE_R + 6 + hover * 4, 0, Math.PI * 2)
    ctx.strokeStyle = withAlpha(blendedColor, hover > 0.05 ? 0.45 : 0.22)
    ctx.lineWidth = 0.8 / Math.max(globalScale, 0.1)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  drawAuthorLabel(node, ctx, globalScale, state, opts, ringR)
  ctx.restore()
}

function drawAuthorLabel(node, ctx, globalScale, state, opts, nodeRadius) {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isHighlighted } = state
  const name = (authorName(node) || '').toUpperCase()
  const minHovered = hover > 0.01 ? 20 / Math.max(globalScale, 0.08) : 0
  const fontSize = Math.max(5.5 * (1 + hover * 0.8), minHovered)
  const labelY = node.y - nodeRadius - fontSize * 2.5
  const prominent = hover > 0.01 || isHighlighted

  ctx.save()
  ctx.font = `700 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  if (prominent) {
    const w = ctx.measureText(name).width
    const pad = 3
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    roundRect(ctx, node.x - w / 2 - pad, labelY - pad, w + pad * 2, fontSize + pad * 2, 3)
    ctx.fill()
  }

  ctx.fillStyle = prominent ? '#ffffff' : 'rgba(255,255,255,0.28)'
  ctx.fillText(name, node.x, labelY)
  ctx.restore()
}

// ── Book node ─────────────────────────────────────────────────────────────────

export function drawNode(node: Book | Author, ctx: CanvasRenderingContext2D, globalScale: number, opts: any): void {
  if (node.type === 'author') return drawAuthorNode(node, ctx, globalScale, opts)
  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return
  if (!Number.isFinite(globalScale)) globalScale = 1

  const { citationCount = 0, degree = 0, skipLabel = false, labelOnly = false } = opts
  const baseR = getNodeRadius(node, citationCount, degree)

  // labelOnly: re-draw label on top (post pass) — read cached hover, don't advance animation
  if (labelOnly) {
    const hover = hoverAnimById.get(node.id) ?? 1
    const r = hoveredRadius(baseR, hover, globalScale)
    const syntheticState = { hover, isActive: true, isHighlighted: true, matchesHover: false, hasHoverFocus: false, isHoverNeighbor: false }
    drawBookLabel(node, ctx, globalScale, syntheticState, opts, r)
    return
  }

  const state = computeNodeState(node, opts)
  const { hover, opacity, isActive, isHighlighted, matchesHover, blendedColor } = state
  const nodeRadius = hoveredRadius(baseR, hover, globalScale)
  const glowRadius = nodeRadius + (matchesHover ? 4.5 : 2.5)
  if (nodeRadius <= 0 || glowRadius <= 0) return

  const nodeAxes = node.axes || []

  ctx.save()

  // Glow
  if (isActive || matchesHover || isHighlighted) {
    const glowAlpha = hover > 0.01 ? 0.42 : isHighlighted ? 0.4 : matchesHover ? 0.35 : 0.15
    drawGlow(ctx, node.x, node.y, nodeRadius, glowRadius, blendedColor, glowAlpha)
    if (matchesHover) drawGlow(ctx, node.x, node.y, nodeRadius, nodeRadius + 7, blendedColor, 0.08)
  }

  // Circle
  ctx.globalAlpha = opacity
  ctx.beginPath()
  ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
  if (nodeAxes.length > 1) {
    ctx.save()
    ctx.clip()
    ctx.drawImage(getGradientCanvas(nodeAxes), node.x - nodeRadius, node.y - nodeRadius, nodeRadius * 2, nodeRadius * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = blendedColor
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (!skipLabel) drawBookLabel(node, ctx, globalScale, state, opts, nodeRadius)
  ctx.restore()
}

function drawBookLabel(node, ctx, globalScale, state, opts, nodeRadius) {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isActive, isHighlighted, matchesHover } = state
  const safeCitations = Number.isFinite(opts.citationCount) ? opts.citationCount : 0
  const baseSize = 4.8 + Math.min(Math.sqrt(safeCitations) * 1.05, 8.5)
  const minHovered = hover > 0.01 ? 18 / Math.max(globalScale, 0.08) : 0
  const fontSize = Math.max(baseSize * (1 + hover * 0.75), minHovered)

  const name = (bookAuthorDisplay(node, opts.authors || []) || '').toUpperCase()
  const title = node.title || ''
  const labelY = node.y - nodeRadius - fontSize * 3.0
  const lineHeight = fontSize * 1.25
  const prominent = hover > 0.01 || isActive || matchesHover || isHighlighted

  ctx.save()
  ctx.font = `500 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  if (prominent) {
    const nameW = ctx.measureText(name).width
    const titleW = ctx.measureText(title).width
    const maxW = Math.max(nameW, titleW)
    const pad = 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    roundRect(ctx, node.x - maxW / 2 - pad, labelY - pad, maxW + pad * 2, lineHeight * 2 + pad * 2, 3)
    ctx.fill()
  }

  ctx.fillStyle = prominent ? '#ffffff' : 'rgba(255,255,255,0.18)'
  ctx.fillText(name, node.x, labelY)
  ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
  ctx.fillText(title, node.x, labelY + lineHeight)
  ctx.restore()
}

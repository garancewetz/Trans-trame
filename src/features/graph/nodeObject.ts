// @ts-nocheck — domain types have optional x/y (d3 adds them at runtime); avoiding widespread casts.
import { bookAuthorDisplay, authorName } from '@/common/utils/authorUtils'
import type { Book, Author } from '@/types/domain'

import { withAlpha, roundRect, drawGlow, wrapText } from './canvas/canvasUtils'
import { getGradientCanvas, getHoverValue } from './cache/nodeCache'
import { computeNodeState, shouldShowLabel, landmarkLabelAlpha, type D3Node, type DrawNodeOpts } from './domain/nodeVisualState'
import { getNodeRadius, hoveredRadius } from './domain/nodeRadius'

// Re-export public API
export { clearHoverAnim } from './cache/nodeCache'
export { getNodeRadius, getNodePointerHitRadius } from './domain/nodeRadius'

// ── Label card design tokens ─────────────────────────────────────────────────

const LABEL_BG = '#080416'
const LABEL_BORDER = 'rgba(255, 255, 255, 0.1)'
const LABEL_TEXT = '#ece9ff'
const LABEL_TEXT_DIM = 'rgba(255, 255, 255, 0.55)'
const LABEL_BG_IDLE = 'rgba(8, 4, 22, 0.72)'
const LABEL_TEXT_IDLE = 'rgba(236, 233, 255, 0.88)'
const LABEL_TEXT_IDLE_DIM = 'rgba(255, 255, 255, 0.55)'
const LABEL_MAX_W_FACTOR = 14

// ── Author node ───────────────────────────────────────────────────────────────

function drawAuthorNode(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, opts: DrawNodeOpts): void {
  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return

  const state = computeNodeState(node, opts)
  const { hover, opacity, isActive, isHighlighted, matchesHover, blendedColor } = state
  const BASE_R = 9
  const ringR = BASE_R + 2

  ctx.save()

  if (isActive || matchesHover || isHighlighted) {
    const alpha = hover > 0.01 ? 0.3 : isHighlighted ? 0.28 : 0.12
    drawGlow(ctx, node.x, node.y, BASE_R, BASE_R + 5 + hover * 7, blendedColor, alpha)
  }

  ctx.globalAlpha = opacity

  ctx.beginPath()
  ctx.arc(node.x, node.y, BASE_R, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(blendedColor, 0.18 + hover * 0.2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2)
  ctx.strokeStyle = blendedColor
  ctx.lineWidth = (hover > 0.01 ? 2.2 : 1.6) / Math.max(globalScale, 0.1)
  ctx.stroke()

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

function drawAuthorLabel(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts, nodeRadius: number): void {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isHighlighted } = state
  const rawName = (authorName(node) || '').toUpperCase()
  const minHovered = hover > 0.01 ? 13 / Math.max(globalScale, 0.08) : 0
  const idleFloor = hover <= 0.01 && !isHighlighted ? 11 / Math.max(globalScale, 0.2) : 0
  const fontSize = Math.max(5.5 * (1 + hover * 0.35), minHovered, idleFloor)
  const maxW = fontSize * LABEL_MAX_W_FACTOR
  const showCard = hover > 0.01 || isHighlighted

  ctx.save()
  ctx.font = `700 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const nameLines = wrapText(ctx, rawName, maxW)
  const lineHeight = fontSize * 1.25

  if (showCard) {
    const nameW = Math.max(...nameLines.map((l) => ctx.measureText(l).width))
    const padX = fontSize * 0.8
    const padY = fontSize * 0.5
    const borderR = fontSize * 0.6
    const boxW = nameW + padX * 2
    const boxH = lineHeight * nameLines.length + padY * 2
    const boxX = node.x - boxW / 2
    const boxY = node.y - nodeRadius - boxH - fontSize * 0.4

    ctx.fillStyle = LABEL_BG
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.fill()
    ctx.strokeStyle = LABEL_BORDER
    ctx.lineWidth = 1 / Math.max(globalScale, 0.1)
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.stroke()

    ctx.fillStyle = LABEL_TEXT
    nameLines.forEach((line, i) => {
      ctx.fillText(line, node.x, boxY + padY + lineHeight * i)
    })
  } else {
    const nameW = Math.max(...nameLines.map((l) => ctx.measureText(l).width))
    const padX = fontSize * 0.5
    const padY = fontSize * 0.3
    const borderR = fontSize * 0.4
    const boxW = nameW + padX * 2
    const boxH = lineHeight * nameLines.length + padY * 2
    const boxX = node.x - boxW / 2
    const boxY = node.y - nodeRadius - boxH - fontSize * 0.4

    ctx.fillStyle = LABEL_BG_IDLE
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.fill()

    ctx.fillStyle = LABEL_TEXT_IDLE
    nameLines.forEach((line, i) => {
      ctx.fillText(line, node.x, boxY + padY + lineHeight * i)
    })
  }

  ctx.restore()
}

// ── Book node ─────────────────────────────────────────────────────────────────

export function drawNode(node: Book | Author, ctx: CanvasRenderingContext2D, globalScale: number, opts: DrawNodeOpts): void {
  if (node.type === 'author') return drawAuthorNode(node, ctx, globalScale, opts)
  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return
  if (!Number.isFinite(globalScale)) globalScale = 1

  const { citationCount = 0, skipLabel = false, labelOnly = false } = opts
  const baseR = getNodeRadius(node, citationCount)

  if (labelOnly) {
    const hover = getHoverValue(node.id)
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

  if (isActive || matchesHover || isHighlighted) {
    const glowAlpha = hover > 0.01 ? 0.42 : isHighlighted ? 0.4 : matchesHover ? 0.35 : 0.15
    drawGlow(ctx, node.x, node.y, nodeRadius, glowRadius, blendedColor, glowAlpha)
    if (matchesHover) drawGlow(ctx, node.x, node.y, nodeRadius, nodeRadius + 7, blendedColor, 0.08)
  }

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

function drawBookLabel(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts, nodeRadius: number): void {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isHighlighted, matchesHover } = state
  const safeCitations = Number.isFinite(opts.citationCount) ? opts.citationCount : 0
  const baseSize = 4.8 + Math.min(Math.sqrt(safeCitations) * 1.05, 8.5)
  const minHovered = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  const landmarkScreenPx = hover <= 0.01 && !isHighlighted && !matchesHover
    ? Math.min(9 + safeCitations * 2.2, 28)
    : 0
  const idleFloor = landmarkScreenPx / Math.max(globalScale, 0.2)
  const fontSize = Math.max(baseSize * (1 + hover * 0.3), minHovered, idleFloor)
  const idleWeight = safeCitations >= 5 ? 700 : safeCitations >= 3 ? 600 : 500

  const rawName = (bookAuthorDisplay(node, opts.authors || []) || '').toUpperCase()
  const rawTitle = node.title || ''
  const lineHeight = fontSize * 1.25
  const maxW = fontSize * LABEL_MAX_W_FACTOR
  const showCard = hover > 0.01 || isHighlighted || matchesHover

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const titleLineHeight = fontSize * 0.9 * 1.25

  if (showCard) {
    ctx.font = `600 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    const nameLines = wrapText(ctx, rawName, maxW)
    const nameW = Math.max(...nameLines.map((l) => ctx.measureText(l).width))

    ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
    const titleLines = wrapText(ctx, rawTitle, maxW)
    const titleW = Math.max(...titleLines.map((l) => ctx.measureText(l).width))

    const padX = fontSize * 0.8
    const padY = fontSize * 0.5
    const borderR = fontSize * 0.6
    const contentW = Math.max(nameW, titleW)
    const boxW = contentW + padX * 2
    const nameBlockH = lineHeight * nameLines.length
    const titleBlockH = titleLineHeight * titleLines.length
    const boxH = nameBlockH + titleBlockH + padY * 2
    const boxX = node.x - boxW / 2
    const boxY = node.y - nodeRadius - boxH - fontSize * 0.4

    ctx.fillStyle = LABEL_BG
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.fill()
    ctx.strokeStyle = LABEL_BORDER
    ctx.lineWidth = 1 / Math.max(globalScale, 0.1)
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.stroke()

    ctx.font = `600 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    ctx.fillStyle = LABEL_TEXT
    nameLines.forEach((line, i) => {
      ctx.fillText(line, node.x, boxY + padY + lineHeight * i)
    })

    ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
    ctx.fillStyle = LABEL_TEXT_DIM
    const titleStartY = boxY + padY + nameBlockH
    titleLines.forEach((line, i) => {
      ctx.fillText(line, node.x, titleStartY + titleLineHeight * i)
    })
  } else {
    const baseRForFade = getNodeRadius(node, safeCitations)
    const topForced = opts.topDegreeNodeIds?.has(node.id)
    const closeUpStart = Math.max(1.1, 6.5 - safeCitations * 1.1)
    const closeUpEnd = closeUpStart + 1.0
    const closeUpAlpha = globalScale >= closeUpEnd ? 1
      : globalScale >= closeUpStart ? (globalScale - closeUpStart) / (closeUpEnd - closeUpStart)
      : 0
    const importanceCap = Math.min(1, 0.35 + Math.sqrt(safeCitations) * 0.28)
    const revealAlpha = Math.max(landmarkLabelAlpha(baseRForFade, globalScale), closeUpAlpha)
    const idleAlpha = topForced ? 1 : Math.min(importanceCap, revealAlpha)
    if (idleAlpha <= 0.01) { ctx.restore(); return }
    ctx.globalAlpha = idleAlpha

    ctx.font = `${idleWeight} ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    const nameLines = wrapText(ctx, rawName, maxW)
    const nameW = Math.max(...nameLines.map((l) => ctx.measureText(l).width))

    ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
    const titleLines = wrapText(ctx, rawTitle, maxW)
    const titleW = Math.max(...titleLines.map((l) => ctx.measureText(l).width))

    const padX = fontSize * 0.5
    const padY = fontSize * 0.3
    const borderR = fontSize * 0.4
    const contentW = Math.max(nameW, titleW)
    const boxW = contentW + padX * 2
    const nameBlockH = lineHeight * nameLines.length
    const titleBlockH = titleLineHeight * titleLines.length
    const boxH = nameBlockH + titleBlockH + padY * 2
    const boxX = node.x - boxW / 2
    const boxY = node.y - nodeRadius - boxH - fontSize * 0.4

    ctx.fillStyle = LABEL_BG_IDLE
    roundRect(ctx, boxX, boxY, boxW, boxH, borderR)
    ctx.fill()

    ctx.font = `${idleWeight} ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    ctx.fillStyle = LABEL_TEXT_IDLE
    nameLines.forEach((line, i) => {
      ctx.fillText(line, node.x, boxY + padY + lineHeight * i)
    })

    ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
    ctx.fillStyle = LABEL_TEXT_IDLE_DIM
    const titleStartY = boxY + padY + nameBlockH
    titleLines.forEach((line, i) => {
      ctx.fillText(line, node.x, titleStartY + titleLineHeight * i)
    })
  }

  ctx.restore()
}

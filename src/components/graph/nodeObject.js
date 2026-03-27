import { blendAxesColors } from '../../categories'
import { getGradientCanvas } from './scene'
import { authorName } from '../../authorUtils'

const hoverAnimById = new Map()

export function drawNode(node, ctx, globalScale, opts) {
  const { selectedNode, hoveredNode, connectedNodes, isNodeVisible, hoveredFilter, citationCount = 0 } = opts

  // Force-graph can call nodeCanvasObject before layout stabilizes (x/y can be undefined/NaN).
  // Canvas APIs (e.g. createRadialGradient) require finite numbers.
  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return
  if (!Number.isFinite(globalScale)) globalScale = 1

  const isHoveredNode = hoveredNode?.id != null && hoveredNode.id === node.id
  const hoverTarget = isHoveredNode ? 1 : 0
  const prevHover = hoverAnimById.get(node.id) ?? 0
  const hover = prevHover + (hoverTarget - prevHover) * 0.22
  hoverAnimById.set(node.id, hover)
  const isSelectedContext = !selectedNode || connectedNodes.has(node.id)
  const isFiltered = isNodeVisible(node)
  const isActive = isSelectedContext && isFiltered

  const nodeAxes = node.axes || []
  const matchesHover = hoveredFilter && nodeAxes.includes(hoveredFilter)
  const dimmedByHover = hoveredFilter && !matchesHover

  const opacity = hover > 0.01 ? 1 : dimmedByHover ? 0.06 : isActive ? 1 : 0.22
  const glowIntensity = hover > 0.01 ? 0.42 : matchesHover ? 0.35 : 0.15
  const baseRadius = 6
  const safeCitationCount = Number.isFinite(citationCount) ? citationCount : 0
  const citationBoost = Math.min(Math.sqrt(Math.max(0, safeCitationCount)) * 5.2, 34)
  const minHoveredRadius = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  const nodeRadius = Math.max(baseRadius + citationBoost + hover * 12, minHoveredRadius)
  const glowRadius = nodeRadius + (matchesHover ? 4.5 : 2.5)
  if (!Number.isFinite(nodeRadius) || !Number.isFinite(glowRadius) || nodeRadius <= 0 || glowRadius <= 0) return

  const blendedColor = blendAxesColors(nodeAxes)

  ctx.save()

  // Glow
  if (isActive || matchesHover) {
    const grad = ctx.createRadialGradient(node.x, node.y, nodeRadius, node.x, node.y, glowRadius)
    grad.addColorStop(0, withAlpha(blendedColor, glowIntensity))
    grad.addColorStop(1, withAlpha(blendedColor, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
    ctx.fill()

    // Extra bloom on hover
    if (matchesHover) {
      const bloomR = nodeRadius + 7
      const bloomGrad = ctx.createRadialGradient(node.x, node.y, nodeRadius, node.x, node.y, bloomR)
      bloomGrad.addColorStop(0, withAlpha(blendedColor, 0.08))
      bloomGrad.addColorStop(1, withAlpha(blendedColor, 0))
      ctx.fillStyle = bloomGrad
      ctx.beginPath()
      ctx.arc(node.x, node.y, bloomR, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Node circle
  ctx.globalAlpha = opacity
  ctx.beginPath()
  ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)

  if (nodeAxes.length > 1) {
    // Conic gradient via cached offscreen canvas, clipped to circle
    ctx.save()
    ctx.clip()
    const gradCanvas = getGradientCanvas(nodeAxes)
    ctx.drawImage(
      gradCanvas,
      node.x - nodeRadius,
      node.y - nodeRadius,
      nodeRadius * 2,
      nodeRadius * 2
    )
    ctx.restore()
  } else {
    ctx.fillStyle = blendedColor
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Label (only when zoomed in enough or node is relevant)
  const showLabel = hover > 0.01 || globalScale > 0.35 || (selectedNode && connectedNodes.has(node.id))
  if (showLabel) {
    const baseTextHeight = 4.8
    const citationTextBoost = Math.min(Math.sqrt(safeCitationCount) * 1.05, 8.5)
    const minHoveredFontSize = hover > 0.01 ? 18 / Math.max(globalScale, 0.08) : 0
    const fontSize = Math.max((baseTextHeight + citationTextBoost) * (1 + hover * 0.75), minHoveredFontSize)

    const name = (authorName(node) || '').toUpperCase()
    const title = node.title || ''

    ctx.font = `500 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const labelY = node.y - nodeRadius - fontSize * 3.0
    const lineHeight = fontSize * 1.25

    const textColor = hover > 0.01 || isActive || matchesHover ? '#ffffff' : 'rgba(255,255,255,0.18)'

    // Background
    if (hover > 0.01 || isActive || matchesHover) {
      const nameW = ctx.measureText(name).width
      const titleW = ctx.measureText(title).width
      const maxW = Math.max(nameW, titleW)
      const pad = 2
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      roundRect(
        ctx,
        node.x - maxW / 2 - pad,
        labelY - pad,
        maxW + pad * 2,
        lineHeight * 2 + pad * 2,
        3
      )
      ctx.fill()
    }

    ctx.fillStyle = textColor
    ctx.fillText(name, node.x, labelY)
    ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
    ctx.fillText(title, node.x, labelY + lineHeight)
  }

  ctx.restore()
}

export function getNodeRadius(_node, citationCount) {
  const baseRadius = 6
  const safeCitationCount = Number.isFinite(citationCount) ? citationCount : 0
  const citationBoost = Math.min(Math.sqrt(Math.max(0, safeCitationCount)) * 5.2, 34)
  return baseRadius + citationBoost
}

function withAlpha(hex, alpha) {
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

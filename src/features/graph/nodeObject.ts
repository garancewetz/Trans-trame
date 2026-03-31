import { blendAxesColors } from '@/common/utils/categories'
import { getGradientCanvas } from './scene'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'

const hoverAnimById = new Map()

// ── Nœud auteur ───────────────────────────────────────────────────────────────

function drawAuthorNode(node, ctx, globalScale, opts) {
  const {
    selectedAuthorId, hoveredNode, connectedNodes,
    hoveredFilter, selectedNode, peekNodeId,
  } = opts

  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return

  const isHovered = hoveredNode?.id === node.id
  const hoverTarget = isHovered ? 1 : 0
  const prevHover = hoverAnimById.get(node.id) ?? 0
  const hover = prevHover + (hoverTarget - prevHover) * 0.22
  hoverAnimById.set(node.id, hover)

  const matchesSelectedAuthor = selectedAuthorId && node.id === selectedAuthorId
  const hasAnySelection = selectedNode || selectedAuthorId || peekNodeId
  const isConnected = connectedNodes.has(node.id)
  const isActive = !hasAnySelection || isConnected || matchesSelectedAuthor
  const nodeAxes = node.axes || []
  const matchesHover = hoveredFilter && nodeAxes.includes(hoveredFilter)
  const dimmedByHover = hoveredFilter && !matchesHover

  const opacity = hover > 0.01 ? 1 : dimmedByHover ? 0.06 : (matchesSelectedAuthor || isActive) ? 0.85 : 0.25

  // Couleur : axes de l'auteur, ou blanc/gris par défaut
  const blendedColor = nodeAxes.length ? blendAxesColors(nodeAxes) : '#b0b8d0'

  const BASE_R = 9
  const auraR = BASE_R + 5 + hover * 7
  const ringR = BASE_R + 2

  ctx.save()

  // Aura externe
  if (isActive || matchesHover || matchesSelectedAuthor) {
    const glowAlpha = hover > 0.01 ? 0.3 : matchesSelectedAuthor ? 0.28 : 0.12
    const auraGrad = ctx.createRadialGradient(node.x, node.y, BASE_R, node.x, node.y, auraR)
    auraGrad.addColorStop(0, withAlpha(blendedColor, glowAlpha))
    auraGrad.addColorStop(1, withAlpha(blendedColor, 0))
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(node.x, node.y, auraR, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = opacity

  // Cœur semi-transparent
  ctx.beginPath()
  ctx.arc(node.x, node.y, BASE_R, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(blendedColor, 0.18 + hover * 0.2)
  ctx.fill()

  // Anneau extérieur (signature visuelle de l'auteur)
  ctx.beginPath()
  ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2)
  ctx.strokeStyle = blendedColor
  ctx.lineWidth = (hover > 0.01 ? 2.2 : 1.6) / Math.max(globalScale, 0.1)
  ctx.stroke()

  // Deuxième anneau fin pour le "double rayonnement"
  if (hover > 0.05 || matchesSelectedAuthor) {
    const outerR = BASE_R + 6 + hover * 4
    ctx.beginPath()
    ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = withAlpha(blendedColor, (hover > 0.05 ? 0.45 : 0.22))
    ctx.lineWidth = 0.8 / Math.max(globalScale, 0.1)
    ctx.stroke()
  }

  ctx.globalAlpha = 1

  // Label : juste le nom de l'auteur (pas de titre de livre)
  drawAuthorLabel(node, ctx, globalScale, { ...opts, hover, nodeRadius: ringR })

  ctx.restore()
}

function drawAuthorLabel(node, ctx, globalScale, opts) {
  const { hover = 0, nodeRadius = 11, selectedAuthorId, selectedNode, connectedNodes, peekNodeId } = opts
  const name = (authorName(node) || '').toUpperCase()

  const matchesSelectedAuthor = selectedAuthorId && node.id === selectedAuthorId
  const showLabel = hover > 0.01 || globalScale > 0.35 || matchesSelectedAuthor || peekNodeId === node.id ||
    (selectedNode && connectedNodes?.has(node.id))
  if (!showLabel) return

  const baseTextHeight = 5.5
  const minHoveredFontSize = hover > 0.01 ? 20 / Math.max(globalScale, 0.08) : 0
  const fontSize = Math.max(baseTextHeight * (1 + hover * 0.8), minHoveredFontSize)

  ctx.save()
  ctx.font = `700 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const labelY = node.y - nodeRadius - fontSize * 2.5

  if (hover > 0.01 || matchesSelectedAuthor) {
    const nameW = ctx.measureText(name).width
    const pad = 3
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    roundRect(ctx, node.x - nameW / 2 - pad, labelY - pad, nameW + pad * 2, fontSize + pad * 2, 3)
    ctx.fill()
  }

  const textColor = (hover > 0.01 || matchesSelectedAuthor) ? '#ffffff' : 'rgba(255,255,255,0.28)'
  ctx.fillStyle = textColor
  ctx.fillText(name, node.x, labelY)
  ctx.restore()
}

// ── Nœud livre (comportement existant) ────────────────────────────────────────

export function drawNode(node, ctx, globalScale, opts) {
  // Déléguer aux auteurs
  if (node.type === 'author') {
    drawAuthorNode(node, ctx, globalScale, opts)
    return
  }

  const {
    selectedNode, selectedAuthorId, peekNodeId, hoveredNode,
    connectedNodes, isNodeVisible, hoveredFilter, citationCount = 0,
    skipLabel = false, labelOnly = false,
  } = opts

  if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) return
  if (!Number.isFinite(globalScale)) globalScale = 1

  if (labelOnly) {
    const hover = hoverAnimById.get(node.id) ?? 1
    const safeCitationCount = Number.isFinite(citationCount) ? citationCount : 0
    const citationBoost = Math.min(Math.sqrt(Math.max(0, safeCitationCount)) * 5.2, 34)
    const minHoveredRadius = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
    const nodeRadius = Math.max(6 + citationBoost + hover * 12, minHoveredRadius)
    drawLabel(node, ctx, globalScale, { ...opts, hover, nodeRadius, safeCitationCount })
    return
  }

  const isHoveredNode = hoveredNode?.id != null && hoveredNode.id === node.id
  const hoverTarget = isHoveredNode ? 1 : 0
  const prevHover = hoverAnimById.get(node.id) ?? 0
  const hover = prevHover + (hoverTarget - prevHover) * 0.22
  hoverAnimById.set(node.id, hover)
  const hasAnySelection = selectedNode || selectedAuthorId || peekNodeId
  const isSelectedContext = !hasAnySelection || connectedNodes.has(node.id)
  const isFiltered = isNodeVisible(node)
  const isActive = isSelectedContext && isFiltered

  const nodeAxes = node.axes || []
  const matchesHover = hoveredFilter && nodeAxes.includes(hoveredFilter)
  const dimmedByHover = hoveredFilter && !matchesHover
  const matchesSelectedAuthor = selectedAuthorId && node.authorIds?.includes(selectedAuthorId)
  const matchesPeek = peekNodeId && node.id === peekNodeId

  const opacity = hover > 0.01 ? 1 : dimmedByHover ? 0.06 : matchesSelectedAuthor || matchesPeek ? 1 : isActive ? 1 : 0.22
  const glowIntensity = hover > 0.01 ? 0.42 : matchesSelectedAuthor || matchesPeek ? 0.4 : matchesHover ? 0.35 : 0.15
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
  if (isActive || matchesHover || matchesSelectedAuthor || matchesPeek) {
    const grad = ctx.createRadialGradient(node.x, node.y, nodeRadius, node.x, node.y, glowRadius)
    grad.addColorStop(0, withAlpha(blendedColor, glowIntensity))
    grad.addColorStop(1, withAlpha(blendedColor, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
    ctx.fill()

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
    ctx.save()
    ctx.clip()
    const gradCanvas = getGradientCanvas(nodeAxes)
    ctx.drawImage(gradCanvas, node.x - nodeRadius, node.y - nodeRadius, nodeRadius * 2, nodeRadius * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = blendedColor
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (!skipLabel) drawLabel(node, ctx, globalScale, { ...opts, hover, nodeRadius, safeCitationCount, isActive, matchesHover, matchesSelectedAuthor, matchesPeek, selectedNode, connectedNodes })

  ctx.restore()
}

function drawLabel(node, ctx, globalScale, opts) {
  const { hover = 0, nodeRadius = 6, safeCitationCount = 0, isActive, matchesHover, matchesSelectedAuthor, matchesPeek, selectedNode, connectedNodes } = opts

  const showLabel =
    hover > 0.01 || globalScale > 0.35 || (selectedNode && connectedNodes?.has(node.id)) || Boolean(matchesPeek)
  if (!showLabel) return

  const baseTextHeight = 4.8
  const citationTextBoost = Math.min(Math.sqrt(safeCitationCount) * 1.05, 8.5)
  const minHoveredFontSize = hover > 0.01 ? 18 / Math.max(globalScale, 0.08) : 0
  const fontSize = Math.max((baseTextHeight + citationTextBoost) * (1 + hover * 0.75), minHoveredFontSize)

  const name = (bookAuthorDisplay(node, opts.authors || []) || '').toUpperCase()
  const title = node.title || ''

  ctx.save()
  ctx.font = `500 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const labelY = node.y - nodeRadius - fontSize * 3.0
  const lineHeight = fontSize * 1.25

  const textColor =
    hover > 0.01 || isActive || matchesHover || matchesSelectedAuthor || matchesPeek ? '#ffffff' : 'rgba(255,255,255,0.18)'

  if (hover > 0.01 || isActive || matchesHover || matchesSelectedAuthor || matchesPeek) {
    const nameW = ctx.measureText(name).width
    const titleW = ctx.measureText(title).width
    const maxW = Math.max(nameW, titleW)
    const pad = 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    roundRect(ctx, node.x - maxW / 2 - pad, labelY - pad, maxW + pad * 2, lineHeight * 2 + pad * 2, 3)
    ctx.fill()
  }

  ctx.fillStyle = textColor
  ctx.fillText(name, node.x, labelY)
  ctx.font = `400 ${fontSize * 0.9}px 'Space Grotesk', system-ui, sans-serif`
  ctx.fillText(title, node.x, labelY + lineHeight)
  ctx.restore()
}

export function getNodeRadius(node, citationCount) {
  if (node.type === 'author') return 11
  const baseRadius = 6
  const safeCitationCount = Number.isFinite(citationCount) ? citationCount : 0
  const citationBoost = Math.min(Math.sqrt(Math.max(0, safeCitationCount)) * 5.2, 34)
  return baseRadius + citationBoost
}

// ── Helpers ────────────────────────────────────────────────────────────────────


function withAlpha(hex, alpha) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    // Couleur déjà en format rgba/rgb : juste retourner avec alpha modifié
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

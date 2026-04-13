// @ts-nocheck — domain types have optional x/y (d3 adds them at runtime); avoiding widespread casts.
import { blendAxesColors, AXES_COLORS } from '@/common/utils/categories'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { Book, Author } from '@/types/domain'

// ── Types ─────────────────────────────────────────────────────────────────────

type D3Node = (Book | Author) & { x?: number; y?: number; fx?: number; fy?: number }

interface DrawNodeOpts {
  selectedNode?: Book | null
  selectedAuthorId?: string | null
  peekNodeId?: string | null
  hoveredNode?: D3Node | null
  hoveredNeighborIds?: Set<string>
  connectedNodes?: Set<string>
  hoveredFilter?: string | null
  isNodeVisible?: (node: D3Node) => boolean
  citationCount?: number
  /**
   * Livre totalement isolé (aucune citation entrante ni sortante, degré = 0
   * dans le graphe des citations). Sert à atténuer fortement son opacité
   * par défaut pour ne pas saturer la vue d'ensemble — les hubs et les
   * chaînes de filiation peuvent alors respirer.
   */
  isIsolated?: boolean
  skipLabel?: boolean
  labelOnly?: boolean
  authors?: Author[]
}

// ── Caches ────────────────────────────────────────────────────────────────────

const hoverAnimById = new Map<string, number>()
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

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`)
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, innerR: number, outerR: number, color: string, alpha: number): void {
  const grad = ctx.createRadialGradient(x, y, innerR, x, y, outerR)
  grad.addColorStop(0, withAlpha(color, alpha))
  grad.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, outerR, 0, Math.PI * 2)
  ctx.fill()
}

// ── Label card design tokens ─────────────────────────────────────────────────

const LABEL_BG = '#080416'
const LABEL_BORDER = 'rgba(255, 255, 255, 0.1)'
const LABEL_TEXT = '#ece9ff'
const LABEL_TEXT_DIM = 'rgba(255, 255, 255, 0.55)'
// Idle landmark card : fond semi-transparent, pas de bordure, pour rester lisible
// sur fond varié (liens, autres nœuds) sans créer de rectangles marqués.
const LABEL_BG_IDLE = 'rgba(8, 4, 22, 0.55)'
const LABEL_TEXT_IDLE = 'rgba(236, 233, 255, 0.82)'
const LABEL_TEXT_IDLE_DIM = 'rgba(255, 255, 255, 0.5)'
const LABEL_MAX_W_FACTOR = 14
const LANDMARK_RADIUS = 20

/**
 * Découpe `text` en plusieurs lignes respectant `maxWidth`. Coupe sur les espaces ;
 * si un mot seul dépasse, il est coupé par caractère. Contexte : le ctx doit avoir
 * la police déjà configurée avant l'appel (measureText en dépend).
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return ['']
  if (ctx.measureText(text).width <= maxWidth) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  const pushCurrent = () => { if (current) { lines.push(current); current = '' } }

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    pushCurrent()
    // Word alone may overflow — break it by characters
    if (ctx.measureText(word).width <= maxWidth) {
      current = word
    } else {
      let chunk = ''
      for (const ch of word) {
        const next = chunk + ch
        if (ctx.measureText(next).width <= maxWidth) {
          chunk = next
        } else {
          if (chunk) lines.push(chunk)
          chunk = ch
        }
      }
      current = chunk
    }
  }
  pushCurrent()
  return lines.length ? lines : [text]
}

// ── Shared node state ─────────────────────────────────────────────────────────

function computeNodeState(node: D3Node, opts: DrawNodeOpts) {
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
    ? (!hasAnySelection || isConnected || isHighlighted) && (isNodeVisible?.(node) ?? true)
    : (!hasAnySelection || isConnected) && (isNodeVisible?.(node) ?? true)

  // Feuille isolée (book sans lien de citation) : fortement atténuée par défaut
  // pour décongestionner la vue — elle reste visible mais s'efface derrière
  // les hubs et les chaînes de filiation. Redevient pleine opacité dès qu'elle
  // est activée, mise en surbrillance, ou ciblée par un filtre/hover.
  const isIsolatedLeaf = node.type !== 'author' && !!opts.isIsolated
  let opacity: number
  if (hasHoverFocus && !isHovered && !isHoverNeighbor) opacity = 0.05
  else if (hover > 0.01) opacity = 1
  else if (dimmedByHover) opacity = 0.01
  else if (node.type === 'author') opacity = (isHighlighted || isActive) ? 0.85 : 0.25
  else if (isHighlighted) opacity = 1
  else if (!isActive) opacity = 0.22
  else if (isIsolatedLeaf && !matchesHover) opacity = 0.18
  else opacity = 1

  const blendedColor = node.type === 'author'
    ? (nodeAxes.length ? blendAxesColors(nodeAxes) : '#b0b8d0')
    : blendAxesColors(nodeAxes)

  return { hover, opacity, isActive, isHighlighted, matchesHover, blendedColor, hasHoverFocus, isHoverNeighbor }
}

// Progressive landmark disclosure : plus on est loin, plus on est sélectif.
// Paliers de rayon des livres : 0-1cit=6, 2cit=13, 3cit=27, 4cit=55, 5+cit=58.
// - overview (<0.75) : uniquement les super-landmarks (5+ citations)
// - zoom moyen (<1.1) : ajoute les 4+ citations
// - zoom proche : tous les livres ≥ 3 citations (rayon ≥ 20)
function minLandmarkRadiusForZoom(globalScale: number): number {
  if (globalScale < 0.75) return 58
  if (globalScale < 1.1) return 55
  return LANDMARK_RADIUS
}

function shouldShowLabel(node: D3Node, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts) {
  const { hover, isHighlighted, hasHoverFocus, isHoverNeighbor } = state
  const { selectedNode, citationCount = 0 } = opts
  if (hasHoverFocus && hover <= 0.01 && !isHoverNeighbor) return false
  if (hover > 0.01) return true
  // Landmark: authors (anchors) always shown; books tiered by zoom
  if (node.type === 'author') return true
  if (getNodeRadius(node, citationCount) >= minLandmarkRadiusForZoom(globalScale)) return true
  // Hover neighbors: only show label when zoomed in close
  if (hasHoverFocus && isHoverNeighbor) return globalScale > 1.5
  // Sur sélection, on n'affiche que le label du nœud cliqué lui-même —
  // afficher les labels de tous les voisins rend illisible un hub qui cite
  // beaucoup (cf. Haraway). Les voisins restent signalés par l'opacité et
  // les liens colorés, c'est suffisant pour tracer les connexions.
  if (selectedNode && node.id === selectedNode.id) return true
  return globalScale > 1.5 || isHighlighted
}

// ── Node radius ───────────────────────────────────────────────────────────────

export function getNodeRadius(node: { type?: string }, citationCount: number): number {
  if (node.type === 'author') return 11
  const n = Math.max(0, Number.isFinite(citationCount) ? citationCount : 0)
  // Les livres cités 0 ou 1 fois ont la même taille (ce ne sont pas encore des
  // landmarks). La croissance exponentielle démarre à 2 citations.
  // Paliers : 0-1→6  2→13  3→27  4→55  5+→capped à 58
  if (n <= 1) return 6
  const boost = Math.min((Math.pow(2, n - 1) - 1) * 7, 52)
  return 6 + boost
}

function hoveredRadius(baseR: number, hover: number, globalScale: number): number {
  // At high zoom the node is already visually large — fade out the hover expansion
  const FADE_START = 1.5
  const FADE_END = 3
  const hoverScale = globalScale < FADE_START ? 1
    : globalScale > FADE_END ? 0
    : 1 - (globalScale - FADE_START) / (FADE_END - FADE_START)
  const minR = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  return Math.max(baseR + hover * 12 * hoverScale, minR)
}

const POINTER_PAD = 3

/**
 * Rayon pour `nodePointerAreaPaint` : au moins celui du nœud **entièrement** survolé,
 * pour ne pas perdre le hover quand le disque grossit (le pointeur reste dans la zone peinte).
 */
export function getNodePointerHitRadius(
  node: { type?: string },
  citationCount: number,
  globalScale: number,
): number {
  const scale = Number.isFinite(globalScale) && globalScale > 0 ? globalScale : 1
  if (node.type === 'author') {
    const BASE_R = 9
    const maxOuterRing = BASE_R + 6 + 4 // aligné sur l'anneau hover max dans drawAuthorNode
    return maxOuterRing + POINTER_PAD
  }
  const baseR = getNodeRadius(node, citationCount)
  return hoveredRadius(baseR, 1, scale) + POINTER_PAD
}

// ── Author node ───────────────────────────────────────────────────────────────

function drawAuthorNode(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, opts: DrawNodeOpts): void {
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

function drawAuthorLabel(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts, nodeRadius: number): void {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isHighlighted } = state
  const rawName = (authorName(node) || '').toUpperCase()
  const minHovered = hover > 0.01 ? 13 / Math.max(globalScale, 0.08) : 0
  // Landmark idle : garantit une taille écran minimale pour garder le label
  // lisible en vue d'ensemble (les auteurs sont les ancres du graphe).
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

function drawBookLabel(node: D3Node, ctx: CanvasRenderingContext2D, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts, nodeRadius: number): void {
  if (!shouldShowLabel(node, globalScale, state, opts)) return

  const { hover, isHighlighted, matchesHover } = state
  const safeCitations = Number.isFinite(opts.citationCount) ? opts.citationCount : 0
  const baseSize = 4.8 + Math.min(Math.sqrt(safeCitations) * 1.05, 8.5)
  const minHovered = hover > 0.01 ? 11 / Math.max(globalScale, 0.08) : 0
  // Landmark idle : plancher écran proportionnel aux citations. Plus le livre
  // est cité, plus son label reste présent en vue d'ensemble (zoom faible).
  // Capé pour éviter la domination visuelle des super-landmarks.
  const landmarkScreenPx = hover <= 0.01 && !isHighlighted && !matchesHover
    ? Math.min(9 + safeCitations * 1.6, 17)
    : 0
  const idleFloor = landmarkScreenPx / Math.max(globalScale, 0.2)
  const fontSize = Math.max(baseSize * (1 + hover * 0.3), minHovered, idleFloor)

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
    ctx.font = `500 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
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

    ctx.font = `500 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
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

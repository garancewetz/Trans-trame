// @ts-nocheck — domain types have optional x/y (d3 adds them at runtime)
import { blendAxesColors } from '@/common/utils/categories'
import type { Book, Author } from '@/types/domain'
import { computeHover } from '../cache/nodeCache'
import { getNodeRadius } from './nodeRadius'

// ── Types ─────────────────────────────────────────────────────────────────────

export type D3Node = (Book | Author) & { x?: number; y?: number; fx?: number; fy?: number }

export interface DrawNodeOpts {
  selectedNode?: Book | null
  selectedAuthorId?: string | null
  peekNodeId?: string | null
  hoveredNode?: D3Node | null
  hoveredNeighborIds?: Set<string>
  connectedNodes?: Set<string>
  hoveredFilter?: string | null
  isNodeVisible?: (node: D3Node) => boolean
  citationCount?: number
  /** Fully isolated book (no citation links, degree=0). Strongly dimmed by default. */
  isIsolated?: boolean
  /** Top-N book IDs by degree — always labeled regardless of zoom. */
  topDegreeNodeIds?: Set<string>
  skipLabel?: boolean
  labelOnly?: boolean
  authors?: Author[]
}

// ── Node state computation ───────────────────────────────────────────────────

export function computeNodeState(node: D3Node, opts: DrawNodeOpts) {
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

// ── Landmark label thresholds ────────────────────────────────────────────────

export const LANDMARK_RADIUS = 20

/** Min node radius to show label at given zoom — continuous interpolation */
export function minLandmarkRadiusForZoom(globalScale: number): number {
  if (globalScale >= 1.1) return LANDMARK_RADIUS
  if (globalScale >= 0.9) {
    const t = (globalScale - 0.9) / (1.1 - 0.9)
    return 40 + (LANDMARK_RADIUS - 40) * t
  }
  if (globalScale >= 0.75) {
    const t = (globalScale - 0.75) / (0.9 - 0.75)
    return 55 + (40 - 55) * t
  }
  if (globalScale >= 0.55) {
    const t = (globalScale - 0.55) / (0.75 - 0.55)
    return 90 + (55 - 90) * t
  }
  return 90
}

/** Progressive opacity ramp as node approaches label visibility threshold */
export function landmarkLabelAlpha(radius: number, globalScale: number): number {
  const threshold = minLandmarkRadiusForZoom(globalScale)
  const fadeBand = 14
  if (radius >= threshold) return 1
  if (radius <= threshold - fadeBand) return 0
  return (radius - (threshold - fadeBand)) / fadeBand
}

/** Whether to show label for this node at the current zoom level */
export function shouldShowLabel(node: D3Node, globalScale: number, state: ReturnType<typeof computeNodeState>, opts: DrawNodeOpts) {
  const { hover, isHighlighted, hasHoverFocus, isHoverNeighbor } = state
  const { selectedNode, citationCount = 0, topDegreeNodeIds } = opts
  if (hasHoverFocus && hover <= 0.01 && !isHoverNeighbor) return false
  if (hover > 0.01) return true
  if (node.type === 'author') return true
  if (topDegreeNodeIds?.has(node.id)) return true
  if (landmarkLabelAlpha(getNodeRadius(node, citationCount), globalScale) > 0.01) return true
  if (hasHoverFocus && isHoverNeighbor) return globalScale > 1.5
  if (selectedNode && node.id === selectedNode.id) return true
  if (globalScale > 1.1) return true
  return isHighlighted
}

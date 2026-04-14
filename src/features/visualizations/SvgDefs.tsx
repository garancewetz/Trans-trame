/**
 * Shared SVG <defs> for visualization views.
 * Colors, opacities, widths and arrows aligned with the Galaxy (Constellation)
 * link rendering in useGraphLinkCallbacks.ts + linkRelationColors.ts.
 */

import { memo } from 'react'
import { AXES_COLORS } from '@/common/utils/categories'

// ── Link colors — identical to Galaxy ────────────────────────────────────────

/** Cite (source → target) = cyan */
const CITE = { r: 140, g: 220, b: 255 }
/** Cited-by (target → source) = orange */
const CITED_BY = { r: 255, g: 171, b: 64 }

function rgba(c: typeof CITE, a: number) {
  return `rgba(${c.r},${c.g},${c.b},${a})`
}

// ── Public helpers ───────────────────────────────────────────────────────────

type LinkStyle = {
  stroke: string
  strokeOpacity: number
  strokeWidth: number
  markerEnd: string | undefined
}

/**
 * Compute link visual style — mirrors Galaxy logic.
 * Supports both selection and hover focus states.
 */
function getLinkStyle(
  sourceId: string,
  targetId: string,
  selectedId: string | null,
  hoveredId?: string | null,
): LinkStyle {
  const isHoverLink = hoveredId && (sourceId === hoveredId || targetId === hoveredId)
  const hasHoverFocus = !!hoveredId && !selectedId

  // Hover focus (no selection): highlight hovered links, dim rest
  if (hasHoverFocus) {
    if (isHoverLink) {
      const isCite = sourceId === hoveredId
      return {
        stroke: rgba(isCite ? CITE : CITED_BY, 1),
        strokeOpacity: 0.85,
        strokeWidth: 1.2,
        markerEnd: `url(#arrow-${isCite ? 'cite' : 'cited-by'})`,
      }
    }
    return { stroke: rgba(CITE, 1), strokeOpacity: 0.08, strokeWidth: 0.3, markerEnd: undefined }
  }

  const isActive = selectedId === sourceId || selectedId === targetId
  const isCite = sourceId === selectedId

  if (!selectedId) {
    return { stroke: rgba(CITE, 1), strokeOpacity: 0.15, strokeWidth: 0.5, markerEnd: 'url(#arrow-cite-faint)' }
  }

  if (isActive) {
    const color = isCite ? CITE : CITED_BY
    const markerId = isCite ? 'arrow-cite' : 'arrow-cited-by'
    return { stroke: rgba(color, 1), strokeOpacity: 0.85, strokeWidth: 2, markerEnd: `url(#${markerId})` }
  }

  return { stroke: rgba(CITE, 1), strokeOpacity: 0.1, strokeWidth: 0.3, markerEnd: undefined }
}

// ── Node visual state (mirrors Galaxy computeNodeState) ─────────────────────

type NodeVisual = {
  opacity: number
  r: number
  glowR: number | null
  glowOpacity: number
}

/**
 * Compute node visual state — mirrors Galaxy hover/selection behaviour.
 * Priority: hover focus > selection focus > default.
 */
export function getNodeVisual(
  nodeId: string,
  baseR: number,
  selectedId: string | null,
  selectedNeighborIds: Set<string> | null,
  hoveredId: string | null,
  hoveredNeighborIds: Set<string> | null,
): NodeVisual {
  const isHovered = hoveredId === nodeId
  const isHoverNeighbor = !!hoveredNeighborIds?.has(nodeId)
  const hasHoverFocus = !!hoveredId && !selectedId

  // Hover focus (no selection): hovered + neighbors bright, rest near-invisible
  if (hasHoverFocus) {
    if (isHovered) return { opacity: 1, r: baseR + 2, glowR: baseR + 6, glowOpacity: 0.3 }
    if (isHoverNeighbor) return { opacity: 1, r: baseR + 1, glowR: baseR + 5, glowOpacity: 0.15 }
    return { opacity: 0.18, r: baseR, glowR: null, glowOpacity: 0 }
  }

  // Selection focus
  if (selectedId) {
    const isSelected = selectedId === nodeId
    const isRelated = !!selectedNeighborIds?.has(nodeId)
    if (isSelected) return { opacity: 1, r: baseR + 2, glowR: baseR + 6, glowOpacity: 0.25 }
    if (isRelated) return { opacity: 1, r: baseR + 1, glowR: baseR + 5, glowOpacity: 0.15 }
    return { opacity: 0.15, r: baseR, glowR: null, glowOpacity: 0 }
  }

  // Default: all visible
  return { opacity: 0.88, r: baseR, glowR: null, glowOpacity: 0 }
}

// ── Node fill (multi-axis gradient support) ──────────────────────────────────

function gradientId(axes: string[]): string {
  return `grad-${axes.join('-')}`
}

export function nodeFill(axes?: string[] | null): string {
  const a = axes ?? []
  if (a.length === 0) return '#888888'
  if (a.length === 1) return AXES_COLORS[a[0] as keyof typeof AXES_COLORS] ?? '#888888'
  return `url(#${gradientId(a)})`
}

// ── <defs> component ─────────────────────────────────────────────────────────

export function SvgDefs({ nodeAxesSet }: { nodeAxesSet: Map<string, string[]> }) {
  // Collect unique multi-axis combos for gradient defs
  const gradients: { id: string; colors: string[] }[] = []
  const seen = new Set<string>()
  for (const [, axes] of nodeAxesSet) {
    if (axes.length < 2) continue
    const key = axes.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    const colors = axes.map((a) => AXES_COLORS[a as keyof typeof AXES_COLORS]).filter(Boolean)
    if (colors.length >= 2) gradients.push({ id: gradientId(axes), colors })
  }

  return (
    <defs>
      {/* Strong cite arrow — cyan, markerUnits=userSpaceOnUse so size is independent of strokeWidth */}
      <marker id="arrow-cite" viewBox="0 0 10 6" refX="10" refY="3"
        markerWidth="7" markerHeight="4" markerUnits="userSpaceOnUse" orient="auto">
        <path d="M 0 0 L 10 3 L 0 6 z" fill={rgba(CITE, 0.85)} />
      </marker>
      {/* Strong cited-by arrow — orange */}
      <marker id="arrow-cited-by" viewBox="0 0 10 6" refX="10" refY="3"
        markerWidth="7" markerHeight="4" markerUnits="userSpaceOnUse" orient="auto">
        <path d="M 0 0 L 10 3 L 0 6 z" fill={rgba(CITED_BY, 0.85)} />
      </marker>
      {/* Faint arrow for no-selection state */}
      <marker id="arrow-cite-faint" viewBox="0 0 10 6" refX="10" refY="3"
        markerWidth="5" markerHeight="3" markerUnits="userSpaceOnUse" orient="auto">
        <path d="M 0 0 L 10 3 L 0 6 z" fill={rgba(CITE, 0.35)} />
      </marker>

      {/* Multi-axis node gradients */}
      {gradients.map(({ id, colors }) => (
        <linearGradient key={id} id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          {colors.map((c, i) => (
            <stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
      ))}
    </defs>
  )
}

// ── Hover gradient helpers ──────────────────────────────────────────────────

/**
 * Build a unique gradient id for a hovered link.
 * Mirrors the Galaxy canvas gradient: cyan at source → orange at target.
 */
function hoverGradientId(linkIndex: number) {
  return `hover-grad-${linkIndex}`
}

// ── Link particles (animated dots along paths) ──────────────────────────────

type ParticleConfig = { count: number; r: number; color: string; dur: string }

function getParticleConfig(
  sourceId: string,
  targetId: string,
  selectedId: string | null,
  hoveredId?: string | null,
): ParticleConfig | null {
  // Pattern Galaxy : les particules n'apparaissent QUE sur les liens focaux
  // (sélection ou survol). En idle pur (pas de sélection, pas de hover), on
  // ne dessine aucune animation — N × animateMotion en continu tue le FPS
  // dès que le nombre de liens dépasse la centaine.
  const hasHoverFocus = !!hoveredId && !selectedId
  if (hasHoverFocus) {
    const isHoverLink = sourceId === hoveredId || targetId === hoveredId
    if (!isHoverLink) return null
    const isCite = sourceId === hoveredId
    return { count: 3, r: 1.2, color: rgba(isCite ? CITE : CITED_BY, 0.9), dur: '4s' }
  }
  if (!selectedId) return null
  const isActive = selectedId === sourceId || selectedId === targetId
  if (!isActive) return null
  const isCite = sourceId === selectedId
  return { count: 4, r: 1.5, color: isCite ? rgba(CITE, 0.85) : rgba(CITED_BY, 0.85), dur: '3s' }
}

type LinkParticleProps = {
  d: string
  config: ParticleConfig
  linkIndex: number
}

/** Animated dots flowing along a link path. */
const LinkParticles = memo(function LinkParticles({ d, config, linkIndex }: LinkParticleProps) {
  const { count, r, color, dur } = config
  const durSeconds = parseFloat(dur)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const beginOffset = `${((i / count) * durSeconds).toFixed(2)}s`
        return (
          <circle key={`${linkIndex}-p${i}`} r={r} fill={color} opacity={0.9}>
            <animateMotion
              dur={dur}
              repeatCount="indefinite"
              path={d}
              begin={beginOffset}
            />
          </circle>
        )
      })}
    </>
  )
})

// ── CitationLink — all-in-one SVG link component ───────────────────────────

type CitationLinkProps = {
  d: string
  sourceId: string
  targetId: string
  selectedId: string | null
  hoveredId: string | null
  linkIndex: number
  /** Source / target positions — needed for the hover gradient direction. */
  sx?: number
  sy?: number
  tx?: number
  ty?: number
}

/** Renders a citation link path with arrow marker and animated directional particles. */
export const CitationLink = memo(function CitationLink({
  d,
  sourceId,
  targetId,
  selectedId,
  hoveredId,
  linkIndex,
  sx,
  sy,
  tx,
  ty,
}: CitationLinkProps) {
  const style = getLinkStyle(sourceId, targetId, selectedId, hoveredId)
  const config = getParticleConfig(sourceId, targetId, selectedId, hoveredId)

  const useGradient =
    !!hoveredId && !selectedId &&
    (sourceId === hoveredId || targetId === hoveredId) &&
    sx != null && sy != null && tx != null && ty != null
  const gradId = hoverGradientId(linkIndex)

  return (
    <>
      {useGradient && (
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={tx} y2={ty}>
            <stop offset="0%" stopColor={rgba(CITE, 0.9)} />
            <stop offset="25%" stopColor={rgba(CITE, 0.7)} />
            <stop offset="60%" stopColor={rgba(CITED_BY, 0.35)} />
            <stop offset="100%" stopColor={rgba(CITED_BY, 0.45)} />
          </linearGradient>
        </defs>
      )}
      <path
        d={d}
        fill="none"
        stroke={useGradient ? `url(#${gradId})` : style.stroke}
        strokeOpacity={style.strokeOpacity}
        strokeWidth={style.strokeWidth}
        markerEnd={style.markerEnd}
      />
      {config && <LinkParticles d={d} config={config} linkIndex={linkIndex} />}
    </>
  )
})

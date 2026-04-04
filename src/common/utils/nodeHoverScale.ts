import type { CSSProperties } from 'react'

/**
 * Shared hover-scale style for SVG node groups.
 * Mirrors the smooth scale effect from the Galaxy (constellation) graph view.
 */

const SCALE = 1.6
const TRANSITION = 'transform 0.18s ease-out'

export function nodeHoverStyle(isHovered: boolean): CSSProperties {
  return {
    cursor: 'pointer',
    transition: TRANSITION,
    transform: isHovered ? `scale(${SCALE})` : 'scale(1)',
    transformBox: 'fill-box' as CSSProperties['transformBox'],
    transformOrigin: 'center',
  }
}

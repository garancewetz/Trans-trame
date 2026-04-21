import { useEffect, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'

type Args = {
  graphRef: RefObject<Graph | null>
  selectedNodeId: string | null | undefined
  peekNodeId: string | null | undefined
  booksLength: number
  idToIndex: Map<string, number>
  applyFocalRef: ApplyFocalVisualStateRef
  drawOverlay: () => void
}

/**
 * Anim caméra vers le focal (priorité sélection > peek). Parité avec
 * Constellation (cameraControls.ts / animateCameraToNode). Zoom cible
 * >= 1.2 pour rapprocher sans jamais dézoomer l'utilisateur·ice.
 */
export function useCosmographFocalCameraEffect({
  graphRef, selectedNodeId, peekNodeId, booksLength, idToIndex,
  applyFocalRef, drawOverlay,
}: Args): void {
  useEffect(() => {
    const g = graphRef.current
    if (!g || booksLength === 0) return
    applyFocalRef.current()
    g.render()
    drawOverlay()

    const focalId = selectedNodeId ?? peekNodeId ?? null
    if (!focalId) return
    const idx = idToIndex.get(focalId)
    if (idx === undefined) return
    const pos = g.getTrackedPointPositionsMap().get(idx)
    if (!pos) return
    const targetZoom = Math.max(g.getZoomLevel(), 1.2)
    g.setZoomTransformByPointPositions(
      new Float32Array([pos[0], pos[1]]),
      800, targetZoom, 0, false,
    )
  }, [graphRef, selectedNodeId, peekNodeId, booksLength, idToIndex, applyFocalRef, drawOverlay])
}

import { useEffect, type MutableRefObject } from 'react'
import { FLASH_DURATION_MS } from './cosmographDrawing'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'

type Args = {
  flashNodeIds: Set<string> | null | undefined
  flashNodeIdsRef: MutableRefObject<Set<string>>
  flashAlphaRef: MutableRefObject<number>
  applyFocalRef: ApplyFocalVisualStateRef
  drawOverlay: () => void
}

/**
 * Flash d'import : anneau vert pulsant pendant FLASH_DURATION_MS sur les IDs
 * fraîchement ajoutés. Le rAF met à jour flashAlphaRef puis redessine
 * l'overlay — aucune mutation du graphe cosmos, donc pas de re-layout.
 */
export function useCosmographFlashEffect({
  flashNodeIds, flashNodeIdsRef, flashAlphaRef, applyFocalRef, drawOverlay,
}: Args): void {
  useEffect(() => {
    flashNodeIdsRef.current = new Set(flashNodeIds ?? [])
    if (!flashNodeIds || flashNodeIds.size === 0) {
      flashAlphaRef.current = 0
      drawOverlay()
      return
    }
    // Ré-inclut les IDs flashés dans le set tracké (lu par
    // syncTrackedPositionsForFocal) — sans ce re-sync, les indices n'auraient
    // pas de position remontée via getTrackedPointPositionsMap et le ring se
    // peindrait au mauvais endroit.
    applyFocalRef.current()

    const start = performance.now()
    let raf: number | null = null
    const tick = () => {
      const progress = Math.min((performance.now() - start) / FLASH_DURATION_MS, 1)
      flashAlphaRef.current = 1 - progress
      drawOverlay()
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        flashNodeIdsRef.current = new Set()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [flashNodeIds, flashNodeIdsRef, flashAlphaRef, applyFocalRef, drawOverlay])
}

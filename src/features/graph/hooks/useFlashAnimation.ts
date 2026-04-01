import { useEffect, useRef, type RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'

function refreshGraph(fg: ForceGraphMethods | null | undefined) {
  if (!fg) return
  const fn = Reflect.get(fg, 'refresh')
  if (typeof fn === 'function') fn.call(fg)
}

type Args = {
  flashNodeIds: Set<string> | null
  fgRef: RefObject<ForceGraphMethods | undefined>
}

export function useFlashAnimation({ flashNodeIds, fgRef }: Args) {
  const flashNodeIdsRef = useRef(new Set<string>())
  const flashAlphaRef = useRef(0)
  const flashRafRef = useRef<number | null>(null)

  useEffect(() => {
    flashNodeIdsRef.current = new Set(flashNodeIds || [])
    if (!flashNodeIds?.size) return

    const startTime = Date.now()
    const DURATION = 3500

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      flashAlphaRef.current = 1 - progress
      refreshGraph(fgRef.current)
      if (progress < 1) {
        flashRafRef.current = requestAnimationFrame(tick)
      } else {
        flashNodeIdsRef.current = new Set()
      }
    }
    if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current)
    flashRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current)
    }
  }, [flashNodeIds, fgRef])

  return { flashNodeIdsRef, flashAlphaRef }
}

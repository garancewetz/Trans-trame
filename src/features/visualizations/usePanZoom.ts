import { useCallback, useEffect, useRef, useState } from 'react'

export function usePanZoom() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [xform, setXform] = useState({ tx: 0, ty: 0, scale: 1 })
  const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab')
  const drag = useRef({ active: false, moved: false, lastX: 0, lastY: 0 })

  // Non-passive wheel listener for zoom-to-cursor
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setXform((prev) => {
        const newScale = Math.max(0.1, Math.min(12, prev.scale * factor))
        const tx = mx - (mx - prev.tx) * (newScale / prev.scale)
        const ty = my - (my - prev.ty) * (newScale / prev.scale)
        return { tx, ty, scale: newScale }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    drag.current = { active: true, moved: false, lastX: e.clientX, lastY: e.clientY }
    setCursor('grabbing')
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.lastX
    const dy = e.clientY - drag.current.lastY
    drag.current.lastX = e.clientX
    drag.current.lastY = e.clientY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.current.moved = true
    setXform((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    drag.current.active = false
    setCursor('grab')
  }, [])

  const reset = useCallback(() => setXform({ tx: 0, ty: 0, scale: 1 }), [])

  /** True if the last mouse-down was a drag (not a pure click). */
  const hasMoved = useCallback(() => drag.current.moved, [])

  return {
    svgRef,
    transformStr: `translate(${xform.tx}, ${xform.ty}) scale(${xform.scale})`,
    hasMoved,
    reset,
    svgHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      style: { cursor } as React.CSSProperties,
    },
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 0.1
const MAX_SCALE = 12
const PAN_ACCEL = 4.5
const MAX_PAN_VEL = 55
const ZOOM_ACCEL = 0.008
const MAX_ZOOM_VEL = 0.07
const DAMP = 0.82

function clampScale(s: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))
}

export function usePanZoom() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [xform, setXform] = useState({ tx: 0, ty: 0, scale: 1 })
  const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab')
  const drag = useRef({ active: false, moved: false, lastX: 0, lastY: 0 })
  const keys = useRef(new Set<string>())
  const vel = useRef({ moveX: 0, moveY: 0, zoom: 0 })

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
        const newScale = clampScale(prev.scale * factor)
        const tx = mx - (mx - prev.tx) * (newScale / prev.scale)
        const ty = my - (my - prev.ty) * (newScale / prev.scale)
        return { tx, ty, scale: newScale }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard pan/zoom with inertia
  useEffect(() => {
    const BLOCKED = new Set([
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'keyz', 'keys', 'equal', 'minus',
    ])

    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const code = (e.code || '').toLowerCase()
      const key = (e.key || '').toLowerCase()
      if (code) keys.current.add(code)
      if (key) keys.current.add(key)
      if (BLOCKED.has(code) || BLOCKED.has(key)) e.preventDefault()
    }

    const onUp = (e: KeyboardEvent) => {
      const code = (e.code || '').toLowerCase()
      const key = (e.key || '').toLowerCase()
      if (code) keys.current.delete(code)
      if (key) keys.current.delete(key)
    }

    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const k = keys.current
      const v = vel.current

      const left = k.has('arrowleft')
      const right = k.has('arrowright')
      const up = k.has('arrowup')
      const down = k.has('arrowdown')
      const targetMoveX = right ? 1 : left ? -1 : 0
      const targetMoveY = down ? 1 : up ? -1 : 0

      v.moveX = v.moveX * DAMP + targetMoveX * PAN_ACCEL
      v.moveY = v.moveY * DAMP + targetMoveY * PAN_ACCEL
      v.moveX = Math.max(-MAX_PAN_VEL, Math.min(MAX_PAN_VEL, v.moveX))
      v.moveY = Math.max(-MAX_PAN_VEL, Math.min(MAX_PAN_VEL, v.moveY))

      const zoomIn = k.has('+') || k.has('=') || k.has('equal') || k.has('z') || k.has('keyz')
      const zoomOut = k.has('-') || k.has('minus') || k.has('s') || k.has('keys')
      const targetZoom = zoomIn ? 1 : zoomOut ? -1 : 0
      v.zoom = v.zoom * DAMP + targetZoom * ZOOM_ACCEL
      v.zoom = Math.max(-MAX_ZOOM_VEL, Math.min(MAX_ZOOM_VEL, v.zoom))

      const hasPan = Math.abs(v.moveX) > 0.1 || Math.abs(v.moveY) > 0.1
      const hasZoom = Math.abs(v.zoom) > 0.001

      if (hasPan || hasZoom) {
        setXform((prev) => {
          let { tx, ty, scale } = prev
          if (hasPan) {
            tx -= v.moveX
            ty -= v.moveY
          }
          if (hasZoom) {
            const el = svgRef.current
            if (el) {
              const rect = el.getBoundingClientRect()
              const cx = rect.width / 2
              const cy = rect.height / 2
              const newScale = clampScale(scale * (1 + v.zoom))
              tx = cx - (cx - tx) * (newScale / scale)
              ty = cy - (cy - ty) * (newScale / scale)
              scale = newScale
            }
          }
          return { tx, ty, scale }
        })
      }
    }
    rafId = requestAnimationFrame(animate)

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
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

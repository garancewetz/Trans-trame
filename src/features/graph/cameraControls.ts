import type { RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'

export const NODE_FOCUS_ZOOM = 1.9

export function syncedZoomToFit(
  fg: ForceGraphMethods | null | undefined,
  camRef: RefObject<{ x: number; y: number; zoom: number }>,
  duration: number,
  padding: number,
) {
  if (!fg?.zoomToFit) return
  fg.zoomToFit(duration, padding)
  setTimeout(() => {
    const z = Reflect.get(fg, 'zoom') as (() => number) | undefined
    const zoom = typeof z === 'function' ? z.call(fg) : undefined
    if (typeof zoom === 'number' && Number.isFinite(zoom)) camRef.current.zoom = zoom
  }, duration + 50)
}

export function animateCameraToNode(
  fg: ForceGraphMethods,
  camRef: RefObject<{ x: number; y: number; zoom: number }>,
  velRef: RefObject<{ moveX: number; moveY: number; zoom: number }>,
  targetX: number,
  targetY: number,
): () => void {
  velRef.current = { moveX: 0, moveY: 0, zoom: 0 }
  const startX = camRef.current.x
  const startY = camRef.current.y
  const startZoom = camRef.current.zoom
  const t0 = performance.now()
  const DURATION = 800
  let rafId: number
  function step(now: number) {
    const t = Math.min((now - t0) / DURATION, 1)
    const ease = t < 1 ? t * (2 - t) : 1
    camRef.current.x = startX + (targetX - startX) * ease
    camRef.current.y = startY + (targetY - startY) * ease
    camRef.current.zoom = startZoom + (NODE_FOCUS_ZOOM - startZoom) * ease
    fg.centerAt(camRef.current.x, camRef.current.y, 0)
    fg.zoom(camRef.current.zoom, 0)
    if (t < 1) rafId = requestAnimationFrame(step)
  }
  rafId = requestAnimationFrame(step)
  return () => cancelAnimationFrame(rafId)
}

export function setupKeyboardHandlers({ keysRef, onSpace }) {
  const BLOCKED = [
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    ' ', 'keyz', 'keys', 'equal', 'minus', 'z', 's', '+', '-', '=',
  ]

  const onDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const codeKey = (e.code || '').toLowerCase()
    const charKey = (e.key || '').toLowerCase()
    if (codeKey) keysRef.current.add(codeKey)
    if (charKey) keysRef.current.add(charKey)
    if (BLOCKED.includes(codeKey) || BLOCKED.includes(charKey)) e.preventDefault()

    if (charKey === ' ') {
      onSpace?.()
    }
  }

  const onUp = (e) => {
    const codeKey = (e.code || '').toLowerCase()
    const charKey = (e.key || '').toLowerCase()
    if (codeKey) keysRef.current.delete(codeKey)
    if (charKey) keysRef.current.delete(charKey)
  }

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
  }
}

export function startPanZoomLoop({ fgRef, keysRef, velRef, animFrameRef, camRef }) {
  const PAN_ACCEL = 4.5
  const MAX_PAN = 55
  const ZOOM_ACCEL = 0.008
  const MAX_ZOOM_VEL = 0.07
  const DAMP = 0.82
  const animate = () => {
    animFrameRef.current = requestAnimationFrame(animate)
    const fg = fgRef.current
    if (!fg) return

    const keys = keysRef.current
    const vel = velRef.current
    const cam = camRef.current

    // Pan (arrow keys)
    const left = keys.has('arrowleft')
    const right = keys.has('arrowright')
    const up = keys.has('arrowup')
    const down = keys.has('arrowdown')

    const targetMoveX = right ? 1 : left ? -1 : 0
    const targetMoveY = down ? 1 : up ? -1 : 0

    vel.moveX = (vel.moveX ?? 0) * DAMP + targetMoveX * PAN_ACCEL
    vel.moveY = (vel.moveY ?? 0) * DAMP + targetMoveY * PAN_ACCEL
    vel.moveX = Math.max(-MAX_PAN, Math.min(MAX_PAN, vel.moveX))
    vel.moveY = Math.max(-MAX_PAN, Math.min(MAX_PAN, vel.moveY))

    if (Math.abs(vel.moveX) > 0.1 || Math.abs(vel.moveY) > 0.1) {
      const scale = cam.zoom || 1
      cam.x += vel.moveX / scale
      cam.y += vel.moveY / scale
      fg.centerAt(cam.x, cam.y, 0)
    }

    // Zoom (+/- / Z/S)
    const zoomIn = keys.has('+') || keys.has('=') || keys.has('equal') || keys.has('z')
    const zoomOut = keys.has('-') || keys.has('minus') || keys.has('s')
    const targetZoom = zoomIn ? 1 : zoomOut ? -1 : 0

    vel.zoom = (vel.zoom ?? 0) * DAMP + targetZoom * ZOOM_ACCEL
    vel.zoom = Math.max(-MAX_ZOOM_VEL, Math.min(MAX_ZOOM_VEL, vel.zoom))

    if (Math.abs(vel.zoom) > 0.001) {
      cam.zoom = Math.max(0.15, Math.min(8, cam.zoom * (1 + vel.zoom)))
      fg.zoom(cam.zoom, 0)
    }
  }

  animFrameRef.current = requestAnimationFrame(animate)
  return () => cancelAnimationFrame(animFrameRef.current)
}

export function setupMouseDragHandlers({ containerRef, velRef, hoveredNodeRef }) {
  let dragging = false
  let lastX = 0
  let lastY = 0

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    // If the cursor is over a node, let force-graph handle the drag — don't pan
    if (hoveredNodeRef?.current) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    const DRAG_TO_VEL = 0.15
    const vel = velRef.current
    vel.moveX = (vel.moveX ?? 0) - dx * DRAG_TO_VEL
    vel.moveY = (vel.moveY ?? 0) - dy * DRAG_TO_VEL
  }

  const stopDragging = () => { dragging = false }

  const el = containerRef.current
  if (!el) return () => {}

  el.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
  window.addEventListener('pointercancel', stopDragging)

  return () => {
    el.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }
}

export function setupWheelZoomHandlers({ containerRef, fgRef, velRef, camRef }) {
  const el = containerRef.current
  if (!el) return () => {}

  const ZOOM_FACTOR = 0.0012

  const onWheel = (e) => {
    e.preventDefault()
    const fg = fgRef.current
    if (!fg) return
    const cam = camRef.current

    const delta = -e.deltaY * ZOOM_FACTOR
    cam.zoom = Math.max(0.15, Math.min(8, cam.zoom * (1 + delta)))
    fg.zoom(cam.zoom, 0)

    // Cancel keyboard zoom inertia
    velRef.current.zoom = 0
  }

  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
}

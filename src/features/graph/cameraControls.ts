import type { RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'

const NODE_FOCUS_ZOOM = 0.5

/** Zoom min / max gérés à la main (enableZoomInteraction désactivé sur le graphe). */
const MIN_ZOOM = 0.02
const MAX_ZOOM = 8

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
}

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

const NAV_KEYS = new Set([
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'keyz', 'keys', 'equal', 'minus', 'z', 's', '+', '-', '=',
])

/** Returns true when any camera-navigation key is currently held. */
export function isNavigationActive(keys: Set<string>): boolean {
  for (const k of keys) {
    if (NAV_KEYS.has(k)) return true
  }
  return false
}

export function setupKeyboardHandlers({ keysRef, onSpace, wake, onNavigate }: {
  keysRef: RefObject<Set<string>>
  onSpace?: () => void
  wake?: () => void
  onNavigate?: () => void
}) {
  const BLOCKED = [
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    ' ', 'keyz', 'keys', 'equal', 'minus', 'z', 's', '+', '-', '=',
  ]

  const onDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
    const codeKey = (e.code || '').toLowerCase()
    const charKey = (e.key || '').toLowerCase()
    if (codeKey) keysRef.current.add(codeKey)
    if (charKey) keysRef.current.add(charKey)
    if (BLOCKED.includes(codeKey) || BLOCKED.includes(charKey)) e.preventDefault()

    if (NAV_KEYS.has(codeKey) || NAV_KEYS.has(charKey)) onNavigate?.()
    if (charKey === ' ') onSpace?.()
    wake?.()
  }

  const onUp = (e: KeyboardEvent) => {
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

export function startPanZoomLoop({ fgRef, keysRef, velRef, animFrameRef, camRef }: {
  fgRef: RefObject<ForceGraphMethods | null>
  keysRef: RefObject<Set<string>>
  velRef: RefObject<{ moveX: number; moveY: number; zoom: number }>
  animFrameRef: RefObject<number>
  camRef: RefObject<{ x: number; y: number; zoom: number }>
}): { cleanup: () => void; wake: () => void } {
  const PAN_ACCEL = 4.5
  const MAX_PAN = 55
  const ZOOM_ACCEL = 0.008
  const MAX_ZOOM_VEL = 0.07
  const DAMP = 0.82
  const PAN_EPSILON = 0.1
  const ZOOM_EPSILON = 0.001
  let running = false

  const animate = () => {
    const fg = fgRef.current
    if (!fg) { running = false; return }

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

    if (Math.abs(vel.moveX) > PAN_EPSILON || Math.abs(vel.moveY) > PAN_EPSILON) {
      const scale = cam.zoom || 1
      cam.x += vel.moveX / scale
      cam.y += vel.moveY / scale
      fg.centerAt(cam.x, cam.y, 0)
    } else {
      vel.moveX = 0
      vel.moveY = 0
    }

    // Zoom (+/- / Z/S)
    const zoomIn = keys.has('+') || keys.has('=') || keys.has('equal') || keys.has('z')
    const zoomOut = keys.has('-') || keys.has('minus') || keys.has('s')
    const targetZoom = zoomIn ? 1 : zoomOut ? -1 : 0

    vel.zoom = (vel.zoom ?? 0) * DAMP + targetZoom * ZOOM_ACCEL
    vel.zoom = Math.max(-MAX_ZOOM_VEL, Math.min(MAX_ZOOM_VEL, vel.zoom))

    if (Math.abs(vel.zoom) > ZOOM_EPSILON) {
      cam.zoom = clampZoom(cam.zoom * (1 + vel.zoom))
      fg.zoom(cam.zoom, 0)
    } else {
      vel.zoom = 0
    }

    // Keep looping only while there is active input or residual velocity
    const hasInput = targetMoveX !== 0 || targetMoveY !== 0 || targetZoom !== 0
    const hasVelocity = vel.moveX !== 0 || vel.moveY !== 0 || vel.zoom !== 0
    if (hasInput || hasVelocity) {
      animFrameRef.current = requestAnimationFrame(animate)
    } else {
      running = false
    }
  }

  const wake = () => {
    if (running) return
    running = true
    animFrameRef.current = requestAnimationFrame(animate)
  }

  const cleanup = () => {
    running = false
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }

  return { cleanup, wake }
}

export function setupMouseDragHandlers({ containerRef, velRef, hoveredNodeRef, wake }: {
  containerRef: RefObject<HTMLElement | null>
  velRef: RefObject<{ moveX: number; moveY: number; zoom: number }>
  hoveredNodeRef: RefObject<unknown>
  wake?: () => void
}) {
  let dragging = false
  let lastX = 0
  let lastY = 0

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    // Touch devices: skip pan-drag so the finger stays free for tap/scroll.
    // Zoom-on-wheel doesn't fire on touch anyway, so the graph becomes a
    // fit-to-screen static view on mobile — node taps still open the side panel.
    if (e.pointerType === 'touch') return
    // If the cursor is over a node, let force-graph handle the drag — don't pan
    if (hoveredNodeRef?.current) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    const DRAG_TO_VEL = 0.15
    const vel = velRef.current
    vel.moveX = (vel.moveX ?? 0) - dx * DRAG_TO_VEL
    vel.moveY = (vel.moveY ?? 0) - dy * DRAG_TO_VEL
    wake?.()
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

export function setupWheelZoomHandlers({ containerRef, fgRef, velRef, camRef }: {
  containerRef: RefObject<HTMLElement | null>
  fgRef: RefObject<ForceGraphMethods | null>
  velRef: RefObject<{ moveX: number; moveY: number; zoom: number }>
  camRef: RefObject<{ x: number; y: number; zoom: number }>
}) {
  const el = containerRef.current
  if (!el) return () => {}

  const ZOOM_FACTOR = 0.0012

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const fg = fgRef.current
    if (!fg) return
    const cam = camRef.current

    const delta = -e.deltaY * ZOOM_FACTOR
    cam.zoom = clampZoom(cam.zoom * (1 + delta))
    fg.zoom(cam.zoom, 0)

    // Cancel keyboard zoom inertia
    velRef.current.zoom = 0
  }

  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
}

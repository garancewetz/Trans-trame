import { useEffect, useRef, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'

type Args = {
  graphRef: RefObject<Graph | null>
  containerRef: RefObject<HTMLDivElement | null>
  // Appelé après chaque frame animée. Le parent le branche sur drawOverlay
  // pour que labels / glow suivent le pan-zoom clavier.
  onFrame: () => void
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 20
const PAN_ACCEL = 4.5
const MAX_PAN = 55
const ZOOM_ACCEL = 0.008
const MAX_ZOOM_VEL = 0.07
const DAMP = 0.82
const PAN_EPSILON = 0.1
const ZOOM_EPSILON = 0.001

const NAV_KEYS = new Set([
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'keyz', 'keys', 'equal', 'minus', 'z', 's', '+', '-', '=',
])

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Pan + zoom clavier — miroir de cameraControls.ts (Galaxy). Attache les
 * listeners `keydown` / `keyup` au window, anime la caméra en rAF, et
 * notifie le parent à chaque frame pour qu'il redessine l'overlay. Les
 * callbacks sont lus via refs internes → l'effet ne se re-déclenche pas si
 * leur identité change à chaque render.
 */
export function useCosmographKeyboardControls({
  graphRef, containerRef, onFrame,
}: Args): void {
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useEffect(() => {
    const keys = new Set<string>()
    const vel = { moveX: 0, moveY: 0, zoom: 0 }
    let camSeeded = false
    const cam = { x: 0, y: 0, zoom: 1 }
    let animFrameId: number | null = null
    let running = false

    const seedCam = () => {
      if (camSeeded) return
      const g = graphRef.current
      const container = containerRef.current
      if (!g || !container) return
      const w = container.clientWidth
      const h = container.clientHeight
      const [cx, cy] = g.screenToSpacePosition([w / 2, h / 2])
      cam.x = cx
      cam.y = cy
      cam.zoom = g.getZoomLevel()
      camSeeded = true
    }

    const applyCam = () => {
      const g = graphRef.current
      if (!g) return
      g.setZoomTransformByPointPositions(new Float32Array([cam.x, cam.y]), 0, cam.zoom, 0, false)
      onFrameRef.current()
    }

    const tick = () => {
      const left = keys.has('arrowleft')
      const right = keys.has('arrowright')
      const up = keys.has('arrowup')
      const down = keys.has('arrowdown')
      const targetMoveX = right ? 1 : left ? -1 : 0
      const targetMoveY = down ? -1 : up ? 1 : 0

      vel.moveX = vel.moveX * DAMP + targetMoveX * PAN_ACCEL
      vel.moveY = vel.moveY * DAMP + targetMoveY * PAN_ACCEL
      vel.moveX = clamp(vel.moveX, -MAX_PAN, MAX_PAN)
      vel.moveY = clamp(vel.moveY, -MAX_PAN, MAX_PAN)

      const zoomIn = keys.has('+') || keys.has('=') || keys.has('equal') || keys.has('z') || keys.has('keyz')
      const zoomOut = keys.has('-') || keys.has('minus') || keys.has('s') || keys.has('keys')
      const targetZoom = zoomIn ? 1 : zoomOut ? -1 : 0

      vel.zoom = vel.zoom * DAMP + targetZoom * ZOOM_ACCEL
      vel.zoom = clamp(vel.zoom, -MAX_ZOOM_VEL, MAX_ZOOM_VEL)

      const panActive = Math.abs(vel.moveX) > PAN_EPSILON || Math.abs(vel.moveY) > PAN_EPSILON
      const zoomActive = Math.abs(vel.zoom) > ZOOM_EPSILON
      if (!panActive) { vel.moveX = 0; vel.moveY = 0 }
      if (!zoomActive) { vel.zoom = 0 }

      if (panActive || zoomActive) {
        seedCam()
        if (panActive) {
          const scale = cam.zoom || 1
          cam.x += vel.moveX / scale
          cam.y += vel.moveY / scale
        }
        if (zoomActive) {
          cam.zoom = clamp(cam.zoom * (1 + vel.zoom), MIN_ZOOM, MAX_ZOOM)
        }
        applyCam()
      }

      const hasInput = targetMoveX !== 0 || targetMoveY !== 0 || targetZoom !== 0
      const hasVel = vel.moveX !== 0 || vel.moveY !== 0 || vel.zoom !== 0
      if (hasInput || hasVel) {
        animFrameId = requestAnimationFrame(tick)
      } else {
        running = false
      }
    }

    const wake = () => {
      if (running) return
      running = true
      animFrameId = requestAnimationFrame(tick)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const codeKey = (e.code || '').toLowerCase()
      const charKey = (e.key || '').toLowerCase()
      // Espace : reset vue d'ensemble. Parité avec Constellation (cameraControls.ts).
      if (codeKey === 'space' || charKey === ' ' || charKey === 'spacebar') {
        e.preventDefault()
        graphRef.current?.fitView(900, 0.1, false)
        return
      }
      if (codeKey) keys.add(codeKey)
      if (charKey) keys.add(charKey)
      if (NAV_KEYS.has(codeKey) || NAV_KEYS.has(charKey)) {
        e.preventDefault()
        wake()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const codeKey = (e.code || '').toLowerCase()
      const charKey = (e.key || '').toLowerCase()
      if (codeKey) keys.delete(codeKey)
      if (charKey) keys.delete(charKey)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    }
  }, [graphRef, containerRef])
}

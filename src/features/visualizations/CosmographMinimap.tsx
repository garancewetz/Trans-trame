import { memo, useEffect, useRef, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'

type Props = {
  // Instance cosmos.gl vivante — on lit getTrackedPointPositionsMap() à 12 fps
  // et on appelle screenToSpacePosition / setZoomTransformByPointPositions.
  graphRef: RefObject<Graph | null>
  containerRef: RefObject<HTMLDivElement | null>
  // Indices à dessiner. Doivent être inclus dans le tracking géré par
  // CosmographView (syncTrackedPositionsForFocal). Typiquement top-N par degré.
  trackedIndices: number[]
  onEnter?: () => void
}

const MINIMAP_W = 170
const MINIMAP_H = 110
const PADDING = 8
const REFRESH_FPS = 12
const BBOX_LERP = 0.12
// Cosmos.gl : Y+ pointe vers le bas (comme le canvas DOM). Dans la mini-map,
// on inverse pour que le "haut" du graphe reste en haut de la mini-map —
// lecture plus naturelle (carte géographique vs. système de coordonnées écran).
const FLIP_Y = -1

type Bbox = { minX: number; minY: number; maxX: number; maxY: number }

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function CosmographMinimapImpl({ graphRef, containerRef, trackedIndices, onEnter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const bboxRef = useRef<Bbox | null>(null)
  const transformRef = useRef<{ scale: number; offsetX: number; offsetY: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDrawRef = useRef(0)
  const trackedIndicesRef = useRef(trackedIndices)
  trackedIndicesRef.current = trackedIndices

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
    ctx.scale(dpr, dpr)

    const bookColor = readCssVar('--color-text-main', '#ece9ff')
    const frameInterval = 1000 / REFRESH_FPS

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw)
      if (now - lastDrawRef.current < frameInterval) return
      lastDrawRef.current = now

      const g = graphRef.current
      if (!g) return
      const indices = trackedIndicesRef.current
      if (indices.length === 0) {
        ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)
        return
      }

      // 1. Lit les positions des indices trackés. Cosmos ne remonte une
      // position que si l'index a été passé à trackPointPositionsByIndices
      // — c'est à CosmographView de garantir cette inclusion.
      const tracked = g.getTrackedPointPositionsMap()
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      const points: Array<[number, number]> = []
      for (const i of indices) {
        const p = tracked.get(i)
        if (!p) continue
        const [x, yRaw] = p
        if (!Number.isFinite(x) || !Number.isFinite(yRaw)) continue
        const y = yRaw * FLIP_Y
        points.push([x, y])
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      if (!Number.isFinite(minX) || points.length === 0) return

      // 2. Lerp vers le bbox cible — évite les respirations dues à la simu.
      const target: Bbox = { minX, minY, maxX, maxY }
      const prev = bboxRef.current
      const bbox: Bbox = prev
        ? {
            minX: prev.minX + (target.minX - prev.minX) * BBOX_LERP,
            minY: prev.minY + (target.minY - prev.minY) * BBOX_LERP,
            maxX: prev.maxX + (target.maxX - prev.maxX) * BBOX_LERP,
            maxY: prev.maxY + (target.maxY - prev.maxY) * BBOX_LERP,
          }
        : target
      bboxRef.current = bbox

      // 3. Transform world → minimap (préserve l'aspect).
      const worldW = Math.max(1, bbox.maxX - bbox.minX)
      const worldH = Math.max(1, bbox.maxY - bbox.minY)
      const availW = MINIMAP_W - PADDING * 2
      const availH = MINIMAP_H - PADDING * 2
      const scale = Math.min(availW / worldW, availH / worldH)
      const offsetX = PADDING + (availW - worldW * scale) / 2 - bbox.minX * scale
      const offsetY = PADDING + (availH - worldH * scale) / 2 - bbox.minY * scale
      transformRef.current = { scale, offsetX, offsetY }

      // 4. Paint.
      ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)
      ctx.fillStyle = bookColor
      ctx.globalAlpha = 0.55
      for (const [x, y] of points) {
        const px = x * scale + offsetX
        const py = y * scale + offsetY
        ctx.beginPath()
        ctx.arc(px, py, 1.0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // 5. Rectangle viewport — coins du canvas en coordonnées monde via
      // screenToSpacePosition. Plus fiable que de dériver la taille visible
      // depuis zoomLevel (cosmos applique un rescale initial invisible).
      const container = containerRef.current
      if (container) {
        const cw = container.clientWidth
        const ch = container.clientHeight
        const [wx0, wy0Raw] = g.screenToSpacePosition([0, 0])
        const [wx1, wy1Raw] = g.screenToSpacePosition([cw, ch])
        // Même flip Y que pour les points — sinon le rectangle se retrouve
        // dessiné en miroir vertical par rapport aux points.
        const wy0 = wy0Raw * FLIP_Y
        const wy1 = wy1Raw * FLIP_Y
        const vx = Math.min(wx0, wx1) * scale + offsetX
        const vy = Math.min(wy0, wy1) * scale + offsetY
        const vw = Math.abs(wx1 - wx0) * scale
        const vh = Math.abs(wy1 - wy0) * scale
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 1
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.beginPath()
        ctx.rect(vx, vy, vw, vh)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [graphRef, containerRef])

  // Drag state : pointerDown = anim fluide 300ms vers la cible ; pointerMove
  // tant que le bouton est pressé = snap 0ms pour que la caméra colle au
  // curseur. Sans ce distinguo, chaque move relance une anim de 300ms et les
  // interpolations se chevauchent → la caméra "chasse" avec ~300ms de retard.
  const draggingRef = useRef(false)
  const pendingFrameRef = useRef<number | null>(null)
  const pendingTargetRef = useRef<[number, number] | null>(null)
  // Buffer stable pour setZoomTransformByPointPositions : on mute en place
  // plutôt que de créer un nouveau Float32Array à chaque pointer move
  // (sinon : 1 alloc par frame pendant un drag → pression GC inutile).
  const targetBufferRef = useRef<Float32Array>(new Float32Array(2))

  const applyCameraFromPointer = (e: React.PointerEvent<HTMLDivElement>, duration: number) => {
    const wrapper = wrapperRef.current
    const g = graphRef.current
    const t = transformRef.current
    if (!wrapper || !g || !t) return
    const rect = wrapper.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldX = (mx - t.offsetX) / t.scale
    // Inverse le flip Y appliqué au rendu — le worldY final doit être dans le
    // repère cosmos (Y+ vers le bas), sinon setZoomTransform recentre à l'envers.
    const worldY = ((my - t.offsetY) / t.scale) * FLIP_Y
    const buf = targetBufferRef.current
    buf[0] = worldX
    buf[1] = worldY
    g.setZoomTransformByPointPositions(buf, duration, g.getZoomLevel(), 0, false)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (mx < 0 || my < 0 || mx > MINIMAP_W || my > MINIMAP_H) return
    draggingRef.current = true
    // Capture le pointeur pour continuer à recevoir les events même si le
    // curseur sort de la mini-carte pendant un drag rapide.
    try { wrapper.setPointerCapture(e.pointerId) } catch { /* navigateurs sans API */ }
    applyCameraFromPointer(e, 300)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    e.stopPropagation()
    // Throttle au rAF : on n'envoie qu'un setZoomTransform par frame, en
    // gardant la cible la plus récente. Duration=0 → snap immédiat, pas de
    // superposition d'interpolations qui créent le "lag" perçu.
    const wrapper = wrapperRef.current
    const t = transformRef.current
    if (!wrapper || !t) return
    const rect = wrapper.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldX = (mx - t.offsetX) / t.scale
    const worldY = ((my - t.offsetY) / t.scale) * FLIP_Y
    pendingTargetRef.current = [worldX, worldY]
    if (pendingFrameRef.current !== null) return
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null
      const g = graphRef.current
      const target = pendingTargetRef.current
      if (!g || !target) return
      const buf = targetBufferRef.current
      buf[0] = target[0]
      buf[1] = target[1]
      g.setZoomTransformByPointPositions(buf, 0, g.getZoomLevel(), 0, false)
    })
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const wrapper = wrapperRef.current
    if (wrapper) {
      try { wrapper.releasePointerCapture(e.pointerId) } catch { /* ok */ }
    }
    if (pendingFrameRef.current !== null) {
      cancelAnimationFrame(pendingFrameRef.current)
      pendingFrameRef.current = null
    }
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={() => onEnter?.()}
      className="absolute bottom-20 right-3 z-20 cursor-pointer rounded-[10px] border border-white/10 bg-bg-base/45 p-1 backdrop-blur-2xl backdrop-saturate-150"
      style={{ width: MINIMAP_W + 8, height: MINIMAP_H + 8 }}
      aria-label="Mini-carte du graphe"
    >
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_W, height: MINIMAP_H, display: 'block' }}
      />
    </div>
  )
}

export const CosmographMinimap = memo(CosmographMinimapImpl)

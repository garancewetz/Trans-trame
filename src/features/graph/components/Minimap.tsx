import { memo, useEffect, useRef, type RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import type { GraphData } from '@/types/domain'

type MinimapProps = {
  graphData: GraphData
  fgRef: RefObject<ForceGraphMethods | undefined>
  camRef: RefObject<{ x: number; y: number; zoom: number }>
  containerRef: RefObject<HTMLDivElement | null>
  onEnter?: () => void
}

const MINIMAP_W = 170
const MINIMAP_H = 110
const PADDING = 8 // padding interne en pixels de mini-map
const REFRESH_FPS = 12 // 12fps suffisent largement pour une mini-map

// Lissage de la bbox : on interpole vers la nouvelle cible pour éviter les
// « respirations » dues aux nœuds qui bougent pendant la simulation.
const BBOX_LERP = 0.12

type Bbox = { minX: number; minY: number; maxX: number; maxY: number }

// d3 mutates nodes to add x/y at runtime ; authors can also be mixed in at
// render time even though GraphData.nodes is declared as Book[].
type SimNode = { x?: number; y?: number; fx?: number; fy?: number; type?: string }

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function MinimapImpl({ graphData, fgRef, camRef, containerRef, onEnter }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const bboxRef = useRef<Bbox | null>(null)
  const transformRef = useRef<{ scale: number; offsetX: number; offsetY: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDrawRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
    ctx.scale(dpr, dpr)

    const authorColor = readCssVar('--color-violet', '#a882ff')
    const bookColor = readCssVar('--color-text-main', '#ece9ff')

    const frameInterval = 1000 / REFRESH_FPS

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw)
      if (now - lastDrawRef.current < frameInterval) return
      lastDrawRef.current = now

      const nodes = graphData.nodes || []
      if (nodes.length === 0) {
        ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)
        return
      }

      // 1. Compute world bbox (skip nodes without positions yet)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const n of nodes as SimNode[]) {
        const x = n.fx ?? n.x
        const y = n.fy ?? n.y
        if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      if (!Number.isFinite(minX)) return

      // 2. Lerp towards target bbox for stability
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

      // 3. World → minimap transform (keep aspect ratio)
      const worldW = Math.max(1, bbox.maxX - bbox.minX)
      const worldH = Math.max(1, bbox.maxY - bbox.minY)
      const availW = MINIMAP_W - PADDING * 2
      const availH = MINIMAP_H - PADDING * 2
      const scale = Math.min(availW / worldW, availH / worldH)
      const offsetX = PADDING + (availW - worldW * scale) / 2 - bbox.minX * scale
      const offsetY = PADDING + (availH - worldH * scale) / 2 - bbox.minY * scale
      transformRef.current = { scale, offsetX, offsetY }

      // 4. Paint
      ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)

      // Nodes as small dots
      ctx.fillStyle = bookColor
      for (const n of nodes as SimNode[]) {
        const x = n.fx ?? n.x
        const y = n.fy ?? n.y
        if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
        const px = x * scale + offsetX
        const py = y * scale + offsetY
        const isAuthor = n.type === 'author'
        ctx.fillStyle = isAuthor ? authorColor : bookColor
        ctx.globalAlpha = isAuthor ? 0.75 : 0.55
        const r = isAuthor ? 1.6 : 1.0
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Viewport rectangle
      const container = containerRef.current
      if (container) {
        const cam = camRef.current
        const cw = container.clientWidth
        const ch = container.clientHeight
        const z = Math.max(0.001, cam.zoom)
        const viewWorldW = cw / z
        const viewWorldH = ch / z
        const vx = (cam.x - viewWorldW / 2) * scale + offsetX
        const vy = (cam.y - viewWorldH / 2) * scale + offsetY
        const vw = viewWorldW * scale
        const vh = viewWorldH * scale
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
  }, [graphData, camRef, containerRef])

  // Click to recenter: convert minimap pixel → world coord, then centerAt.
  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    // Stop propagation: the parent graph container listens for pointerdown to
    // start camera dragging — without this, clicking the minimap would also
    // arm a pan-drag on the underlying graph.
    e.stopPropagation()
    const wrapper = wrapperRef.current
    const fg = fgRef.current
    const t = transformRef.current
    if (!wrapper || !fg || !t) return
    const rect = wrapper.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (mx < 0 || my < 0 || mx > MINIMAP_W || my > MINIMAP_H) return
    const worldX = (mx - t.offsetX) / t.scale
    const worldY = (my - t.offsetY) / t.scale
    camRef.current.x = worldX
    camRef.current.y = worldY
    fg.centerAt(worldX, worldY, 300)
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerEvent}
      onPointerMove={(e) => {
        if (e.buttons === 1) handlePointerEvent(e)
      }}
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

export const Minimap = memo(MinimapImpl)

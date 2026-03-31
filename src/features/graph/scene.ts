import { AXES_COLORS } from '@/common/utils/categories'

type Star = {
  x: number
  y: number
  brightness: number
  size: number
}

let _stars: Star[] | null = null

function getStars(): Star[] {
  if (_stars) return _stars
  const list: Star[] = []
  for (let i = 0; i < 2000; i++) {
    list.push({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      brightness: 0.3 + Math.random() * 0.5,
      size: 0.4 + Math.random() * 1.2,
    })
  }
  _stars = list
  return list
}

export function drawStarField(ctx: CanvasRenderingContext2D, globalScale: number) {
  const stars = getStars()
  const r = 1 / globalScale
  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${star.brightness})`
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size * r, 0, Math.PI * 2)
    ctx.fill()
  }
}

const gradientCanvasCache = new Map<string, HTMLCanvasElement>()
const GRAD_SIZE = 64

export function getGradientCanvas(axes: string[] | undefined | null): HTMLCanvasElement {
  const key = (axes || []).join('|') || '_empty'
  const cached = gradientCanvasCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = GRAD_SIZE
  canvas.height = GRAD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    gradientCanvasCache.set(key, canvas)
    return canvas
  }

  let colors = (axes || [])
    .map((a) => AXES_COLORS[a])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
  if (colors.length === 0) colors = ['#ffffff']

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  } else {
    const gradient = ctx.createConicGradient(0, GRAD_SIZE / 2, GRAD_SIZE / 2)
    colors.forEach((c, i) => gradient.addColorStop(i / colors.length, c))
    gradient.addColorStop(1, colors[0])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GRAD_SIZE, GRAD_SIZE)
  }

  gradientCanvasCache.set(key, canvas)
  return canvas
}

import { AXES_COLORS } from '../../categories'

// Pre-generate star positions once
let _stars = null
function getStars() {
  if (_stars) return _stars
  _stars = []
  for (let i = 0; i < 2000; i++) {
    _stars.push({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      brightness: 0.3 + Math.random() * 0.5,
      size: 0.4 + Math.random() * 1.2,
    })
  }
  return _stars
}

export function drawStarField(ctx, globalScale) {
  const stars = getStars()
  const r = 1 / globalScale
  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${star.brightness})`
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size * r, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Cache offscreen canvases for conic gradient node fills (keyed by axes combo)
const gradientCanvasCache = new Map()
const GRAD_SIZE = 64

export function getGradientCanvas(axes) {
  const key = (axes || []).join('|') || '_empty'
  if (gradientCanvasCache.has(key)) return gradientCanvasCache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = GRAD_SIZE
  canvas.height = GRAD_SIZE
  const ctx = canvas.getContext('2d')

  const colors = (axes || []).map((a) => AXES_COLORS[a]).filter(Boolean)
  if (colors.length === 0) colors.push('#ffffff')

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

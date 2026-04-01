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


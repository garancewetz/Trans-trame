const HALF_WIDTH = 800

export function drawGenealogyOverlay(ctx, globalScale) {
  // Horizontal baseline
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1 / globalScale
  ctx.beginPath()
  ctx.moveTo(-HALF_WIDTH, 0)
  ctx.lineTo(HALF_WIDTH, 0)
  ctx.stroke()

  // Time labels
  const fontSize = Math.max(6, 6 / globalScale)
  ctx.font = `bold ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
  ctx.textBaseline = 'top'

  const labelY = 15 / globalScale
  const padX = 4 / globalScale
  const padY = 2 / globalScale
  const radius = 2 / globalScale

  // PASSÉ (left)
  drawLabel(ctx, 'PASSÉ', -HALF_WIDTH + 40, labelY, fontSize, padX, padY, radius)

  // PRÉSENT (right)
  ctx.textAlign = 'right'
  drawLabel(ctx, 'PRÉSENT', HALF_WIDTH - 40, labelY, fontSize, padX, padY, radius)
  ctx.textAlign = 'left'
}

function drawLabel(ctx, text, x, y, fontSize, padX, padY, radius) {
  const metrics = ctx.measureText(text)
  const w = metrics.width + padX * 2
  const h = fontSize + padY * 2

  const align = ctx.textAlign
  const bgX = align === 'right' ? x - metrics.width - padX : x - padX

  ctx.fillStyle = 'rgba(6,3,15,0.4)'
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(bgX, y - padY, w, h, radius)
  } else {
    ctx.rect(bgX, y - padY, w, h)
  }
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillText(text, x, y)
}

// @ts-nocheck — shared with nodeObject.ts which disables strict checking

/** Convert hex/rgb color to rgba with specified alpha */
export function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`)
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Draw a rounded rectangle path (does not fill/stroke) */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** Draw a radial glow effect.
 *
 * Implémentation sans `createRadialGradient` : ce dernier alloue un objet
 * CanvasGradient + colorStops à CHAQUE appel. Sur N nœuds × 60 fps, on
 * saturait la young-gen JS (~6 MB/s d'allocations non-cacheables) → pauses
 * GC majeures visibles en dent-de-scie 64→131 MB sur la heap, et freeze de
 * la main thread quand le GC majeur se déclenchait.
 *
 * 2 disques concentriques avec alpha cumulatif approximent le fade radial.
 * Visuellement plus dur qu'un vrai gradient mais imperceptible sur des halos
 * de < 10 px. Aucune allocation Canvas par appel.
 */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, innerR: number, outerR: number, color: string, alpha: number): void {
  if (alpha < 0.02 || outerR <= innerR) return
  ctx.beginPath()
  ctx.arc(x, y, outerR, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(color, alpha * 0.3)
  ctx.fill()
  if (outerR - innerR > 4) {
    const midR = (innerR + outerR) / 2
    ctx.beginPath()
    ctx.arc(x, y, midR, 0, Math.PI * 2)
    ctx.fillStyle = withAlpha(color, alpha * 0.25)
    ctx.fill()
  }
}

// Cache de wrapText. Chaque label visible déclenche 5-15 `measureText` par frame
// (chaque appel alloue un objet TextMetrics natif). À 50 labels × 60 fps =
// ~30 000 TextMetrics/s, ce qui contribue au freeze tardif (cumul sur la heap).
// Le cache hit est >95 % : même texte, même police, même largeur frame après frame.
//
// `Math.round(maxWidth)` augmente le hit rate pendant un zoom continu (l'arrondi
// pixel ne change rien visuellement). La cap à 2000 entrées + clear brutal évite
// la croissance infinie : le cache se reconstruit en < 1 sec d'activité.
const wrapTextCache = new Map<string, string[]>()
const WRAP_CACHE_MAX = 2000

/**
 * Wrap text into multiple lines respecting maxWidth. Breaks on spaces;
 * if a single word exceeds maxWidth, breaks by character.
 * ctx must have the font already set before calling (measureText depends on it).
 *
 * Résultat caché par (font, maxWidth arrondi, text) — voir note ci-dessus.
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const cacheKey = `${ctx.font}|${Math.round(maxWidth)}|${text}`
  const cached = wrapTextCache.get(cacheKey)
  if (cached) return cached

  const result = computeWrappedLines(ctx, text, maxWidth)

  if (wrapTextCache.size >= WRAP_CACHE_MAX) wrapTextCache.clear()
  wrapTextCache.set(cacheKey, result)
  return result
}

function computeWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return ['']
  if (ctx.measureText(text).width <= maxWidth) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  const pushCurrent = () => { if (current) { lines.push(current); current = '' } }

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    pushCurrent()
    if (ctx.measureText(word).width <= maxWidth) {
      current = word
    } else {
      let chunk = ''
      for (const ch of word) {
        const next = chunk + ch
        if (ctx.measureText(next).width <= maxWidth) {
          chunk = next
        } else {
          if (chunk) lines.push(chunk)
          chunk = ch
        }
      }
      current = chunk
    }
  }
  pushCurrent()
  return lines.length ? lines : [text]
}

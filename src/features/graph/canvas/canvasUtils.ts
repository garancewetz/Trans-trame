// @ts-nocheck — shared with nodeObject.ts which disables strict checking

/** Convert hex/rgb color to rgba with specified alpha.
 *
 * Hot path : ~150-300 appels/frame sur les nœuds actifs pendant un hover.
 * Le cache `rgbCache` évite 3 × parseInt par appel pour les couleurs hex
 * (#RRGGBB). Comme les nœuds partagent un petit set de couleurs (une par
 * combo d'axes), le hit rate est ~99 %.
 */
const rgbCache = new Map<string, string>()
const RGB_CACHE_MAX = 100

export function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`)
  }
  let rgb = rgbCache.get(hex)
  if (!rgb) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    rgb = `${r},${g},${b}`
    if (rgbCache.size >= RGB_CACHE_MAX) rgbCache.clear()
    rgbCache.set(hex, rgb)
  }
  return `rgba(${rgb},${alpha})`
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
//
// `maxLineWidth` est calculé une seule fois lors du wrapping et caché avec les
// lignes. Avant ce changement, chaque appelant re-mesurait toutes les lignes
// (4-8 × measureText) à chaque frame pour dimensionner la card — pure redondance
// puisque les lignes ne changent pas entre les frames (même cache key).

export type WrappedText = { lines: string[]; maxLineWidth: number }

const wrapTextCache = new Map<string, WrappedText>()
const WRAP_CACHE_MAX = 2000

/**
 * Wrap text into multiple lines respecting maxWidth. Breaks on spaces;
 * if a single word exceeds maxWidth, breaks by character.
 * ctx must have the font already set before calling (measureText depends on it).
 *
 * Retourne `{ lines, maxLineWidth }` : les largeurs de lignes sont mesurées
 * une seule fois et cachées — les appelants n'ont plus besoin de re-mesurer.
 */
// Quantize font size to nearest 0.5px for the cache key. During continuous zoom
// the exact fontSize changes every frame, killing cache hits. Rounding to 0.5px
// means the key only changes every ~10 frames — imperceptible visually but
// dramatically fewer measureText calls (the main young-gen allocation source).
const FONT_QUANTIZE_RE = /(\d+(?:\.\d+)?)px/

function quantizedFontKey(font: string): string {
  return font.replace(FONT_QUANTIZE_RE, (_, n) => (Math.round(parseFloat(n) * 2) / 2) + 'px')
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): WrappedText {
  const cacheKey = `${quantizedFontKey(ctx.font)}|${Math.round(maxWidth)}|${text}`
  const cached = wrapTextCache.get(cacheKey)
  if (cached) return cached

  const result = computeWrappedLines(ctx, text, maxWidth)

  if (wrapTextCache.size >= WRAP_CACHE_MAX) wrapTextCache.clear()
  wrapTextCache.set(cacheKey, result)
  return result
}

function computeWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): WrappedText {
  if (!text) return { lines: [''], maxLineWidth: 0 }
  const singleW = ctx.measureText(text).width
  if (singleW <= maxWidth) return { lines: [text], maxLineWidth: singleW }

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
  const finalLines = lines.length ? lines : [text]

  // Mesure la largeur max une seule fois — cachée avec les lignes.
  // Coût ponctuel au cache miss, mais élimine N × measureText par frame
  // chez les appelants (drawBookLabel, drawAuthorLabel).
  let maxLineWidth = 0
  for (const line of finalLines) {
    const w = ctx.measureText(line).width
    if (w > maxLineWidth) maxLineWidth = w
  }
  return { lines: finalLines, maxLineWidth }
}

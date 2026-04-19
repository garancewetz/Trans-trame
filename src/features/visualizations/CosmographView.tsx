import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Graph } from '@cosmos.gl/graph'
import type { Book, Author, GraphData, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { axisColor, axisLabel, CLUSTER_RING_AXES, type Axis } from '@/common/utils/categories'
import { bookAuthorDisplay, buildAuthorsMap, type AuthorNode } from '@/common/utils/authorUtils'
import { getCitationEdges } from './utils'
import { getNodeRadius } from '@/features/graph/domain/nodeRadius'
import { roundRect, withAlpha } from '@/features/graph/canvas/canvasUtils'
import { isNodeVisibleForFilters } from '@/features/graph/domain/nodeVisibility'
import { useAdjacencyIndex } from '@/features/graph/hooks/useAdjacencyIndex'

interface Props {
  graphData: GraphData
  authors: Author[]
  selectedNode?: Book | null
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
  hoveredFilter?: string | null
  activeHighlight?: Highlight | null
  selectedAuthorId?: string | null
  // Plage temporelle active. On la reçoit ici plutôt que de filtrer `graphData`
  // en amont : chaque tick de la timeline (play = 120 ms) changerait l'identité
  // de graphData, invaliderait le gros useMemo qui rebuild les Float32Arrays,
  // re-randomiserait les positions et redémarrerait la simulation cosmos.gl —
  // la lecture devient injouable. À la place, on fusionne le range avec le
  // greyout existant : un simple selectPointsByIndices, zéro rebuild de layout.
  timelineRange?: TimelineRange | null
  /**
   * Mode de la vue :
   * - `free` (défaut, = vue "Cosmograph") : force libre, liens visibles — pour
   *   lire les filiations.
   * - `territories` (vue "Territoires") : clustering par axe, liens masqués —
   *   pour lire la composition thématique du corpus.
   */
  mode?: 'free' | 'territories'
}

const FALLBACK_RGBA: [number, number, number, number] = [0.78, 0.78, 0.84, 1]

// Seed stable pour tout l'aléa (positions initiales + forces cosmos.gl).
// Incrémenter le suffixe invalide les layouts mémorisés si la sémantique change.
const RANDOM_SEED = 'trans-trame-v1'

// Anneau : copie élargie en `Axis[]` pour `indexOf` (le tuple exclut
// `UNCATEGORIZED`, typage trop strict sinon).
const CLUSTER_RING: Axis[] = [...CLUSTER_RING_AXES]

// En mode Territoires, seuls les livres dont le radius dépasse ce seuil
// reçoivent un label. Ça évite le mur de texte des landmarks (qui sont sélectionnés
// par degré de citation, et en mode Territoires les liens sont cachés donc
// le critère "degré" n'aide pas à prioriser visuellement). 40 ≈ livres à 4+
// citations — les vrais hubs du corpus.
const TERRITORIES_LABEL_MIN_SIZE = 40

// Cluster supplémentaire au centre pour UNCATEGORIZED + livres sans axe.
// Sans ça, ces livres n'ont aucune force de cluster et dérivent à l'extérieur
// sous la seule répulsion → anneau diffus de points fantômes autour des pôles.
// En leur donnant un cluster à l'origine, ils forment une masse centrale nette
// visuellement identifiée comme "hors axe".
const UNCATEGORIZED_CLUSTER_INDEX = CLUSTER_RING.length

// Clé URL pour persister la caméra. Coexiste avec `?book=` / `?link=` gérés
// par useMapUrlSync — on n'écrase jamais les autres params.
const CAM_QUERY_KEY = 'cam'
const CAM_WRITE_THROTTLE_MS = 400

// Taille de la texture gradient (px). 256 = bon compromis qualité/mem à 5k
// nœuds. Le cache est indexé par combo d'axes unique (pas par nœud), donc
// ~50 combos max × 256² × 4 bytes = ~13 MB GPU. Reste net jusqu'à zoom ×5
// sur les plus gros hubs.
const GRADIENT_TEX_SIZE = 256

// Nombre de points nommés en permanence — aligné sur Galaxy
// (TOP_LANDMARK_COUNT=12, cf. useGraphDerivedLinkState.ts).
const TOP_LANDMARK_COUNT = 12

// Tokens typographiques — miroir de Galaxy (nodeObject.ts drawBookLabel).
const LABEL_FONT = "'Space Grotesk', system-ui, sans-serif"
const LABEL_BG_IDLE = 'rgba(8, 4, 22, 0.72)'
const LABEL_BG_HOVER = '#080416'
const LABEL_BORDER = 'rgba(255, 255, 255, 0.1)'
const LABEL_TEXT_IDLE = 'rgba(236, 233, 255, 0.88)'
const LABEL_TEXT_DIM_IDLE = 'rgba(255, 255, 255, 0.55)'
const LABEL_TEXT_HOVER = '#ece9ff'
const LABEL_TEXT_DIM_HOVER = 'rgba(255, 255, 255, 0.55)'

// Bonus de rayon au hover — aligné sur Galaxy (hoveredRadius : baseR + 12).
const HOVER_RADIUS_BONUS = 12

// Couleurs des liens. Baseline discrète (alpha 0.15, aligné sur ALPHA.dim de
// Galaxy/linkStyle.ts) pour ne pas saturer la lecture du graphe au repos —
// les liens ne servent qu'à répondre à "qui cite quoi" au moment où on
// interroge un nœud spécifique. Au hover, outgoing (cyan vif = le focal cite)
// et incoming (jaune vif = est cité par le focal) remontent, les autres
// s'effacent encore plus.
const LINK_DEFAULT_RGBA: readonly [number, number, number, number] = [140 / 255, 220 / 255, 255 / 255, 0.15]
const LINK_DIM_RGBA: readonly [number, number, number, number] = [140 / 255, 220 / 255, 255 / 255, 0.03]
const LINK_CITES_FOCAL_RGBA: readonly [number, number, number, number] = [140 / 255, 220 / 255, 255 / 255, 0.85]
const LINK_CITED_BY_FOCAL_RGBA: readonly [number, number, number, number] = [255 / 255, 210 / 255, 80 / 255, 0.85]
// Lien dont au moins une extrémité est greyout (filtre, highlight, ou livre
// publié hors-range de la timeline) : alpha 0 → invisible. cosmos.gl n'a pas
// de `setLinkVisibility`, on atténue via la couleur comme pour les autres
// états.
const LINK_HIDDEN_RGBA: readonly [number, number, number, number] = [0, 0, 0, 0]

// Padding entre nœuds pour la passe anti-chevauchement.
const COLLIDE_PADDING = 24

// Facteur de sécurité sur les radii de collision. cosmos.gl rend chaque point
// à `flatSizes × pointSizeScale × zoom` (scalePointsOnZoom=true). La passe de
// collision tourne en screen-space au zoom courant mais les positions sont
// converties en espace — le résultat est stable au zoom d'exécution, mais si
// l'utilisateur zoome au-delà, les nœuds rendus grossissent plus vite que la
// distance. On passe des radii gonflés de 50 % pour absorber cette dérive
// jusqu'à zoom ~1.9. En-dessous c'est sur-conservateur (layout plus aéré) —
// préférable à du recouvrement sur les gros hubs.
const COLLIDE_RADIUS_BOOST = 1.5

// Itérations de relaxation. Plus haut = convergence garantie même sur graphes
// très denses. Sur un hub à 100 voisins, il faut ~100 itérations.
const COLLIDE_ITERATIONS = 200

// ====================================================================
// Profils de forces simulation — bascule via setConfigPartial au toggle
// cluster. Séparer les profils évite de tuner à l'aveugle dans l'effet.
// ====================================================================

// Mode libre : forte répulsion, liens longs et mous, centrage léger. Laisse
// respirer les gros hubs (beaucoup de citations = beaucoup de liens tirant).
const FORCES_FREE = {
  simulationRepulsion: 8.0,
  simulationLinkSpring: 0.15,
  simulationLinkDistance: 140,
  simulationCenter: 0.1,
  simulationGravity: 0.1,
  simulationCluster: 0,
  simulationFriction: 0.9,
}

// Mode cluster : valeurs alignées sur l'exemple officiel cosmos.gl
// (stories/clusters/with-labels). La gravité élevée (2.0) rapproche tous les
// clusters autour de l'origine → ils se touchent, se compactent en
// "honeycomb". Sans setClusterPositions explicite (laissé à l'auto-placement
// cosmos par centermass), cette gravité + répulsion 10 + cluster 0.25 suffit
// à les packer proprement sans les superposer.
const FORCES_CLUSTER = {
  simulationRepulsion: 10.0,
  simulationLinkSpring: 0.03,
  simulationLinkDistance: 100,
  simulationCenter: 0,
  simulationGravity: 2.0,
  simulationCluster: 0.25,
  simulationFriction: 0.95,
}

/** PRNG Mulberry32 — ~1 ns/call, state 32 bits, distribution correcte. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash FNV-1a 32 bits — stable entre runs, sans collision sur seeds courts. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

type CamState = { x: number; y: number; zoom: number }

/** Parse `cam=cx,cy,cz` depuis l'URL. Retourne null si invalide. */
function parseCamParam(raw: string | null): CamState | null {
  if (!raw) return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  return { x: parts[0], y: parts[1], zoom: parts[2] }
}

/** Sérialise une caméra avec 2 décimales — évite le bruit dans l'URL. */
function serializeCam(cam: CamState): string {
  const f = (n: number) => Number(n.toFixed(2)).toString()
  return `${f(cam.x)},${f(cam.y)},${f(cam.zoom)}`
}

/**
 * Rend un disque avec gradient conique multi-axes en ImageData pour
 * setImageData() de cosmos.gl. Clone visuel du gradient Galaxy
 * (cache/nodeCache.ts).
 */
function axesGradientImageData(axes: readonly string[]): ImageData | null {
  const SZ = GRADIENT_TEX_SIZE
  const C = SZ / 2
  const canvas = document.createElement('canvas')
  canvas.width = SZ
  canvas.height = SZ
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const colors = axes.map((ax) => axisColor(ax) ?? '#c8c8d6')
  ctx.clearRect(0, 0, SZ, SZ)

  // Clip to circle — cosmos.gl rend le rectangle tel quel, donc on doit
  // masquer nous-mêmes pour obtenir un disque.
  ctx.save()
  ctx.beginPath()
  ctx.arc(C, C, C - 1, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, SZ, SZ)
  } else {
    const grad = ctx.createConicGradient(0, C, C)
    colors.forEach((c, i) => grad.addColorStop(i / colors.length, c))
    grad.addColorStop(1, colors[0])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SZ, SZ)
  }
  ctx.restore()

  return ctx.getImageData(0, 0, SZ, SZ)
}

/** Convert `#rrggbb` / `#rgb` → `[r,g,b,a]` in [0,1]. cosmos.gl expects floats. */
function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return FALLBACK_RGBA
  const n = parseInt(h, 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, alpha]
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): { lines: string[]; maxLineWidth: number } {
  if (!text) return { lines: [], maxLineWidth: 0 }
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  let maxLineWidth = 0
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    if (ctx.measureText(candidate).width <= maxW) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  for (const l of lines) {
    const w = ctx.measureText(l).width
    if (w > maxLineWidth) maxLineWidth = w
  }
  return { lines, maxLineWidth }
}

type LabelData = { author: string; title: string }

/**
 * Peint un halo radial coloré autour d'un point. 2 disques concentriques avec
 * alpha cumulatif — approximation sans createRadialGradient, ~1 ms par frame.
 * Clone de drawGlow / paintGlow dans Galaxy (nodeObject.ts).
 */
function paintGlow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  innerR: number, outerR: number,
  color: string, alpha: number,
): void {
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

/**
 * Résout les chevauchements en place par relaxation itérative sur un grid
 * spatial (voisinage 3×3, O(N) en moyenne). Clone logique de d3-force
 * `forceCollide((node) => getNodeRadius(node) + FORCE_COLLIDE_PADDING)`
 * que Galaxy utilise dans layoutEngine.
 *
 * Invariant après convergence : pour toute paire (i, j),
 *   dist(i, j) >= radii[i] + radii[j] + COLLIDE_PADDING
 *
 * Tailles et coords sont toutes en px écran.
 */
function resolveCollisionsInPlace(
  screenX: Float32Array,
  screenY: Float32Array,
  radii: Float32Array,
  iterations = COLLIDE_ITERATIONS,
): void {
  const N = radii.length
  if (N < 2) return

  let maxR = 0
  for (let i = 0; i < N; i++) if (radii[i] > maxR) maxR = radii[i]
  const cellSize = (maxR * 2 + COLLIDE_PADDING) || 8

  for (let iter = 0; iter < iterations; iter++) {
    // Reconstruit la grille à chaque itération (les positions changent).
    const grid = new Map<number, number[]>()
    let minX = Infinity, minY = Infinity
    for (let i = 0; i < N; i++) {
      if (screenX[i] < minX) minX = screenX[i]
      if (screenY[i] < minY) minY = screenY[i]
    }
    const key = (cx: number, cy: number) => cx * 100003 + cy
    for (let i = 0; i < N; i++) {
      const cx = Math.floor((screenX[i] - minX) / cellSize)
      const cy = Math.floor((screenY[i] - minY) / cellSize)
      const k = key(cx, cy)
      let bucket = grid.get(k)
      if (!bucket) { bucket = []; grid.set(k, bucket) }
      bucket.push(i)
    }

    let moved = false
    for (let i = 0; i < N; i++) {
      const cx = Math.floor((screenX[i] - minX) / cellSize)
      const cy = Math.floor((screenY[i] - minY) / cellSize)
      const ri = radii[i]
      // Voisinage 3×3 autour de la cellule courante.
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(key(cx + ox, cy + oy))
          if (!bucket) continue
          for (const j of bucket) {
            if (j <= i) continue
            const dx = screenX[j] - screenX[i]
            const dy = screenY[j] - screenY[i]
            const distSq = dx * dx + dy * dy
            const minDist = ri + radii[j] + COLLIDE_PADDING
            if (distSq < minDist * minDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq)
              const push = (minDist - dist) / 2
              const nx = dx / dist
              const ny = dy / dist
              screenX[i] -= nx * push
              screenY[i] -= ny * push
              screenX[j] += nx * push
              screenY[j] += ny * push
              moved = true
            }
          }
        }
      }
    }
    if (!moved) return
  }
}

/**
 * Peint un label 2-lignes (AUTEUR maj + titre) au-dessus du point. Clone
 * visuel de drawBookLabel dans Galaxy (features/graph/nodeObject.ts L257-341).
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  data: LabelData,
  hover: boolean,
): void {
  const baseFont = hover ? 14 : 11
  const lineH = baseFont * 1.25
  const subFont = baseFont * 0.9
  const subLineH = subFont * 1.25
  const maxW = baseFont * 14

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  const nameWrap = wrapLines(ctx, data.author, maxW)

  ctx.font = `400 ${subFont}px ${LABEL_FONT}`
  const titleWrap = data.title ? wrapLines(ctx, data.title, maxW) : { lines: [], maxLineWidth: 0 }

  const padX = baseFont * (hover ? 0.8 : 0.5)
  const padY = baseFont * (hover ? 0.5 : 0.3)
  const border = baseFont * (hover ? 0.6 : 0.4)
  const contentW = Math.max(nameWrap.maxLineWidth, titleWrap.maxLineWidth)
  const boxW = contentW + padX * 2
  const nameH = lineH * nameWrap.lines.length
  const titleH = subLineH * titleWrap.lines.length
  const boxH = nameH + titleH + padY * 2
  const boxX = x - boxW / 2
  const boxY = y - radius - boxH - baseFont * 0.4

  ctx.fillStyle = hover ? LABEL_BG_HOVER : LABEL_BG_IDLE
  roundRect(ctx, boxX, boxY, boxW, boxH, border)
  ctx.fill()
  if (hover) {
    ctx.strokeStyle = LABEL_BORDER
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.font = `${hover ? 600 : 500} ${baseFont}px ${LABEL_FONT}`
  ctx.fillStyle = hover ? LABEL_TEXT_HOVER : LABEL_TEXT_IDLE
  for (let i = 0; i < nameWrap.lines.length; i++) {
    ctx.fillText(nameWrap.lines[i], x, boxY + padY + lineH * i)
  }

  if (titleWrap.lines.length > 0) {
    ctx.font = `400 ${subFont}px ${LABEL_FONT}`
    ctx.fillStyle = hover ? LABEL_TEXT_DIM_HOVER : LABEL_TEXT_DIM_IDLE
    const titleStart = boxY + padY + nameH
    for (let i = 0; i < titleWrap.lines.length; i++) {
      ctx.fillText(titleWrap.lines[i], x, titleStart + subLineH * i)
    }
  }

  ctx.restore()
}

/**
 * Peint le label d'un axe à sa position de cluster. Typo large, uppercase,
 * tracking marqué — c'est le repère macro, il doit se lire au-dessus de la
 * masse des labels de livres sans les noyer. Pill assombrie + stroke couleur
 * d'axe pour identifier le pôle au premier coup d'œil.
 */
function drawClusterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  color: string,
): void {
  const font = 13
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${font}px ${LABEL_FONT}`
  ctx.letterSpacing = '2px'

  const metrics = ctx.measureText(text)
  const padX = 14
  const padY = 8
  const w = metrics.width + padX * 2
  const h = font + padY * 2

  ctx.fillStyle = 'rgba(8, 4, 22, 0.92)'
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(color, 0.7)
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function CosmographView({
  graphData,
  authors,
  selectedNode,
  onNodeClick,
  activeFilter,
  hoveredFilter,
  activeHighlight,
  selectedAuthorId,
  timelineRange,
  mode = 'free',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const labelCanvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick
  const hoveredIndexRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  // Ensemble des index visibles (ceux qu'on a passés à selectPointsByIndices).
  // null = pas de filtre actif → tous les points visibles. Lu par drawOverlay
  // pour masquer les labels des points greyout (un point filtré ne doit pas
  // laisser traîner sa légende).
  const visibleIndexSetRef = useRef<Set<number> | null>(null)
  /** Hover > sélection persistante : même voisinage / liens / taille que le hover (Galaxy). */
  const applyFocalVisualStateRef = useRef<() => void>(() => {})

  // Le clustering est piloté par le mode de la vue — plus de toggle dans l'UI.
  // Le ref suit l'état pour que drawOverlay (memoized sans deps) puisse
  // conditionner l'affichage des labels d'axes au rendu courant.
  const clusterByAxis = mode === 'territories'
  const clusterByAxisRef = useRef(clusterByAxis)
  clusterByAxisRef.current = clusterByAxis
  // Tracks the *previous render's* clusterByAxis so the cluster effect can
  // distinguish a real toggle from a re-run triggered by clusterAssignments
  // changing (which would otherwise schedule an unwanted fitView dezoom).
  const prevClusterByAxisRef = useRef(clusterByAxis)

  // URL params — on capture la caméra initiale *avant* le premier render pour
  // pouvoir désactiver fitViewOnInit quand une caméra est persistée.
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams
  const initialCamRef = useRef<CamState | null>(parseCamParam(searchParams.get(CAM_QUERY_KEY)))

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])
  const linksByNodeId = useAdjacencyIndex(graphData.links)

  const {
    books, idToIndex, flatPositions, flatColors, flatSizes, flatLinks, edgeCount,
    labelByIndex, landmarkIndices, imageDataArray, flatImageIndices, flatImageSizes,
    glowHexByIndex, citationsByBookId, clusterAssignments,
  } = useMemo(() => {
    // Tous les livres sont toujours dans le graphe : les filtres/highlights ne
    // les retirent pas (cf. Galaxy), ils les greyout via selectPointsByIndices
    // + pointGreyoutOpacity. La mise à jour visuelle est faite dans un effect
    // séparé qui ne re-layoute jamais.
    const books = graphData.nodes.filter((n): n is Book => n.type === 'book')
    const idToIndex = new Map<string, number>()
    books.forEach((b, i) => idToIndex.set(b.id, i))

    const citationsByBookId = new Map<string, number>()
    const degreeByBookId = new Map<string, number>()
    const rawEdges = getCitationEdges(graphData.links).filter(
      (e) => idToIndex.has(e.sourceId) && idToIndex.has(e.targetId),
    )
    for (const e of rawEdges) {
      citationsByBookId.set(e.targetId, (citationsByBookId.get(e.targetId) ?? 0) + 1)
      degreeByBookId.set(e.sourceId, (degreeByBookId.get(e.sourceId) ?? 0) + 1)
      degreeByBookId.set(e.targetId, (degreeByBookId.get(e.targetId) ?? 0) + 1)
    }

    const N = books.length
    const positions = new Float32Array(N * 2)
    const colors = new Float32Array(N * 4)
    const sizes = new Float32Array(N)
    const labels: LabelData[] = new Array(N)
    const imageIndices = new Float32Array(N)
    const imageSizes = new Float32Array(N)
    const glowHex: string[] = new Array(N)
    const clusters: (number | undefined)[] = new Array(N)

    // PRNG déterministe : seed = hash(RANDOM_SEED + N). Dépendre de N évite
    // qu'un dataset plus petit atterrisse exactement sur le même layout que
    // le plus grand.
    const rng = mulberry32(hashSeed(`${RANDOM_SEED}:${N}`))

    // Pré-rend une texture gradient par combo d'axes unique.
    const imageDatas: ImageData[] = []
    const keyToImageIndex = new Map<string, number>()
    const ensureImage = (axes: readonly string[]): number => {
      const key = axes.join('|')
      const cached = keyToImageIndex.get(key)
      if (cached !== undefined) return cached
      const img = axesGradientImageData(axes)
      if (!img) return -1
      const idx = imageDatas.length
      imageDatas.push(img)
      keyToImageIndex.set(key, idx)
      return idx
    }

    for (let i = 0; i < N; i++) {
      const b = books[i]
      positions[i * 2] = (rng() - 0.5) * 400
      positions[i * 2 + 1] = (rng() - 0.5) * 400

      const bookAxes = b.axes ?? []
      const firstAxis = bookAxes[0]
      const hex = (firstAxis && axisColor(firstAxis)) ?? '#c8c8d6'
      glowHex[i] = hex
      const [r, g, b_, a] = hexToRgba(hex, 0.92)
      colors[i * 4] = r
      colors[i * 4 + 1] = g
      colors[i * 4 + 2] = b_
      colors[i * 4 + 3] = a

      const citations = citationsByBookId.get(b.id) ?? 0
      const radius = getNodeRadius(b, citations)
      sizes[i] = radius

      // Image : gradient conique rendu au-dessus du disque de couleur. Les
      // livres sans axe gardent imageIndex=-1 (aucune image).
      if (bookAxes.length > 0) {
        const imgIdx = ensureImage(bookAxes)
        imageIndices[i] = imgIdx >= 0 ? imgIdx : -1
        // La texture couvre tout le disque → 2× le radius (diamètre).
        imageSizes[i] = radius * 2
      } else {
        imageIndices[i] = -1
        imageSizes[i] = 0
      }

      // Cluster : index dans CLUSTER_RING si l'axe principal y figure, sinon
      // le cluster central UNCATEGORIZED (livres sans axe reconnu ou
      // explicitement UNCATEGORIZED). Aucun `undefined` → tous les points ont
      // une ancre, plus de points fantômes qui dérivent.
      const clusterIdx = firstAxis ? CLUSTER_RING.indexOf(firstAxis as Axis) : -1
      clusters[i] = clusterIdx >= 0 ? clusterIdx : UNCATEGORIZED_CLUSTER_INDEX

      const authorDisplay = bookAuthorDisplay(b, authorsMap as Map<string, AuthorNode>)
      labels[i] = {
        author: (authorDisplay ?? '').toUpperCase(),
        title: b.title ?? '',
      }
    }

    const links = new Float32Array(rawEdges.length * 2)
    for (let i = 0; i < rawEdges.length; i++) {
      links[i * 2] = idToIndex.get(rawEdges[i].sourceId) as number
      links[i * 2 + 1] = idToIndex.get(rawEdges[i].targetId) as number
    }

    // Landmarks : top-N par degré (Galaxy utilise exactement le même critère).
    const byDegree = books
      .map((b, i) => ({ i, d: degreeByBookId.get(b.id) ?? 0 }))
      .filter((x) => x.d > 0)
      .sort((a, b) => b.d - a.d)
    const landmarks = byDegree.slice(0, TOP_LANDMARK_COUNT).map((x) => x.i)

    return {
      books, idToIndex, flatPositions: positions, flatColors: colors, flatSizes: sizes,
      flatLinks: links, edgeCount: rawEdges.length,
      labelByIndex: labels, landmarkIndices: landmarks,
      imageDataArray: imageDatas, flatImageIndices: imageIndices, flatImageSizes: imageSizes,
      glowHexByIndex: glowHex, citationsByBookId,
      clusterAssignments: clusters,
    }
  }, [graphData, authorsMap])

  const selectedBookIdRef = useRef<string | null>(null)
  selectedBookIdRef.current = selectedNode?.id ?? null
  const selectedVisualIndexRef = useRef<number | null>(null)
  selectedVisualIndexRef.current = selectedNode?.id ? idToIndex.get(selectedNode.id) ?? null : null

  // Miroir des données dans des refs : les callbacks du Graph sont attachés
  // une fois à l'init, mais doivent lire les dernières valeurs (labels, sizes,
  // landmarks) après une mutation. Sans ça il faudrait reconstruire le Graph
  // complet à chaque changement de dataset — on perdrait la caméra et le hover.
  const flatSizesRef = useRef<Float32Array>(flatSizes)
  const labelByIndexRef = useRef<LabelData[]>(labelByIndex)
  const glowHexByIndexRef = useRef<string[]>(glowHexByIndex)
  const landmarkIndicesRef = useRef<number[]>(landmarkIndices)
  const booksRef = useRef<Book[]>(books)
  const idToIndexRef = useRef<Map<string, number>>(idToIndex)
  const linksByNodeIdRef = useRef(linksByNodeId)
  const liveSizesRef = useRef<Float32Array>(new Float32Array(flatSizes))
  const prevHoveredRef = useRef<number | null>(null)
  const flatLinksRef = useRef<Float32Array>(flatLinks)
  const edgeCountRef = useRef<number>(edgeCount)
  const liveLinkColorsRef = useRef<Float32Array>(new Float32Array(edgeCount * 4))

  useEffect(() => {
    flatSizesRef.current = flatSizes
    labelByIndexRef.current = labelByIndex
    glowHexByIndexRef.current = glowHexByIndex
    landmarkIndicesRef.current = landmarkIndices
    booksRef.current = books
    idToIndexRef.current = idToIndex
    flatLinksRef.current = flatLinks
    edgeCountRef.current = edgeCount
    // Recrée le buffer live en repartant des sizes fraîches (le hover précédent
    // est invalidé — on repart propre).
    liveSizesRef.current = new Float32Array(flatSizes)
    // Idem pour les couleurs de liens : baseline uniforme (LINK_DEFAULT).
    const linkBuf = new Float32Array(edgeCount * 4)
    for (let i = 0; i < edgeCount; i++) {
      linkBuf[i * 4] = LINK_DEFAULT_RGBA[0]
      linkBuf[i * 4 + 1] = LINK_DEFAULT_RGBA[1]
      linkBuf[i * 4 + 2] = LINK_DEFAULT_RGBA[2]
      linkBuf[i * 4 + 3] = LINK_DEFAULT_RGBA[3]
    }
    liveLinkColorsRef.current = linkBuf
    prevHoveredRef.current = null
    hoveredIndexRef.current = null
  }, [flatSizes, labelByIndex, glowHexByIndex, landmarkIndices, books, idToIndex, flatLinks, edgeCount])

  // linksByNodeId est recalculé par useAdjacencyIndex (changement de graphData
  // .links) — son effect dédié évite d'invalider le buffer live des tailles/
  // couleurs ci-dessus à chaque mutation de liens.
  useEffect(() => {
    linksByNodeIdRef.current = linksByNodeId
  }, [linksByNodeId])

  /**
   * Redessine le canvas overlay (glow du hover + labels landmarks/hover).
   * Stable via useCallback — appelée depuis les effects et les handlers sans
   * être recréée à chaque render.
   */
  const drawOverlay = useCallback(() => {
    const g = graphRef.current
    const canvas = labelCanvasRef.current
    if (!g || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const tracked = g.getTrackedPointPositionsMap()
    const hov = hoveredIndexRef.current
    const sel = selectedVisualIndexRef.current
    const focal = hov !== null ? hov : sel
    const sizes = flatSizesRef.current
    const labels = labelByIndexRef.current
    const glowHex = glowHexByIndexRef.current
    const landmarks = landmarkIndicesRef.current

    // (1) Glow du nœud focal (survolé, sinon sélectionné) — même rendu que le hover.
    if (focal !== null && focal < sizes.length) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const baseR = sizes[focal]
        const hoverR = baseR + HOVER_RADIUS_BONUS
        const glowColor = glowHex[focal] ?? '#ffffff'
        paintGlow(ctx, sx, sy, hoverR, hoverR + 6, glowColor, 0.42)
      }
    }

    // (2) Labels landmarks. On masque ceux dont le point est filtré (greyout)
    // — si l'utilisateur·ice a réduit le corpus visible, les légendes des
    // points hors-sélection ne doivent pas rester affichées.
    // En mode Territoires, filtrage supplémentaire par taille : le critère
    // "landmark" (top-N par degré de citation) n'a plus de sens quand les
    // liens sont cachés. On ne garde que les gros hubs (radius ≥ seuil), qui
    // sont les vrais repères visuels de chaque territoire.
    const visible = visibleIndexSetRef.current
    const territoriesMode = clusterByAxisRef.current
    for (const idx of landmarks) {
      if (idx === focal) continue
      if (visible !== null && !visible.has(idx)) continue
      if (territoriesMode && sizes[idx] < TERRITORIES_LABEL_MIN_SIZE) continue
      const space = tracked.get(idx)
      if (!space) continue
      const [sx, sy] = g.spaceToScreenPosition(space)
      const r = sizes[idx]
      drawLabel(ctx, sx, sy, r, labels[idx], false)
    }

    // (3) Label du focal en mode « hover » (curseur ou sélection persistée).
    if (focal !== null && focal < sizes.length && (visible === null || visible.has(focal))) {
      const space = tracked.get(focal)
      if (space) {
        const [sx, sy] = g.spaceToScreenPosition(space)
        const r = sizes[focal] + HOVER_RADIUS_BONUS
        drawLabel(ctx, sx, sy, r, labels[focal], true)
      }
    }

    // (4) Labels des pôles d'axes — uniquement en mode Territoires. On lit
    // les positions via getClusterPositions() pour rester aligné avec ce que
    // cosmos utilise réellement (rescale éventuel côté moteur). Si on
    // s'appuyait sur nos constantes clusterCenterFor(), les labels
    // pourraient finir à côté des clusters visibles.
    if (clusterByAxisRef.current) {
      const clusterPositions = g.getClusterPositions()
      // Ring : 10 axes nommés.
      for (let i = 0; i < CLUSTER_RING.length; i++) {
        const cx = clusterPositions[i * 2]
        const cy = clusterPositions[i * 2 + 1]
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
        const axis = CLUSTER_RING[i]
        const [sx, sy] = g.spaceToScreenPosition([cx as number, cy as number])
        const label = axisLabel(axis) ?? axis
        const color = axisColor(axis) ?? '#ffffff'
        drawClusterLabel(ctx, sx, sy, label.toUpperCase(), color)
      }
      // Central : UNCATEGORIZED (11e cluster, index UNCATEGORIZED_CLUSTER_INDEX).
      const uCx = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2]
      const uCy = clusterPositions[UNCATEGORIZED_CLUSTER_INDEX * 2 + 1]
      if (Number.isFinite(uCx) && Number.isFinite(uCy)) {
        const [sx, sy] = g.spaceToScreenPosition([uCx as number, uCy as number])
        const color = axisColor('UNCATEGORIZED') ?? '#999999'
        drawClusterLabel(ctx, sx, sy, 'SANS CATÉGORIE', color)
      }
    }
  }, [])

  // ======================================================================
  // Init effect — construit le Graph une fois, attache les listeners globaux
  // (caméra clavier + URL sync). Les callbacks lisent les données via les
  // refs pour rester valides après une mutation.
  // ======================================================================
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Sync canvas overlay size to container (DPR-aware).
    const labelCanvas = labelCanvasRef.current
    const syncCanvasSize = () => {
      if (!labelCanvas) return
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      if (labelCanvas.width !== w * dpr) labelCanvas.width = w * dpr
      if (labelCanvas.height !== h * dpr) labelCanvas.height = h * dpr
      labelCanvas.style.width = `${w}px`
      labelCanvas.style.height = `${h}px`
      const ctx = labelCanvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    syncCanvasSize()
    const onResize = () => {
      syncCanvasSize()
      drawOverlay()
    }
    window.addEventListener('resize', onResize)

    // Repeint les liens en fonction du nœud focal (hovered) et de la
    // visibilité courante. Baseline = tous les liens en LINK_DEFAULT. Au
    // hover, on distingue outgoing/incoming et on atténue les autres. Si
    // visibleIndexSetRef est non-null, on masque (alpha 0) tout lien dont
    // au moins une extrémité est hors-sélection : la timeline et les
    // filtres doivent aussi effacer les liens "qui n'existent pas encore".
    const applyFocalLinkColors = (focalIndex: number | null) => {
      const g = graphRef.current
      if (!g) return
      const links = flatLinksRef.current
      const N = edgeCountRef.current
      const buf = liveLinkColorsRef.current
      if (buf.length < N * 4) return
      const visible = visibleIndexSetRef.current

      const fill = (i: number, rgba: readonly [number, number, number, number]) => {
        buf[i * 4] = rgba[0]
        buf[i * 4 + 1] = rgba[1]
        buf[i * 4 + 2] = rgba[2]
        buf[i * 4 + 3] = rgba[3]
      }

      for (let i = 0; i < N; i++) {
        const src = links[i * 2]
        const tgt = links[i * 2 + 1]
        if (visible !== null && (!visible.has(src) || !visible.has(tgt))) {
          fill(i, LINK_HIDDEN_RGBA)
          continue
        }
        if (focalIndex === null) {
          fill(i, LINK_DEFAULT_RGBA)
        } else if (src === focalIndex) {
          fill(i, LINK_CITES_FOCAL_RGBA)
        } else if (tgt === focalIndex) {
          fill(i, LINK_CITED_BY_FOCAL_RGBA)
        } else {
          fill(i, LINK_DIM_RGBA)
        }
      }
      g.setLinkColors(buf)
    }

    // Patche le buffer sizes uploadé à cosmos.gl pour le hover.
    const applyHoverSize = (next: number | null) => {
      const g = graphRef.current
      if (!g) return
      const sizes = flatSizesRef.current
      const live = liveSizesRef.current
      const prev = prevHoveredRef.current
      if (prev !== null && prev !== next && prev < sizes.length) {
        live[prev] = sizes[prev]
      }
      if (next !== null && next < sizes.length) {
        live[next] = sizes[next] + HOVER_RADIUS_BONUS
      }
      prevHoveredRef.current = next
      g.setPointSizes(live)
    }

    // Sélection cosmos = [focal + voisin·es] pour pointGreyoutOpacity (Galaxy).
    // Logique dans applyFocalVisualState ; si un filtre est actif, on intersecte.

    // Restaure l'état de sélection filtré (ou rien si aucun filtre actif).
    const restoreFilterSelection = () => {
      const g = graphRef.current
      if (!g) return
      const visible = visibleIndexSetRef.current
      if (visible === null) g.unselectPoints()
      else g.selectPointsByIndices(Array.from(visible))
    }

    const syncTrackedPositionsForFocal = (focal: number | null) => {
      const g = graphRef.current
      if (!g) return
      const landmarks = landmarkIndicesRef.current
      const set = new Set(landmarks)
      if (focal !== null) set.add(focal)
      g.trackPointPositionsByIndices(Array.from(set))
    }

    /**
     * État focal unifié : survol > livre sélectionné dans l’app.
     * Voisinage + liens + taille, y compris quand le curseur quitte le nœud.
     */
    const applyFocalVisualState = () => {
      const g = graphRef.current
      if (!g) return
      const hover = hoveredIndexRef.current
      const selId = selectedBookIdRef.current
      const idToIdx = idToIndexRef.current
      const focal = hover !== null ? hover : (selId ? idToIdx.get(selId) ?? null : null)

      applyHoverSize(focal)
      applyFocalLinkColors(focal)

      if (focal !== null) {
        const book = booksRef.current[focal]
        if (!book) {
          restoreFilterSelection()
          syncTrackedPositionsForFocal(null)
          return
        }
        const adj = linksByNodeIdRef.current.get(book.id)
        const set = new Set<number>()
        set.add(focal)
        if (adj) {
          for (const nid of adj.neighborIds) {
            const i = idToIdx.get(nid)
            if (i !== undefined) set.add(i)
          }
        }
        const visible = visibleIndexSetRef.current
        const arr = visible === null
          ? Array.from(set)
          : Array.from(set).filter((i) => visible.has(i))
        g.selectPointsByIndices(arr)
      } else {
        restoreFilterSelection()
      }

      syncTrackedPositionsForFocal(focal)
    }
    applyFocalVisualStateRef.current = applyFocalVisualState

    // Passe anti-chevauchement — cosmos.gl n'expose pas de forceCollide, on
    // relaxe en JS par grid spatial.
    //
    // IMPORTANT : on pause la simulation avant et on la laisse pausée. Sinon
    // cosmos.gl peut re-ticker quelques frames après onSimulationEnd et
    // ré-introduire des chevauchements.
    const runCollisionPass = () => {
      const g = graphRef.current
      if (!g) return
      const sizes = flatSizesRef.current
      const N = sizes.length
      if (N === 0) return

      g.pause()
      const raw = g.getPointPositions()
      if (raw.length < N * 2) return

      const screenX = new Float32Array(N)
      const screenY = new Float32Array(N)
      // Radii gonflés : cosmos rend plus gros qu'on ne le croit dès que zoom
      // dépasse 1/pointSizeScale. Le boost compense jusqu'à ~1.9× de zoom.
      const boostedRadii = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const [sx, sy] = g.spaceToScreenPosition([raw[i * 2], raw[i * 2 + 1]])
        screenX[i] = sx
        screenY[i] = sy
        boostedRadii[i] = sizes[i] * COLLIDE_RADIUS_BOOST
      }

      resolveCollisionsInPlace(screenX, screenY, boostedRadii)

      const nextPositions = new Float32Array(N * 2)
      for (let i = 0; i < N; i++) {
        const [spx, spy] = g.screenToSpacePosition([screenX[i], screenY[i]])
        nextPositions[i * 2] = spx
        nextPositions[i * 2 + 1] = spy
      }
      // dontRescale=true : on préserve la résolution qu'on vient d'obtenir.
      g.setPointPositions(nextPositions, true)
      // IMPORTANT : setPointPositions buffer le changement — render() pour
      // forcer l'affichage.
      g.render()
    }

    // Second passage différé : cosmos.gl peut re-ticker quelques frames pour
    // fit-view ou animations d'inertie de drag. On relance la collision
    // ~800 ms après le end pour capturer ce résiduel.
    let collisionTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleSecondCollisionPass = () => {
      if (collisionTimer) clearTimeout(collisionTimer)
      collisionTimer = setTimeout(() => {
        runCollisionPass()
        drawOverlay()
        collisionTimer = null
      }, 800)
    }

    // --- URL sync caméra ---
    // Throttled write : on attend CAM_WRITE_THROTTLE_MS d'inactivité avant
    // d'écrire. `replace: true` → pas de spam d'historique.
    let camWriteTimer: ReturnType<typeof setTimeout> | null = null
    let camRestoreApplied = false
    const writeCamToUrl = (cam: CamState) => {
      if (camWriteTimer) clearTimeout(camWriteTimer)
      camWriteTimer = setTimeout(() => {
        const next = new URLSearchParams(searchParamsRef.current)
        next.set(CAM_QUERY_KEY, serializeCam(cam))
        setSearchParams(next, { replace: true })
        camWriteTimer = null
      }, CAM_WRITE_THROTTLE_MS)
    }

    // Restaure la caméra depuis l'URL après l'init. setZoomTransformByPointPositions
    // avec un point unique centre la vue sans modifier la simulation.
    const tryRestoreCamFromUrl = () => {
      if (camRestoreApplied) return
      const cam = initialCamRef.current
      if (!cam) return
      const g = graphRef.current
      if (!g) return
      g.setZoomTransformByPointPositions(
        new Float32Array([cam.x, cam.y]),
        0, cam.zoom, 0, false,
      )
      camRestoreApplied = true
      drawOverlay()
    }

    // ======================================================================
    // Création du Graph.
    // ======================================================================
    const graph = new Graph(container, {
      backgroundColor: '#080416',
      // Seed init-only : rend la simulation cosmos.gl déterministe entre reloads.
      randomSeed: RANDOM_SEED,
      // Baseline très dim — les liens sont à l'arrière-plan sauf au hover (où
      // applyFocalLinkColors les remonte). Même RGBA que LINK_DEFAULT_RGBA.
      linkDefaultColor: [LINK_DEFAULT_RGBA[0], LINK_DEFAULT_RGBA[1], LINK_DEFAULT_RGBA[2], LINK_DEFAULT_RGBA[3]],
      linkDefaultWidth: 1.5,
      // Cosmos calcule `arrowWidth = linkWidth × 2 × linkArrowsSizeScale` et la
      // pointe = max(0, arrowWidth - linkWidth). Avec linkWidth=1.5, un scale
      // de 1.2 donne une pointe ~2px lisible sans surcharger le graphe
      // au repos. `scaleLinksOnZoom=false` (défaut) → flèches stables en px écran.
      linkDefaultArrows: true,
      linkArrowsSizeScale: 1.2,
      // cosmos.gl fade les liens longs. On laisse un floor bas (0.3) pour que
      // les longs liens s'effacent vraiment et ne surchargent pas le graphe.
      linkVisibilityDistanceRange: [50, 2000],
      linkVisibilityMinTransparency: 0.3,
      curvedLinks: true,
      pointSizeScale: 0.8,
      scalePointsOnZoom: true,
      renderHoveredPointRing: true,
      hoveredPointRingColor: '#ece9ff',
      // Greyout : pointGreyoutOpacity appliquée aux points non-sélectionnés.
      pointGreyoutOpacity: 0.12,
      // Layout : valeurs du profil FORCES_FREE (toggle cluster OFF par défaut).
      // Forces tunées pour que les gros hubs respirent (beaucoup de liens →
      // traction importante vers le centre si linkSpring trop raide).
      spaceSize: 8192,
      simulationRepulsionTheta: 1.15,
      simulationDecay: 6000,
      // FORCES_FREE porte friction + gravity + répulsion/linkSpring/linkDistance/
      // center/cluster. Le mode Territoires bascule vers FORCES_CLUSTER via
      // setConfigPartial dans le cluster effect.
      ...FORCES_FREE,
      // Pas d'auto-fit : cosmos refit les positions après simulation, ce qui
      // dézoome sous les yeux de l'utilisateur au bout de quelques secondes.
      // `rescalePositions: true` donne déjà un cadrage initial correct à t=0 ;
      // si une caméra est persistée dans l'URL, tryRestoreCamFromUrl l'applique.
      fitViewOnInit: false,
      fitViewPadding: 0.2,
      rescalePositions: true,
      enableDrag: true,
      showFPSMonitor: false,
      onPointClick: (index: number) => {
        const book = booksRef.current[index]
        if (book && onNodeClickRef.current) onNodeClickRef.current(book)
      },
      onPointMouseOver: (index: number) => {
        if (draggingRef.current) return
        hoveredIndexRef.current = index
        const g = graphRef.current
        if (!g) return
        applyFocalVisualState()
        g.render()
        drawOverlay()
      },
      onPointMouseOut: () => {
        // Pendant un drag, le curseur peut déraper hors du nœud ; on verrouille
        // le hover pour que le highlight reste sur le nœud tiré.
        if (draggingRef.current) return
        hoveredIndexRef.current = null
        const g = graphRef.current
        applyFocalVisualState()
        g?.render()
        drawOverlay()
      },
      // Drag : on réchauffe la simulation pour que les voisins suivent le nœud
      // tiré (runCollisionPass met la simu en pause après stabilisation).
      onDragStart: () => {
        draggingRef.current = true
      },
      onDrag: () => {
        graphRef.current?.start(0.3)
      },
      onDragEnd: () => {
        draggingRef.current = false
      },
      onSimulationTick: () => {
        // Tentative de restore dès que la caméra réelle est initialisée.
        if (!camRestoreApplied) tryRestoreCamFromUrl()
        drawOverlay()
      },
      onSimulationEnd: () => {
        tryRestoreCamFromUrl()
        runCollisionPass()
        drawOverlay()
        scheduleSecondCollisionPass()
      },
      onZoom: (_e, userDriven) => {
        drawOverlay()
        // Ne persiste que les changements initiés par l'utilisateur — évite
        // une boucle quand on restaure depuis l'URL ou que cosmos.gl fait un
        // fitView automatique.
        if (!userDriven) return
        const g = graphRef.current
        if (!g || !container) return
        const w = container.clientWidth
        const h = container.clientHeight
        const [cx, cy] = g.screenToSpacePosition([w / 2, h / 2])
        writeCamToUrl({ x: cx, y: cy, zoom: g.getZoomLevel() })
      },
      onBackgroundClick: () => {},
    })
    graphRef.current = graph
    applyFocalVisualState()

    // ======================================================================
    // Pan + zoom clavier — miroir de cameraControls.ts (Galaxy).
    // ======================================================================
    const keys = new Set<string>()
    const vel = { moveX: 0, moveY: 0, zoom: 0 }
    let camSeeded = false
    const cam = { x: 0, y: 0, zoom: 1 }
    let animFrameId: number | null = null
    let running = false

    const MIN_ZOOM = 0.05
    const MAX_ZOOM = 20
    const PAN_ACCEL = 4.5
    const MAX_PAN = 55
    const ZOOM_ACCEL = 0.008
    const MAX_ZOOM_VEL = 0.07
    const DAMP = 0.82
    const PAN_EPSILON = 0.1
    const ZOOM_EPSILON = 0.001

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

    const seedCam = () => {
      if (camSeeded) return
      const g = graphRef.current
      if (!g) return
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
      writeCamToUrl({ ...cam })
      drawOverlay()
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

    const NAV_KEYS = new Set([
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'keyz', 'keys', 'equal', 'minus', 'z', 's', '+', '-', '=',
    ])

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const codeKey = (e.code || '').toLowerCase()
      const charKey = (e.key || '').toLowerCase()
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
      if (collisionTimer) clearTimeout(collisionTimer)
      if (camWriteTimer) clearTimeout(camWriteTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (animFrameId !== null) cancelAnimationFrame(animFrameId)
      graph.destroy()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ======================================================================
  // Data effect — upload des buffers au GPU quand le dataset change. Les
  // refs miroir ont déjà été mises à jour par l'effet précédent, donc les
  // callbacks du Graph liront les bonnes valeurs.
  // ======================================================================
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    if (books.length === 0) {
      g.setLinks(new Float32Array(0))
      g.render()
      return
    }

    g.setPointPositions(flatPositions)
    g.setPointColors(flatColors)
    g.setPointSizes(flatSizes)
    if (imageDataArray.length > 0) {
      g.setImageData(imageDataArray)
      g.setPointImageIndices(flatImageIndices)
      g.setPointImageSizes(flatImageSizes)
    }
    // Vue Territoires : liens masqués. On passe un buffer vide — cosmos.gl
    // ne peint rien et la force de lien est neutralisée automatiquement.
    if (mode === 'territories') {
      g.setLinks(new Float32Array(0))
    } else {
      g.setLinks(flatLinks)
      g.setLinkColors(liveLinkColorsRef.current)
    }
    applyFocalVisualStateRef.current()
    g.render()
  }, [flatPositions, flatColors, flatSizes, flatLinks, landmarkIndices, imageDataArray, flatImageIndices, flatImageSizes, books.length, mode])

  // ======================================================================
  // Cluster effect — active/désactive le groupement par axe. Piloté par
  // le toggle UI pour permettre la comparaison visuelle.
  // ======================================================================
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    const N = clusterAssignments.length
    if (N === 0) return

    if (clusterByAxis) {
      // Auto-placement cosmos : on passe des positions undefined pour tous les
      // clusters. Cosmos place chaque cluster à son centermass et la gravité
      // élevée de FORCES_CLUSTER les aspire autour de l'origine → ils se
      // tassent en "honeycomb" (cf. exemple officiel cosmos.gl clusters/with-labels).
      // Conséquence : on perd l'ordre narratif du ring, mais on gagne un
      // packing serré. Les labels sont posés via getClusterPositions() donc
      // ils suivent automatiquement l'emplacement final.
      const autoPositions: (number | undefined)[] = new Array((CLUSTER_RING.length + 1) * 2).fill(undefined)
      g.setPointClusters(clusterAssignments)
      g.setClusterPositions(autoPositions)
      // Swap complet du profil de forces : la cluster force doit dominer,
      // mais elle se fait écraser si repulsion/center/linkSpring restent
      // hauts. FORCES_CLUSTER les baisse d'un coup.
      g.setConfigPartial(FORCES_CLUSTER)
    } else {
      // Détache tous les points des clusters — force libre.
      const freed: (number | undefined)[] = new Array(N).fill(undefined)
      g.setPointClusters(freed)
      g.setClusterPositions([])
      g.setConfigPartial(FORCES_FREE)
    }
    // Réchauffe avec alpha=1 et relance explicitement — le graphe peut être
    // paused par la passe de collision précédente, setConfigPartial ne
    // redémarre pas la simu tout seul.
    g.start(1)
    // Redraw immédiat : les labels d'axes doivent apparaître/disparaître dès
    // le toggle, sans attendre le prochain simulationTick.
    drawOverlay()

    // Auto-fit uniquement sur toggle réel : les clusters se forment à ±2500
    // dans l'espace cosmos, bien au-delà du cadre initial. Sans re-fit, on ne
    // voit qu'un sous-ensemble et la carte semble "déformée". 3 s ≈ temps que
    // la simu converge assez pour que fitView calcule un cadre stable.
    // On skip ce fit lorsque l'effet re-fire à cause d'un changement de
    // clusterAssignments (recalcul data) ou au montage initial, pour éviter
    // un dézoom non sollicité sous les yeux de l'utilisateur.
    const didToggle = prevClusterByAxisRef.current !== clusterByAxis
    prevClusterByAxisRef.current = clusterByAxis
    if (!didToggle) return
    const fitTimer = setTimeout(() => {
      graphRef.current?.fitView(800, 0.15, false)
    }, 3000)
    return () => clearTimeout(fitTimer)
  }, [clusterByAxis, clusterAssignments])

  // ======================================================================
  // Greyout basé sur les filtres / highlights / plage timeline. Reprend
  // isNodeVisibleForFilters de Galaxy pour garder la sémantique cohérente.
  // La timeline s'ajoute comme un prédicat supplémentaire — livre in-range
  // si son année est dans [start, end] (livres sans année toujours visibles,
  // aligné avec useAppTimelineAndLayout).
  // ======================================================================
  useEffect(() => {
    const g = graphRef.current
    if (!g || books.length === 0) return

    const effectiveFilter = hoveredFilter ?? activeFilter ?? null
    const effectiveHighlight = activeHighlight
      ?? (selectedAuthorId ? { kind: 'author' as const, authorId: selectedAuthorId } : null)

    const inRange = (book: Book): boolean => {
      if (!timelineRange) return true
      const y = book.year
      if (y == null) return true
      return y >= timelineRange.start && y <= timelineRange.end
    }

    if (!effectiveFilter && !effectiveHighlight && !timelineRange) {
      visibleIndexSetRef.current = null
      applyFocalVisualStateRef.current()
      g.render()
      drawOverlay()
      return
    }

    const matched: number[] = []
    for (let i = 0; i < books.length; i++) {
      const b = books[i]
      if (!inRange(b)) continue
      if (isNodeVisibleForFilters(b, effectiveFilter, effectiveHighlight, linksByNodeId, citationsByBookId)) {
        matched.push(i)
      }
    }
    visibleIndexSetRef.current = new Set(matched)
    applyFocalVisualStateRef.current()
    g.render()
    drawOverlay()
  }, [activeFilter, hoveredFilter, activeHighlight, selectedAuthorId, timelineRange, books, linksByNodeId, citationsByBookId, drawOverlay])

  useEffect(() => {
    const g = graphRef.current
    if (!g || books.length === 0) return
    applyFocalVisualStateRef.current()
    g.render()
    drawOverlay()
  }, [selectedNode?.id, books.length, drawOverlay])

  return (
    <div className="absolute inset-0 bg-bg-base overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Overlay canvas pour les labels — pointer-events-none pour laisser
          passer les événements au renderer WebGL en dessous. */}
      <canvas ref={labelCanvasRef} className="pointer-events-none absolute inset-0" />

      <div className="absolute bottom-3 left-3 text-[14px] text-white/20 font-mono">
        {mode === 'territories'
          ? `${books.length} ressources · ${CLUSTER_RING.length} territoires thématiques · cosmos.gl GPU`
          : `${books.length} ressources · ${edgeCount} citations · cosmos.gl GPU`}
      </div>
    </div>
  )
}

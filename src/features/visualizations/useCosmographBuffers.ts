import { useMemo } from 'react'
import type { Book, GraphData } from '@/types/domain'
import { axisColor, CLUSTER_RING_AXES, type Axis } from '@/common/utils/categories'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { getNodeRadius } from '@/features/graph/domain/nodeRadius'
import { getCitationEdges } from './utils'
import { RANDOM_SEED, hashSeed, mulberry32 } from './cosmographRng'
import { type LabelData, axesGradientImageData, hexToRgba } from './cosmographDrawing'

// Anneau : copie élargie en `Axis[]` pour `indexOf` (le tuple exclut
// `UNCATEGORIZED`, typage trop strict sinon).
export const CLUSTER_RING: Axis[] = [...CLUSTER_RING_AXES]

// Cluster supplémentaire au centre pour UNCATEGORIZED + livres sans axe.
// Sans ça, ces livres n'ont aucune force de cluster et dérivent à l'extérieur
// sous la seule répulsion → anneau diffus de points fantômes autour des pôles.
// En leur donnant un cluster à l'origine, ils forment une masse centrale nette
// visuellement identifiée comme "hors axe".
export const UNCATEGORIZED_CLUSTER_INDEX = CLUSTER_RING.length

// Étendue horizontale utilisée pour semer les positions initiales par année.
// Suffisamment large (~1/4 de spaceSize=8192) pour que la tendance
// chronologique survive à l'équilibre de la simulation sous gravity=0.1.
const CHRONO_SEED_X_RANGE = 2000

// ── Vue Chronologique (mode='chronological') ────────────────────────────────
// Positions fixes : X = année de publication mappée sur [−CHRONO_X_HALF, +CHRONO_X_HALF],
// Y = lane déterministe par année (pas de jitter aléatoire : la simulation est
// figée, aucune répulsion ne corrige les chevauchements → on les évite en
// plaçant chaque livre dans sa propre "colonne" verticale).
const CHRONO_X_HALF = 2400
// Demi-hauteur de la colonne. Les livres d'une même année sont répartis
// uniformément sur [−CHRONO_Y_HALF, +CHRONO_Y_HALF]. Valeur suffisamment large
// pour que les années denses (~30 livres) gardent un espacement vertical
// supérieur au diamètre du plus gros nœud.
const CHRONO_Y_HALF = 1400
// Perturbation aléatoire verticale (±) ajoutée par-dessus la lane déterministe :
// casse juste assez l'alignement parfait pour que chaque colonne ne ressemble
// pas à une grille rigide, sans compromettre la séparation des points.
const CHRONO_Y_SHAKE = 18
// Livres sans année : bande séparée à droite, après la dernière année connue.
// Gap = rupture visuelle pour signaler qu'ils sortent de la timeline.
const CHRONO_UNKNOWN_GAP = 300
const CHRONO_UNKNOWN_WIDTH = 380

// Nombre de points nommés en permanence — aligné sur Galaxy
// (TOP_LANDMARK_COUNT=12, cf. useGraphDerivedLinkState.ts).
const TOP_LANDMARK_COUNT = 12

// Nombre de points tracés dans la mini-map. À 10k nœuds, tout afficher donnerait
// une bouillie illisible sur 170×110 px. Les top-500 par degré conservent la
// silhouette des régions denses (hubs + leurs voisins immédiats) sans saturer.
const MINIMAP_TOP_N = 500

// Cache module-level : un combo d'axes → la même ImageData à vie. Sans ça,
// chaque rebuild du useMemo (filtre, refetch, edit, merge) re-rasterise les
// ~20 combos populaires via canvas 2D, ce qui bloque le main thread sur les
// gros datasets. Les clés sont stables (axes.join('|')) et le résultat
// déterministe, donc un cache global est sûr.
const axesImageCache = new Map<string, ImageData>()

export type CosmographBuffers = {
  books: Book[]
  idToIndex: Map<string, number>
  flatPositions: Float32Array
  /**
   * Positions fixes pour le mode Chronologique : X ∝ année de publication,
   * Y = jitter. Les livres sans année occupent une bande séparée à droite.
   * La simulation est figée dans ce mode (cf. FORCES_FROZEN) donc ces
   * positions sont lues telles quelles, sans dérive.
   */
  flatPositionsChrono: Float32Array
  flatColors: Float32Array
  flatSizes: Float32Array
  flatLinks: Float32Array
  flatLinkWidths: Float32Array
  edgeCount: number
  labelByIndex: LabelData[]
  landmarkIndices: number[]
  // Landmarks spécifiques au mode Catégories : trié par taille (= proxy de
  // citations reçues) plutôt que par degré. Le degré devient muet quand les
  // liens sont masqués — prendre par taille garantit qu'on nomme bien les
  // gros hubs visibles plutôt que des petits nœuds accidentellement fortement
  // liés.
  landmarkIndicesCategories: number[]
  minimapIndices: number[]
  imageDataArray: ImageData[]
  flatImageIndices: Float32Array
  flatImageSizes: Float32Array
  glowHexByIndex: string[]
  citationsByBookId: Map<string, number>
  clusterAssignments: (number | undefined)[]
}

export function useCosmographBuffers(
  graphData: GraphData,
  authorsMap: Map<string, AuthorNode>,
): CosmographBuffers {
  return useMemo(() => {
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
    const positionsChrono = new Float32Array(N * 2)
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

    // Biais chronologique initial : X ∝ année de publication. Cosmos.gl n'a
    // pas de `forceX`, mais avec gravity/center faibles (FORCES_FREE), ce seed
    // survit à l'équilibre — on garde une lecture gauche=ancien / droite=récent
    // sans contraindre la simulation. Livres sans année : X aléatoire centré.
    let minYear = Infinity
    let maxYear = -Infinity
    for (const b of books) {
      if (typeof b.year === 'number' && Number.isFinite(b.year)) {
        if (b.year < minYear) minYear = b.year
        if (b.year > maxYear) maxYear = b.year
      }
    }
    const yearSpan = Number.isFinite(minYear) && maxYear > minYear ? maxYear - minYear : 0

    // Pré-rend une texture gradient par combo d'axes unique.
    const imageDatas: ImageData[] = []
    const keyToImageIndex = new Map<string, number>()
    const ensureImage = (axes: readonly string[]): number => {
      const key = axes.join('|')
      const cached = keyToImageIndex.get(key)
      if (cached !== undefined) return cached
      let img = axesImageCache.get(key)
      if (!img) {
        const produced = axesGradientImageData(axes)
        if (!produced) return -1
        axesImageCache.set(key, produced)
        img = produced
      }
      const idx = imageDatas.length
      imageDatas.push(img)
      keyToImageIndex.set(key, idx)
      return idx
    }

    // Bande "année inconnue" du mode Chronologique : débute juste après la
    // dernière année connue, avec un gap visuel.
    const chronoUnknownStart = CHRONO_X_HALF + CHRONO_UNKNOWN_GAP

    // Pass préalable pour le mode Chronologique : compte de livres par année
    // (bucket). Nécessaire pour distribuer les Y de façon déterministe sur
    // toute la hauteur — la simulation étant figée, aucune répulsion ne peut
    // corriger a posteriori les points qui atterriraient au même Y.
    const chronoBucketCounts = new Map<number | 'unknown', number>()
    for (const b of books) {
      const key = typeof b.year === 'number' && Number.isFinite(b.year) ? b.year : 'unknown'
      chronoBucketCounts.set(key, (chronoBucketCounts.get(key) ?? 0) + 1)
    }
    const chronoBucketLane = new Map<number | 'unknown', number>()

    for (let i = 0; i < N; i++) {
      const b = books[i]
      const hasYear = typeof b.year === 'number' && Number.isFinite(b.year)
      // X chronologique + jitter pour éviter les alignements verticaux rigides.
      // Jitter ±5% de la plage = les livres de la même année se répartissent
      // sans former une colonne, mais restent clairement groupés.
      let seedX: number
      if (yearSpan > 0 && hasYear) {
        const norm = (b.year! - minYear) / yearSpan - 0.5
        const jitter = (rng() - 0.5) * CHRONO_SEED_X_RANGE * 0.05
        seedX = norm * CHRONO_SEED_X_RANGE + jitter
      } else {
        seedX = (rng() - 0.5) * 400
      }
      positions[i * 2] = seedX
      positions[i * 2 + 1] = (rng() - 0.5) * 400

      // Positions fixes pour le mode Chronologique. rng partagé avec le mode
      // libre : l'ordre de tirage est identique → même seed produit le même
      // layout entre modes (utile pour conserver la position relative d'un
      // livre si l'utilisateur·ice l'a repéré dans une autre vue).
      let chronoX: number
      if (yearSpan > 0 && hasYear) {
        const norm = (b.year! - minYear) / yearSpan - 0.5
        // Jitter X réduit pour que l'axe temporel reste lisible : un livre
        // publié en 1980 doit tomber proche de la graduation 1980, pas
        // flotter vers 1975 ou 1985.
        const chronoJitter = (rng() - 0.5) * CHRONO_X_HALF * 0.02
        chronoX = norm * 2 * CHRONO_X_HALF + chronoJitter
      } else {
        // Jitter X dans la bande "inconnu" : centre + demi-largeur aléatoire.
        chronoX = chronoUnknownStart + (rng() - 0.5) * CHRONO_UNKNOWN_WIDTH
      }
      // Y déterministe par lane : les livres d'un même bucket (année ou
      // "inconnu") sont répartis uniformément sur [−CHRONO_Y_HALF, +CHRONO_Y_HALF].
      // laneNorm ∈ [−0.5, +0.5] ; pour un bucket de 1 livre, laneNorm = 0
      // (centré). Le shake final casse l'alignement visuel parfait entre
      // colonnes adjacentes sans risquer de chevauchement.
      const bucketKey: number | 'unknown' = hasYear ? b.year! : 'unknown'
      const bucketTotal = chronoBucketCounts.get(bucketKey) ?? 1
      const laneIdx = chronoBucketLane.get(bucketKey) ?? 0
      chronoBucketLane.set(bucketKey, laneIdx + 1)
      const laneNorm = bucketTotal > 1 ? laneIdx / (bucketTotal - 1) - 0.5 : 0
      const chronoYShake = (rng() - 0.5) * 2 * CHRONO_Y_SHAKE
      positionsChrono[i * 2] = chronoX
      positionsChrono[i * 2 + 1] = laneNorm * 2 * CHRONO_Y_HALF + chronoYShake

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

      const authorDisplay = bookAuthorDisplay(b, authorsMap)
      labels[i] = {
        author: (authorDisplay ?? '').toUpperCase(),
        title: b.title ?? '',
      }
    }

    const links = new Float32Array(rawEdges.length * 2)
    for (let i = 0; i < rawEdges.length; i++) {
      const sIdx = idToIndex.get(rawEdges[i].sourceId)
      const tIdx = idToIndex.get(rawEdges[i].targetId)
      if (sIdx === undefined || tIdx === undefined) continue
      links[i * 2] = sIdx
      links[i * 2 + 1] = tIdx
    }

    // Largeur par lien : baseline 1.5 (aligné sur linkDefaultWidth), +0.6 si
    // la paire dirigée (src,tgt) apparaît plus d'une fois — parité avec le
    // `isStrong` de Constellation (linkStyle.ts LINK_WIDTH.strongBonus).
    // On construit la Map de poids en une passe, puis on la relit pour fixer
    // la largeur de chaque edge (les doublons reçoivent tous le bonus).
    const pairWeights = new Map<string, number>()
    const pairKeys = new Array<string>(rawEdges.length)
    for (let i = 0; i < rawEdges.length; i++) {
      const k = `${rawEdges[i].sourceId}|${rawEdges[i].targetId}`
      pairKeys[i] = k
      pairWeights.set(k, (pairWeights.get(k) ?? 0) + 1)
    }
    const linkWidths = new Float32Array(rawEdges.length)
    const LINK_BASE_WIDTH = 1.5
    const LINK_STRONG_BONUS = 0.6
    for (let i = 0; i < rawEdges.length; i++) {
      const w = pairWeights.get(pairKeys[i]) ?? 1
      linkWidths[i] = w > 1 ? LINK_BASE_WIDTH + LINK_STRONG_BONUS : LINK_BASE_WIDTH
    }

    // Landmarks : top-N par degré (Galaxy utilise exactement le même critère).
    const byDegree = books
      .map((b, i) => ({ i, d: degreeByBookId.get(b.id) ?? 0 }))
      .filter((x) => x.d > 0)
      .sort((a, b) => b.d - a.d)
    const landmarks = byDegree.slice(0, TOP_LANDMARK_COUNT).map((x) => x.i)
    // Landmarks Catégories : trié par taille. En mode cluster, les liens
    // sont masqués → le degré n'est plus lisible, alors que la taille reste
    // une indication immédiate de l'importance du nœud à l'écran.
    const landmarksCategories = sizes.length === 0
      ? []
      : Array.from({ length: sizes.length }, (_, i) => i)
          .sort((a, b) => sizes[b] - sizes[a])
          .slice(0, TOP_LANDMARK_COUNT)
    // Indices trackés pour la mini-map — top-N par degré, capés. Ne tracker
    // que ces points évite de uploader 10k positions par frame (trop cher à
    // grande échelle) tout en gardant la silhouette du graphe lisible.
    const minimapIndices = byDegree.slice(0, MINIMAP_TOP_N).map((x) => x.i)

    return {
      books,
      idToIndex,
      flatPositions: positions,
      flatPositionsChrono: positionsChrono,
      flatColors: colors,
      flatSizes: sizes,
      flatLinks: links,
      flatLinkWidths: linkWidths,
      edgeCount: rawEdges.length,
      labelByIndex: labels,
      landmarkIndices: landmarks,
      landmarkIndicesCategories: landmarksCategories,
      minimapIndices,
      imageDataArray: imageDatas,
      flatImageIndices: imageIndices,
      flatImageSizes: imageSizes,
      glowHexByIndex: glowHex,
      citationsByBookId,
      clusterAssignments: clusters,
    }
  }, [graphData, authorsMap])
}

import { useRef, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import type { Book } from '@/types/domain'
import type { useAdjacencyIndex } from '@/features/graph/hooks/useAdjacencyIndex'
import { HOVER_RADIUS_BONUS } from './cosmographDrawing'

type AdjacencyIndex = ReturnType<typeof useAdjacencyIndex>
import {
  LINK_CITED_BY_FOCAL_RGBA, LINK_CITES_FOCAL_RGBA, LINK_DEFAULT_RGBA,
  LINK_DIM_RGBA, LINK_HIDDEN_RGBA, type LinkRgba,
} from './cosmographForces'

type FocalRefs = {
  graphRef: RefObject<Graph | null>
  flatSizesRef: MutableRefObject<Float32Array>
  booksRef: MutableRefObject<Book[]>
  idToIndexRef: MutableRefObject<Map<string, number>>
  linksByNodeIdRef: MutableRefObject<AdjacencyIndex>
  landmarkIndicesRef: MutableRefObject<number[]>
  minimapIndicesRef: MutableRefObject<number[]>
  flatLinksRef: MutableRefObject<Float32Array>
  edgeCountRef: MutableRefObject<number>
  liveSizesRef: MutableRefObject<Float32Array>
  liveLinkColorsRef: MutableRefObject<Float32Array>
  prevHoveredRef: MutableRefObject<number | null>
  hoveredIndexRef: MutableRefObject<number | null>
  selectedBookIdRef: MutableRefObject<string | null>
  peekBookIdRef: MutableRefObject<string | null>
  visibleIndexSetRef: MutableRefObject<Set<number> | null>
  flashNodeIdsRef: MutableRefObject<Set<string>>
}

export type ApplyFocalVisualStateRef = RefObject<() => void>

function writeLinkRgba(buf: Float32Array, i: number, rgba: LinkRgba): void {
  buf[i * 4] = rgba[0]
  buf[i * 4 + 1] = rgba[1]
  buf[i * 4 + 2] = rgba[2]
  buf[i * 4 + 3] = rgba[3]
}

// Focal brut : hover > sélection > peek. Utilisé pour le tracking des
// positions (le point reste tracké même s'il est hors-range timeline, pour
// que le glow réapparaisse sans lag quand on relâche le filtre).
function resolveFocalIndex(refs: Pick<FocalRefs,
  'hoveredIndexRef' | 'idToIndexRef' | 'selectedBookIdRef' | 'peekBookIdRef'
>): number | null {
  const hover = refs.hoveredIndexRef.current
  if (hover !== null) return hover
  const idToIdx = refs.idToIndexRef.current
  const selId = refs.selectedBookIdRef.current
  if (selId) {
    const idx = idToIdx.get(selId)
    if (idx !== undefined) return idx
  }
  const peekId = refs.peekBookIdRef.current
  if (peekId) {
    const idx = idToIdx.get(peekId)
    if (idx !== undefined) return idx
  }
  return null
}

// Focal visible : si le focal brut est hors du visibleIndexSet (filtres +
// timeline), on le traite comme absent pour le *styling* (size, link colors,
// sélection, overlay). Évite une race où la timeline avance et laisse un
// glow accroché à un nœud désormais greyed-out.
export function resolveVisibleFocal(refs: Pick<FocalRefs,
  'hoveredIndexRef' | 'idToIndexRef' | 'selectedBookIdRef' | 'peekBookIdRef' | 'visibleIndexSetRef'
>): number | null {
  const focal = resolveFocalIndex(refs)
  if (focal === null) return null
  const visible = refs.visibleIndexSetRef.current
  if (visible !== null && !visible.has(focal)) return null
  return focal
}

// Patch le buffer sizes uploadé à cosmos.gl pour le hover — bump du radius
// du focal, restore du précédent.
function applyFocalSize(refs: FocalRefs, next: number | null): void {
  const g = refs.graphRef.current
  if (!g) return
  const sizes = refs.flatSizesRef.current
  const live = refs.liveSizesRef.current
  const prev = refs.prevHoveredRef.current
  if (prev !== null && prev !== next && prev < sizes.length) {
    live[prev] = sizes[prev]
  }
  if (next !== null && next < sizes.length) {
    live[next] = sizes[next] + HOVER_RADIUS_BONUS
  }
  refs.prevHoveredRef.current = next
  g.setPointSizes(live)
}

// Repeint les liens en fonction du focal et de la visibilité courante.
// Baseline = tous LINK_DEFAULT. Au hover, outgoing/incoming remontent et
// les autres s'atténuent. Si visibleIndexSet est non-null, on masque
// (alpha 0) tout lien dont au moins une extrémité est hors-sélection.
function applyFocalLinkColors(refs: FocalRefs, focalIndex: number | null): void {
  const g = refs.graphRef.current
  if (!g) return
  const links = refs.flatLinksRef.current
  const N = refs.edgeCountRef.current
  const buf = refs.liveLinkColorsRef.current
  if (buf.length < N * 4) return
  const visible = refs.visibleIndexSetRef.current

  for (let i = 0; i < N; i++) {
    const src = links[i * 2]
    const tgt = links[i * 2 + 1]
    if (visible !== null && (!visible.has(src) || !visible.has(tgt))) {
      writeLinkRgba(buf, i, LINK_HIDDEN_RGBA)
      continue
    }
    if (focalIndex === null) writeLinkRgba(buf, i, LINK_DEFAULT_RGBA)
    else if (src === focalIndex) writeLinkRgba(buf, i, LINK_CITES_FOCAL_RGBA)
    else if (tgt === focalIndex) writeLinkRgba(buf, i, LINK_CITED_BY_FOCAL_RGBA)
    else writeLinkRgba(buf, i, LINK_DIM_RGBA)
  }
  g.setLinkColors(buf)
}

// Source unique de vérité pour les positions trackées : landmarks (labels
// permanents) + minimap (top-N par degré, silhouette) + focal (glow/label)
// + flash (anneau d'import). Tout consommateur lit via
// getTrackedPointPositionsMap() — aucun autre endroit ne doit appeler
// trackPointPositionsByIndices, sous peine d'écraser la sélection.
function syncTrackedPositionsForFocal(refs: FocalRefs, focal: number | null): void {
  const g = refs.graphRef.current
  if (!g) return
  const set = new Set<number>(refs.landmarkIndicesRef.current)
  for (const i of refs.minimapIndicesRef.current) set.add(i)
  if (focal !== null) set.add(focal)
  const idToIdx = refs.idToIndexRef.current
  for (const id of refs.flashNodeIdsRef.current) {
    const i = idToIdx.get(id)
    if (i !== undefined) set.add(i)
  }
  g.trackPointPositionsByIndices(Array.from(set))
}

function restoreFilterSelection(refs: FocalRefs): void {
  const g = refs.graphRef.current
  if (!g) return
  const visible = refs.visibleIndexSetRef.current
  if (visible === null) g.unselectPoints()
  else g.selectPointsByIndices(Array.from(visible))
}

function applyFocalStyling(refs: FocalRefs): void {
  const g = refs.graphRef.current
  if (!g) return
  // Pour le styling (size, link colors, selection), on utilise le focal
  // *visible* : s'il est hors-range timeline/filtre, on rend la scène
  // comme s'il n'y avait pas de focal. Le tracking, lui, garde le focal
  // brut pour ne pas casser la réapparition du glow au relâchement.
  const rawFocal = resolveFocalIndex(refs)
  const visible = refs.visibleIndexSetRef.current
  const visibleFocal = rawFocal !== null && (visible === null || visible.has(rawFocal))
    ? rawFocal
    : null

  applyFocalSize(refs, visibleFocal)
  applyFocalLinkColors(refs, visibleFocal)

  if (visibleFocal !== null) {
    const book = refs.booksRef.current[visibleFocal]
    if (!book) {
      restoreFilterSelection(refs)
      syncTrackedPositionsForFocal(refs, rawFocal)
      return
    }
    const adj = refs.linksByNodeIdRef.current.get(book.id)
    const set = new Set<number>()
    set.add(visibleFocal)
    if (adj) {
      const idToIdx = refs.idToIndexRef.current
      for (const nid of adj.neighborIds) {
        const i = idToIdx.get(nid)
        if (i !== undefined) set.add(i)
      }
    }
    const arr = visible === null
      ? Array.from(set)
      : Array.from(set).filter((i) => visible.has(i))
    g.selectPointsByIndices(arr)
  } else {
    restoreFilterSelection(refs)
  }

  syncTrackedPositionsForFocal(refs, rawFocal)
}

/**
 * État focal unifié du graphe cosmos.gl. Synchronise taille du point focal,
 * couleurs des liens (outgoing cyan / incoming jaune / autres dim) et
 * sélection (focal + voisin·es pour pointGreyoutOpacity). Retourne une ref
 * vers la fonction d'application — les effets peuvent l'appeler sans déclarer
 * de deps (toutes les lectures passent par refs).
 */
export function useCosmographFocalState(input: FocalRefs): ApplyFocalVisualStateRef {
  const applyRef = useRef<() => void>(() => {})
  applyRef.current = () => applyFocalStyling(input)
  return applyRef
}

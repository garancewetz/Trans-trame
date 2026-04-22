import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import type { CosmographBuffers } from './useCosmographBuffers'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'
import type { CosmographMode } from './useCosmographLayoutEffect'

type Args = {
  graphRef: RefObject<Graph | null>
  mode: CosmographMode
  buffers: CosmographBuffers
  liveLinkColorsRef: MutableRefObject<Float32Array>
  applyFocalRef: ApplyFocalVisualStateRef
}

/**
 * Upload des buffers au GPU quand le dataset change. Split en deux effets
 * pour éviter de re-uploader la géométrie (positions/colors/sizes/images)
 * à chaque toggle de mode : le mode ne touche qu'aux liens, la géométrie
 * ne doit pas passer par le GPU pour rien.
 *
 * Les refs miroir ont déjà été mises à jour par useCosmographDataRefs, donc
 * les callbacks du Graph liront les bonnes valeurs. En mode Catégories, les
 * liens sont masqués (buffer vide → force de lien neutralisée par cosmos.gl).
 */
export function useCosmographDataSync({
  graphRef, mode, buffers, liveLinkColorsRef, applyFocalRef,
}: Args): void {
  const {
    books, flatPositions, flatColors, flatSizes, flatLinks, flatLinkWidths,
    imageDataArray, flatImageIndices, flatImageSizes,
  } = buffers

  // Géométrie : positions, couleurs, tailles, images. Ne change que quand
  // graphData/authorsMap change (→ useCosmographBuffers rebuild). Indépendant
  // du mode — un toggle Transmissions ↔ Catégories ne doit pas re-binder les
  // buffers GPU des points.
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    if (books.length === 0) {
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
    applyFocalRef.current()
    g.render()
  }, [
    graphRef, books.length, flatPositions, flatColors, flatSizes,
    imageDataArray, flatImageIndices, flatImageSizes, applyFocalRef,
  ])

  // Liens : se met à jour soit quand le dataset change, soit sur toggle de
  // mode. En Catégories, on pousse un Float32Array vide (cosmos.gl désactive
  // la force linkSpring derrière — pas de fantômes).
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    if (books.length === 0) {
      g.setLinks(new Float32Array(0))
      g.render()
      return
    }
    if (mode === 'categories') {
      g.setLinks(new Float32Array(0))
    } else {
      g.setLinks(flatLinks)
      g.setLinkColors(liveLinkColorsRef.current)
      // Largeurs pondérées : les paires dirigées apparaissant plusieurs fois
      // (citations multiples A→B) sont plus épaisses — parité avec `isStrong`
      // de Constellation.
      g.setLinkWidths(flatLinkWidths)
    }
    applyFocalRef.current()
    g.render()
  }, [
    graphRef, mode, books.length, flatLinks, flatLinkWidths,
    liveLinkColorsRef, applyFocalRef,
  ])
}

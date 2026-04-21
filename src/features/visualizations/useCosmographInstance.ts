import { useEffect, type MutableRefObject, type RefObject } from 'react'
import { Graph } from '@cosmos.gl/graph'
import type { Book } from '@/types/domain'
import { syncOverlayCanvasSize } from './useCosmographOverlay'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'
import { RANDOM_SEED } from './cosmographRng'
import { FORCES_FREE, LINK_DEFAULT_RGBA } from './cosmographForces'
import type { CamState } from './cosmographCamera'

type Args = {
  containerRef: RefObject<HTMLDivElement | null>
  labelCanvasRef: RefObject<HTMLCanvasElement | null>
  graphRef: MutableRefObject<Graph | null>
  hoveredIndexRef: MutableRefObject<number | null>
  draggingRef: MutableRefObject<boolean>
  onNodeClickRef: MutableRefObject<((node: Book) => void) | undefined>
  booksRef: MutableRefObject<Book[]>
  applyFocalRef: ApplyFocalVisualStateRef
  drawOverlay: () => void
  initialCamRef: MutableRefObject<CamState | null>
  writeCamToUrl: (cam: CamState) => void
  // Callback one-shot attaché sur `onSimulationEnd`. Le cluster effect s'en
  // sert pour fermer le loading mask dès que la simu converge, au lieu d'un
  // setTimeout hardcodé qui sur-estime ou sous-estime la durée réelle.
  onSimulationEndExtraRef: MutableRefObject<(() => void) | null>
}

/**
 * Crée l'instance cosmos.gl une fois, attache les listeners du Graph
 * (pointer, drag, simulation, zoom) et gère le resize du canvas overlay +
 * la restauration de la caméra persistée dans l'URL. Tout est lu via refs
 * pour que les handlers restent valides sans recréer le Graph.
 */
export function useCosmographInstance({
  containerRef, labelCanvasRef, graphRef, hoveredIndexRef, draggingRef,
  onNodeClickRef, booksRef, applyFocalRef, drawOverlay, initialCamRef,
  writeCamToUrl, onSimulationEndExtraRef,
}: Args): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const labelCanvas = labelCanvasRef.current
    const syncCanvas = () => {
      if (labelCanvas) syncOverlayCanvasSize(labelCanvas, container)
    }
    syncCanvas()
    const onResize = () => {
      syncCanvas()
      drawOverlay()
    }
    window.addEventListener('resize', onResize)

    let camRestoreApplied = false
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

    // Même background que Constellation — lu depuis la CSS var pour rester
    // en phase avec le thème (--color-bg-base = #06030f).
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg-base')
      .trim() || '#06030f'

    const graph = new Graph(container, {
      backgroundColor: bg,
      // Seed init-only : rend la simulation cosmos.gl déterministe entre reloads.
      randomSeed: RANDOM_SEED,
      // Baseline très dim — les liens sont à l'arrière-plan sauf au hover.
      linkDefaultColor: [...LINK_DEFAULT_RGBA],
      linkDefaultWidth: 1.5,
      // Cosmos calcule `arrowWidth = linkWidth × 2 × linkArrowsSizeScale` et
      // la pointe = max(0, arrowWidth - linkWidth). Avec linkWidth=1.5, un
      // scale de 1.2 donne une pointe ~2px lisible sans surcharger le graphe
      // au repos. `scaleLinksOnZoom=false` (défaut) → flèches stables en px écran.
      linkDefaultArrows: true,
      linkArrowsSizeScale: 1.2,
      // cosmos.gl fade les liens longs. On laisse un floor bas (0.3) pour
      // que les longs liens s'effacent vraiment et ne surchargent pas le graphe.
      linkVisibilityDistanceRange: [50, 2000],
      linkVisibilityMinTransparency: 0.3,
      curvedLinks: true,
      pointSizeScale: 0.8,
      scalePointsOnZoom: true,
      renderHoveredPointRing: true,
      hoveredPointRingColor: '#ece9ff',
      pointGreyoutOpacity: 0.12,
      spaceSize: 8192,
      simulationRepulsionTheta: 1.15,
      simulationDecay: 6000,
      // FORCES_FREE porte friction + gravity + répulsion/linkSpring/linkDistance/
      // center/cluster. Le mode Catégories bascule vers FORCES_CLUSTER via
      // setConfigPartial dans le cluster effect.
      ...FORCES_FREE,
      // Pas d'auto-fit : cosmos refit les positions après simulation, ce qui
      // dézoome sous les yeux de l'utilisateur·ice. `rescalePositions: true`
      // donne déjà un cadrage initial correct à t=0 ; si une caméra est
      // persistée dans l'URL, tryRestoreCamFromUrl l'applique.
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
        applyFocalRef.current()
        g.render()
        drawOverlay()
      },
      onPointMouseOut: () => {
        // Pendant un drag, le curseur peut déraper hors du nœud ; on
        // verrouille le hover pour que le highlight reste sur le nœud tiré.
        if (draggingRef.current) return
        hoveredIndexRef.current = null
        applyFocalRef.current()
        graphRef.current?.render()
        drawOverlay()
      },
      onDragStart: () => {
        draggingRef.current = true
      },
      onDrag: () => {
        // Réchauffe la simu pour que les voisins suivent le nœud tiré.
        graphRef.current?.start(0.3)
      },
      onDragEnd: () => {
        draggingRef.current = false
      },
      onSimulationTick: () => {
        if (!camRestoreApplied) tryRestoreCamFromUrl()
        drawOverlay()
      },
      onSimulationEnd: () => {
        tryRestoreCamFromUrl()
        drawOverlay()
        const extra = onSimulationEndExtraRef.current
        if (extra) {
          // One-shot : on nettoie avant pour éviter qu'un handler qui
          // redémarre la simu ne se ré-appelle en boucle.
          onSimulationEndExtraRef.current = null
          extra()
        }
      },
      onZoom: (_e, userDriven) => {
        drawOverlay()
        // Ne persiste que les changements initiés par l'utilisateur·ice —
        // évite une boucle quand on restaure depuis l'URL ou que cosmos.gl
        // fait un fitView automatique.
        if (!userDriven) return
        const g = graphRef.current
        if (!g) return
        const w = container.clientWidth
        const h = container.clientHeight
        const [cx, cy] = g.screenToSpacePosition([w / 2, h / 2])
        writeCamToUrl({ x: cx, y: cy, zoom: g.getZoomLevel() })
      },
    })
    graphRef.current = graph
    applyFocalRef.current()

    return () => {
      window.removeEventListener('resize', onResize)
      graph.destroy()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init-once; callbacks read latest via refs
  }, [])
}

import { useEffect, type MutableRefObject, type RefObject } from 'react'
import { Graph } from '@cosmos.gl/graph'
import type { Book } from '@/types/domain'
import { syncOverlayCanvasSize } from './useCosmographOverlay'
import type { ApplyFocalVisualStateRef } from './useCosmographFocalState'
import { RANDOM_SEED } from './cosmographRng'
import { FORCES_FREE, LINK_DEFAULT_RGBA } from './cosmographForces'
import type { CosmographMode } from './useCosmographLayoutEffect'
import { CLICK_MOVE_THRESHOLD_PX, HOVER_TOLERANCE_PX } from './cosmographDrawing'

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
  // Callback one-shot attaché sur `onSimulationEnd`. Le cluster effect s'en
  // sert pour fermer le loading mask dès que la simu converge, au lieu d'un
  // setTimeout hardcodé qui sur-estime ou sous-estime la durée réelle.
  onSimulationEndExtraRef: MutableRefObject<(() => void) | null>
  // Mode courant lu depuis onDrag : en Chronologique, le nœud tiré doit suivre
  // le curseur (cosmos le gère nativement via enableDrag) mais on n'appelle
  // PAS `start()` — sinon la simulation reprend et la répulsion de
  // FORCES_FROZEN fait dériver les voisins hors de leur colonne année.
  modeRef: MutableRefObject<CosmographMode>
  // Set des index visibles après filtres + timeline. Utilisé par le pick en
  // tolérance pour ne pas « accrocher » un nœud greyed-out que l'utilisateur·ice
  // ne peut pas voir à l'écran.
  visibleIndexSetRef: MutableRefObject<Set<number> | null>
}

/**
 * Crée l'instance cosmos.gl une fois, attache les listeners du Graph
 * (pointer, drag, simulation, zoom) et gère le resize du canvas overlay.
 * Tout est lu via refs pour que les handlers restent valides sans recréer le
 * Graph.
 */
export function useCosmographInstance({
  containerRef, labelCanvasRef, graphRef, hoveredIndexRef, draggingRef,
  onNodeClickRef, booksRef, applyFocalRef, drawOverlay,
  onSimulationEndExtraRef, modeRef, visibleIndexSetRef,
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

    // Curseur contextuel : `grab` par défaut (le canvas est pannable), `pointer`
    // sur un nœud cliquable, `grabbing` pendant un drag. Cosmos.gl n'expose
    // pas d'API cursor — on pilote le DOM à la main depuis les handlers
    // ci-dessous.
    container.style.cursor = 'grab'

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
      linkDefaultWidth: 2.2,
      // Multiplicateur global appliqué par-dessus les couleurs par-lien.
      // < 1 = tous les liens atténués uniformément → moins de bruit visuel
      // quand on dézoome (zoom out rend les liens plus courts à l'écran, donc
      // plus opaques via linkVisibilityDistanceRange, d'où la saturation).
      linkOpacity: 0.44,
      // Cosmos calcule `arrowWidth = linkWidth × 2 × linkArrowsSizeScale` et
      // la pointe = max(0, arrowWidth - linkWidth). `scaleLinksOnZoom=false`
      // (défaut) → flèches stables en px écran.
      linkDefaultArrows: true,
      linkArrowsSizeScale: 1.2,
      // cosmos.gl fade les liens selon leur longueur écran.
      linkVisibilityDistanceRange: [50, 2000],
      linkVisibilityMinTransparency: 0.36,
      curvedLinks: true,
      pointSizeScale: 0.8,
      scalePointsOnZoom: true,
      // Anneau natif désactivé : on pilote nous-mêmes la détection en
      // tolérance via pointermove (voir plus bas) et on redessine le ring
      // dans l'overlay. Laisser cosmos gérer créerait deux sources de vérité
      // qui divergent sur les hovers tolérants.
      renderHoveredPointRing: false,
      pointGreyoutOpacity: 0.12,
      spaceSize: 8192,
      simulationRepulsionTheta: 1.15,
      // Refroidissement lent : les forces ont besoin de temps pour amener les
      // nœuds à leur position cible (surtout en mode Catégories où la cluster
      // force doit aspirer chaque nœud vers son centroïde). Baisser cette
      // valeur coupe la simu avant que le layout tuné s'établisse.
      simulationDecay: 6000,
      // FORCES_FREE porte friction + gravity + répulsion/linkSpring/linkDistance/
      // center/cluster. Le mode Catégories bascule vers FORCES_CLUSTER via
      // setConfigPartial dans le cluster effect.
      ...FORCES_FREE,
      // Pas d'auto-fit : cosmos refit les positions après simulation, ce qui
      // dézoome sous les yeux de l'utilisateur·ice. `rescalePositions: true`
      // donne déjà un cadrage initial correct à t=0.
      fitViewOnInit: false,
      fitViewPadding: 0.2,
      rescalePositions: true,
      enableDrag: true,
      showFPSMonitor: false,
      // NB : onPointClick / onPointMouseOver / onPointMouseOut sont
      // intentionnellement absents — la détection du hover et du clic se fait
      // côté container avec une tolérance de HOVER_TOLERANCE_PX pour ne pas
      // obliger l'utilisateur·ice à viser au pixel près les petits points.
      // Voir le bloc `pointermove` / `click` plus bas.
      onDragStart: () => {
        draggingRef.current = true
        container.style.cursor = 'grabbing'
      },
      onDrag: () => {
        // En Chronologique, le nœud tiré suit le curseur (cosmos.gl l'impose
        // via enableDrag) mais on ne relance PAS la simulation — sinon la
        // répulsion de FORCES_FROZEN éjecterait les voisins hors de leur
        // colonne année. Les positions du reste du graphe restent figées.
        if (modeRef.current === 'chronological') return
        // Réchauffe la simu pour que les voisins suivent le nœud tiré.
        graphRef.current?.start(0.3)
      },
      onDragEnd: () => {
        draggingRef.current = false
        // Après drag : curseur selon l'élément courant sous le pointeur.
        container.style.cursor = hoveredIndexRef.current !== null ? 'pointer' : 'grab'
      },
      onSimulationTick: drawOverlay,
      onSimulationEnd: () => {
        drawOverlay()
        const extra = onSimulationEndExtraRef.current
        if (extra) {
          // One-shot : on nettoie avant pour éviter qu'un handler qui
          // redémarre la simu ne se ré-appelle en boucle.
          onSimulationEndExtraRef.current = null
          extra()
        }
      },
      onZoom: drawOverlay,
    })
    graphRef.current = graph
    applyFocalRef.current()

    // ── Hover / click en tolérance ──────────────────────────────────────
    // Cosmos.gl n'expose pas de `interactionRadius` public : son pick
    // interne (renderHoveredPointRing + onPointMouseOver) teste uniquement
    // le disque réel du point, ce qui est pénible sur les nœuds de 2–4 px à
    // bas zoom. On prend la main sur le container : pointermove dessine un
    // carré de HOVER_TOLERANCE_PX autour du curseur, on y cherche les
    // candidats via `getPointsInRect` (GPU picking côté cosmos) et on
    // garde le plus proche en distance écran. Le hovered index est notre
    // source de vérité unique (applyFocalRef + drawOverlay la lisent).
    //
    // Le click est repris en parallèle : pointerdown mémorise la position,
    // le click n'est validé que si le curseur a bougé < CLICK_MOVE_THRESHOLD
    // — évite qu'un pan (mousedown + déplacement sur zone vide) ne
    // déclenche onNodeClick parce que le hovered est resté verrouillé.
    let rafQueued = false
    let lastEvent: PointerEvent | null = null
    const pickNearest = (ev: PointerEvent): number | null => {
      const g = graphRef.current
      if (!g) return null
      const rect = container.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const T = HOVER_TOLERANCE_PX
      // cosmos.gl lit les candidats via un readPixels sur son picking FBO.
      // Avant le premier tick / après un context-loss ou resize, la texture
      // peut être `undefined` et luma.gl jette. On laisse passer la frame :
      // le prochain pointermove retentera une fois le FBO rétabli.
      let candidates: ReturnType<typeof g.getPointsInRect> | undefined
      try {
        candidates = g.getPointsInRect([[x - T, y - T], [x + T, y + T]])
      } catch {
        return null
      }
      if (!candidates || candidates.length === 0) return null
      const visible = visibleIndexSetRef.current
      const passes = (idx: number): boolean => visible === null || visible.has(idx)
      // Cas commun (rect 28×28 px) : 0 ou 1 candidat. Pas besoin de
      // rechercher le plus proche, ni d'allouer le tableau de positions.
      if (candidates.length === 1) {
        const idx = candidates[0]
        return passes(idx) ? idx : null
      }
      // Rare (cluster dense) : plusieurs points dans la tolérance — on
      // prend le plus proche en distance écran. `getPointPositions()` alloue
      // un number[] mais c'est payé uniquement dans ce cas.
      const positions = g.getPointPositions()
      let best: number | null = null
      let bestD2 = Infinity
      for (let k = 0; k < candidates.length; k++) {
        const idx = candidates[k]
        if (!passes(idx)) continue
        const px = positions[idx * 2]
        const py = positions[idx * 2 + 1]
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue
        const [sx, sy] = g.spaceToScreenPosition([px, py])
        const dx = sx - x
        const dy = sy - y
        const d2 = dx * dx + dy * dy
        if (d2 < bestD2) {
          bestD2 = d2
          best = idx
        }
      }
      return best
    }
    const processMove = () => {
      rafQueued = false
      const ev = lastEvent
      lastEvent = null
      if (!ev) return
      if (draggingRef.current) return
      const next = pickNearest(ev)
      const prev = hoveredIndexRef.current
      if (next === prev) return
      hoveredIndexRef.current = next
      container.style.cursor = next !== null ? 'pointer' : 'grab'
      applyFocalRef.current()
      graphRef.current?.render()
      drawOverlay()
    }
    const onPointerMove = (ev: PointerEvent): void => {
      lastEvent = ev
      if (rafQueued) return
      rafQueued = true
      requestAnimationFrame(processMove)
    }
    const onPointerLeave = (): void => {
      lastEvent = null
      if (draggingRef.current) return
      if (hoveredIndexRef.current === null) return
      hoveredIndexRef.current = null
      container.style.cursor = 'grab'
      applyFocalRef.current()
      graphRef.current?.render()
      drawOverlay()
    }
    let downX = 0
    let downY = 0
    const onPointerDown = (ev: PointerEvent): void => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onClick = (ev: MouseEvent): void => {
      const dx = ev.clientX - downX
      const dy = ev.clientY - downY
      if (dx * dx + dy * dy > CLICK_MOVE_THRESHOLD_PX * CLICK_MOVE_THRESHOLD_PX) return
      const idx = hoveredIndexRef.current
      if (idx === null) return
      const book = booksRef.current[idx]
      if (book && onNodeClickRef.current) onNodeClickRef.current(book)
    }
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('resize', onResize)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('click', onClick)
      graph.destroy()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init-once; callbacks read latest via refs
  }, [])
}

import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import { FORCES_CLUSTER, FORCES_FREE, FORCES_FROZEN } from './cosmographForces'
import { CLUSTER_RING } from './useCosmographBuffers'

export type CosmographMode = 'free' | 'categories' | 'chronological'

type Args = {
  graphRef: RefObject<Graph | null>
  mode: CosmographMode
  clusterAssignments: (number | undefined)[]
  flatPositionsChrono: Float32Array
  prevModeRef: MutableRefObject<CosmographMode>
  drawOverlay: () => void
  onSimulationEndExtraRef: MutableRefObject<(() => void) | null>
}

/**
 * Pilote la configuration de simulation cosmos.gl selon le mode :
 *   - free           → FORCES_FREE, simulation active, clusters libérés.
 *   - categories     → FORCES_CLUSTER + setPointClusters, auto-fit après convergence.
 *   - chronological  → positions fixes (X ∝ année), FORCES_FROZEN, simulation en pause.
 *
 * Les clusters se forment à ±2500 dans l'espace cosmos — sans fitView, ils
 * atterrissent hors du cadre initial. Idem pour la bande chronologique qui
 * s'étend ~5000 unités : un fit après switch garantit que tout soit lisible.
 */
export function useCosmographLayoutEffect({
  graphRef, mode, clusterAssignments, flatPositionsChrono, prevModeRef,
  drawOverlay, onSimulationEndExtraRef,
}: Args): void {
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    const N = clusterAssignments.length
    if (N === 0) return

    const prevMode = prevModeRef.current
    const didToggle = prevMode !== mode
    prevModeRef.current = mode

    if (mode === 'categories') {
      // Auto-placement cosmos : positions undefined → chaque cluster est placé
      // à son centermass et la gravité de FORCES_CLUSTER les aspire autour de
      // l'origine.
      const autoPositions: (number | undefined)[] = new Array((CLUSTER_RING.length + 1) * 2).fill(undefined)
      g.setPointClusters(clusterAssignments)
      g.setClusterPositions(autoPositions)
      g.setConfigPartial(FORCES_CLUSTER)
      g.unpause()
    } else if (mode === 'chronological') {
      // Positions imposées : X ∝ année, bande "inconnu" à droite. Le drag
      // reste activé (l'utilisateur·ice peut déplacer un nœud pour inspecter),
      // mais `onDrag` dans useCosmographInstance détecte ce mode et skip le
      // `start()` : les voisins ne dérivent pas sous la répulsion résiduelle
      // de FORCES_FROZEN.
      const freed: (number | undefined)[] = new Array(N).fill(undefined)
      g.setPointClusters(freed)
      g.setClusterPositions([])
      g.setPointPositions(flatPositionsChrono)
      g.setConfigPartial(FORCES_FROZEN)
    } else {
      const freed: (number | undefined)[] = new Array(N).fill(undefined)
      g.setPointClusters(freed)
      g.setClusterPositions([])
      g.setConfigPartial(FORCES_FREE)
      g.unpause()
    }
    // render() déclenche graph.update() → propage inputPointClusters vers
    // pointClusters (lu par la force cluster dans runSimulationStep). Sans ce
    // render, start() relance bien la simu mais la condition `pointClusters ||
    // clusterPositions` reste falsy et aucune force de regroupement n'est
    // exécutée — le nuage se repousse sans se structurer tant qu'un drag n'a
    // pas forcé le chemin de mise à jour interne de cosmos.gl.
    g.render()

    if (mode === 'chronological') {
      // Fige la simulation : les positions sont la vérité, pas la force.
      // pause() bloque runSimulationStep → aucune dérive, aucun coût GPU pour
      // une simu qui tournerait pour rien.
      g.pause()
    } else {
      g.start(1)
    }
    drawOverlay()

    // Auto-fit après switch vers un mode à layout très différent :
    //   - categories : clusters à ±2500, hors du cadre libre.
    //   - chronological : bande s'étendant sur ~5000 unités horizontales.
    // Skip au montage initial et quand seules les données changent.
    if (!didToggle) return
    const shouldFit = mode === 'categories' || mode === 'chronological'
    if (!shouldFit) return

    if (mode === 'chronological') {
      // Simulation en pause → onSimulationEnd ne sera jamais appelé.
      // fitView immédiat (les positions sont déjà fixes, pas besoin d'attendre).
      graphRef.current?.fitView(800, 0.15, false)
      return
    }

    const fitOnEnd = () => {
      graphRef.current?.fitView(800, 0.15, false)
    }
    onSimulationEndExtraRef.current = fitOnEnd
    return () => {
      if (onSimulationEndExtraRef.current === fitOnEnd) {
        onSimulationEndExtraRef.current = null
      }
    }
  }, [mode, clusterAssignments, flatPositionsChrono, graphRef, prevModeRef, drawOverlay, onSimulationEndExtraRef])
}

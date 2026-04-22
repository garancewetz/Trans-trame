import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import { FORCES_CLUSTER, FORCES_FREE, FORCES_FROZEN } from './cosmographForces'
import { UNCATEGORIZED_CLUSTER_INDEX, type SubClusterInfo } from './useCosmographBuffers'

// Rayon sur lequel on dispose les sous-clusters (philosophy, literature,
// art…) autour de l'origine. Assez petit pour qu'ils forment une
// constellation compacte lisible comme "Autres disciplines", mais suffisant
// pour que chaque pool reste distinct de son voisin. Ajustable si
// nécessaire.
const SUB_CLUSTER_ORBIT_RADIUS = 220

export type CosmographMode = 'free' | 'categories' | 'chronological'

type Args = {
  graphRef: RefObject<Graph | null>
  mode: CosmographMode
  clusterAssignments: (number | undefined)[]
  flatPositionsChrono: Float32Array
  subClusters: SubClusterInfo[]
  totalClusterCount: number
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
  graphRef, mode, clusterAssignments, flatPositionsChrono,
  subClusters, totalClusterCount, prevModeRef,
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
      // Ring (10) : auto-placé (undefined) → se répartit en cercle autour
      // de l'origine sous les forces. UNCATEGORIZED : fixé à l'origine.
      // Sous-clusters (philo, litt, art…) : fixés en petit cercle autour
      // de l'origine — chaque pool est distinct mais tous restent visible-
      // ment dans la zone "Autres disciplines".
      const positions: (number | undefined)[] = new Array(totalClusterCount * 2).fill(undefined)
      positions[UNCATEGORIZED_CLUSTER_INDEX * 2] = 0
      positions[UNCATEGORIZED_CLUSTER_INDEX * 2 + 1] = 0
      const n = subClusters.length
      for (let i = 0; i < n; i++) {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2
        const idx = subClusters[i].clusterIdx
        positions[idx * 2] = Math.cos(angle) * SUB_CLUSTER_ORBIT_RADIUS
        positions[idx * 2 + 1] = Math.sin(angle) * SUB_CLUSTER_ORBIT_RADIUS
      }
      g.setPointClusters(clusterAssignments)
      g.setClusterPositions(positions)
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
  }, [mode, clusterAssignments, flatPositionsChrono, subClusters, totalClusterCount, graphRef, prevModeRef, drawOverlay, onSimulationEndExtraRef])
}

import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import { FORCES_CLUSTER, FORCES_FREE } from './cosmographForces'
import { CLUSTER_RING } from './useCosmographBuffers'

type Args = {
  graphRef: RefObject<Graph | null>
  clusterByAxis: boolean
  clusterAssignments: (number | undefined)[]
  prevClusterByAxisRef: MutableRefObject<boolean>
  drawOverlay: () => void
  onSimulationEndExtraRef: MutableRefObject<(() => void) | null>
}

/**
 * Bascule le profil de forces cosmos.gl selon le mode (free/categories) et
 * déclenche l'auto-fit après convergence. Les clusters se forment à ±2500
 * dans l'espace cosmos — sans fitView, ils atterrissent hors du cadre
 * initial. La transition libre → cluster est maintenant visible (pas de
 * voile de chargement) : avec simulationDecay bas, elle dure ~1 s et donne
 * un bon feedback visuel sur la réorganisation.
 */
export function useCosmographClusterEffect({
  graphRef, clusterByAxis, clusterAssignments, prevClusterByAxisRef, drawOverlay,
  onSimulationEndExtraRef,
}: Args): void {
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    const N = clusterAssignments.length
    if (N === 0) return

    if (clusterByAxis) {
      // Auto-placement cosmos : positions undefined → chaque cluster est placé
      // à son centermass et la gravité de FORCES_CLUSTER les aspire autour de
      // l'origine.
      const autoPositions: (number | undefined)[] = new Array((CLUSTER_RING.length + 1) * 2).fill(undefined)
      g.setPointClusters(clusterAssignments)
      g.setClusterPositions(autoPositions)
      g.setConfigPartial(FORCES_CLUSTER)
    } else {
      const freed: (number | undefined)[] = new Array(N).fill(undefined)
      g.setPointClusters(freed)
      g.setClusterPositions([])
      g.setConfigPartial(FORCES_FREE)
    }
    // render() déclenche graph.update() → propage inputPointClusters vers
    // pointClusters (lu par la force cluster dans runSimulationStep). Sans ce
    // render, start() relance bien la simu mais la condition `pointClusters ||
    // clusterPositions` reste falsy et aucune force de regroupement n'est
    // exécutée — le nuage se repousse sans se structurer tant qu'un drag n'a
    // pas forcé le chemin de mise à jour interne de cosmos.gl.
    g.render()
    g.start(1)
    drawOverlay()

    // Auto-fit uniquement sur toggle réel vers Catégories : skip au montage
    // initial et sur recalc de clusterAssignments (évite un dézoom non
    // sollicité à chaque changement de dataset).
    const didToggle = prevClusterByAxisRef.current !== clusterByAxis
    prevClusterByAxisRef.current = clusterByAxis
    if (!clusterByAxis || !didToggle) return

    const fitOnEnd = () => {
      graphRef.current?.fitView(800, 0.15, false)
    }
    onSimulationEndExtraRef.current = fitOnEnd
    return () => {
      if (onSimulationEndExtraRef.current === fitOnEnd) {
        onSimulationEndExtraRef.current = null
      }
    }
  }, [clusterByAxis, clusterAssignments, graphRef, prevClusterByAxisRef, drawOverlay, onSimulationEndExtraRef])
}

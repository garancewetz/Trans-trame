import { useEffect, useState, type MutableRefObject, type RefObject } from 'react'
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

// Plafond de sécurité : si onSimulationEnd ne tire pas (dataset trivialement
// stable, bug cosmos), on referme quand même le mask. Doublé de l'ancien
// timeout 3 s pour couvrir les convergences lentes (datasets denses).
const CLUSTER_LOADING_FALLBACK_MS = 6000

/**
 * Bascule le profil de forces cosmos.gl selon le mode (free/categories) et
 * déclenche l'auto-fit après convergence. Masque la vue pendant que les
 * clusters se forment pour éviter l'effet "glissade" sur toggle. Se ferme
 * sur `onSimulationEnd` (via ref partagée) — plus de setTimeout hardcodé
 * qui se plantait quand la simu était plus lente/rapide que prévu.
 */
export function useCosmographClusterEffect({
  graphRef, clusterByAxis, clusterAssignments, prevClusterByAxisRef, drawOverlay,
  onSimulationEndExtraRef,
}: Args): { categoriesLoading: boolean } {
  const [categoriesLoading, setCategoriesLoading] = useState(clusterByAxis)

  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    const N = clusterAssignments.length
    if (N === 0) return

    if (clusterByAxis) {
      // Auto-placement cosmos : positions undefined → chaque cluster est placé
      // à son centermass et la gravité élevée de FORCES_CLUSTER les aspire
      // autour de l'origine → "honeycomb". Les labels suivent via
      // getClusterPositions().
      const autoPositions: (number | undefined)[] = new Array((CLUSTER_RING.length + 1) * 2).fill(undefined)
      g.setPointClusters(clusterAssignments)
      g.setClusterPositions(autoPositions)
      // Swap complet du profil de forces : la cluster force doit dominer,
      // mais elle se fait écraser si repulsion/center/linkSpring restent hauts.
      g.setConfigPartial(FORCES_CLUSTER)
    } else {
      const freed: (number | undefined)[] = new Array(N).fill(undefined)
      g.setPointClusters(freed)
      g.setClusterPositions([])
      g.setConfigPartial(FORCES_FREE)
    }
    // setConfigPartial ne redémarre pas la simu seul.
    g.start(1)
    drawOverlay()

    // Auto-fit uniquement sur toggle réel : les clusters se forment à ±2500
    // dans l'espace cosmos, bien au-delà du cadre initial. Skip au montage
    // initial et quand l'effet re-fire à cause d'un recalcul de
    // clusterAssignments, pour éviter un dézoom non sollicité.
    const didToggle = prevClusterByAxisRef.current !== clusterByAxis
    prevClusterByAxisRef.current = clusterByAxis
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!clusterByAxis) { setCategoriesLoading(false); return }
    setCategoriesLoading(true)

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      if (didToggle) graphRef.current?.fitView(800, 0.15, false)
      setCategoriesLoading(false)
    }
    // Source primaire : convergence réelle de la simu cosmos. La ref est
    // écrasée à chaque toggle — le cleanup ci-dessous garantit qu'on ne
    // laisse pas de handler périmé si l'effet re-fire avant la fin.
    onSimulationEndExtraRef.current = finish
    const fallbackTimer = setTimeout(finish, CLUSTER_LOADING_FALLBACK_MS)
    return () => {
      clearTimeout(fallbackTimer)
      if (onSimulationEndExtraRef.current === finish) {
        onSimulationEndExtraRef.current = null
      }
    }
  }, [clusterByAxis, clusterAssignments, graphRef, prevClusterByAxisRef, drawOverlay, onSimulationEndExtraRef])

  return { categoriesLoading }
}

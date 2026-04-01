// @ts-nocheck — interacts with d3-force internals not exposed in react-force-graph-2d types
import { useEffect, type RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { syncedZoomToFit } from '../cameraControls'
import {
  FORCE_CHARGE_DIST_MAX,
  FORCE_LINK_DIST_AUTHOR_BOOK,
  FORCE_LINK_DIST_CITATION,
  FORCE_LINK_STRENGTH,
  FORCE_GENEALOGY_LINK_AUTHOR_BOOK,
  FORCE_GENEALOGY_LINK_CITATION,
  FORCE_X_YEAR_SPREAD,
  FORCE_X_YEAR_STRENGTH,
  FORCE_Y_CENTER_STRENGTH,
  chargeStrengthForNode,
} from '../layoutEngine'
import type { GraphData } from '@/types/domain'

type Args = {
  fgRef: RefObject<ForceGraphMethods | undefined>
  camRef: RefObject<{ x: number; y: number; zoom: number }>
  graphData: GraphData
  layoutPositions: Map<string, { fx: number; fy: number }> | null | undefined
  viewMode: string
  degreeByNodeId: Map<string, number>
}

export function useGraphLayout({ fgRef, camRef, graphData, layoutPositions, viewMode, degreeByNodeId }: Args) {
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    const timer = setTimeout(() => {
      if (layoutPositions) {
        graphData.nodes.forEach((node) => {
          const pos = layoutPositions.get(node.id)
          if (pos) {
            node.fx = pos.fx
            node.fy = pos.fy
          }
        })
        fg.d3Force('charge').strength(-30)
        fg.d3Force('link').distance((l) =>
          l.type === 'author-book' ? FORCE_GENEALOGY_LINK_AUTHOR_BOOK : FORCE_GENEALOGY_LINK_CITATION
        )
        syncedZoomToFit(fg, camRef, 1200, 80)
      } else {
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
        })

        fg.d3Force('charge')
          .strength((node) => chargeStrengthForNode(node, degreeByNodeId))
          .distanceMax(FORCE_CHARGE_DIST_MAX)
        fg.d3Force('link')
          .distance((l) => l.type === 'author-book' ? FORCE_LINK_DIST_AUTHOR_BOOK : FORCE_LINK_DIST_CITATION)
          .strength(FORCE_LINK_STRENGTH)

        // Force X temporelle : tendance douce vers l'annee, recent -> droite.
        const years = graphData.nodes.map((n) => n.year).filter((y) => typeof y === 'number')
        const minYear = years.length ? Math.min(...years) : 1800
        const maxYear = years.length ? Math.max(...years) : 2025
        const midYear = (minYear + maxYear) / 2
        const span = Math.max(1, maxYear - minYear)

        const forceX = fg.d3Force('x')
        if (forceX) {
          Reflect.get(forceX, 'strength')?.call(forceX, FORCE_X_YEAR_STRENGTH)
          Reflect.get(forceX, 'x')?.call(forceX, (node) => {
            const y = typeof node?.year === 'number' ? node.year : null
            if (y == null) return 0
            return ((y - midYear) / span) * FORCE_X_YEAR_SPREAD
          })
        }

        // Force Y : aplatissement vertical fort pour former un nuage horizontal.
        const forceY = fg.d3Force('y')
        if (forceY) {
          Reflect.get(forceY, 'strength')?.call(forceY, FORCE_Y_CENTER_STRENGTH)
          Reflect.get(forceY, 'y')?.call(forceY, 0)
        }

        fg.d3ReheatSimulation()
        setTimeout(() => syncedZoomToFit(fg, camRef, 1200, 80), 800)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [layoutPositions, viewMode, graphData.nodes, degreeByNodeId, fgRef, camRef])
}

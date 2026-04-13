// @ts-nocheck — interacts with d3-force internals not exposed in react-force-graph-2d types
import { useEffect, type RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import { syncedZoomToFit } from '../cameraControls'
import { getNodeRadius } from '../nodeObject'
import {
  FORCE_CHARGE_DIST_MAX,
  FORCE_COLLIDE_PADDING,
  FORCE_X_YEAR_SPREAD,
  FORCE_X_YEAR_STRENGTH,
  FORCE_Y_CENTER_STRENGTH,
  chargeStrengthForNode,
  linkDistanceForType,
  linkStrengthForType,
} from '../layoutEngine'
import type { GraphData } from '@/types/domain'

type Args = {
  fgRef: RefObject<ForceGraphMethods | undefined>
  camRef: RefObject<{ x: number; y: number; zoom: number }>
  graphData: GraphData
  viewMode: string
  degreeByNodeId: Map<string, number>
  citationsByNodeId: Map<string, number>
}

export function useGraphLayout({ fgRef, camRef, graphData, viewMode, degreeByNodeId, citationsByNodeId }: Args) {
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    const timer = setTimeout(() => {
      graphData.nodes.forEach((node) => {
        node.fx = undefined
        node.fy = undefined
      })

      fg.d3Force('charge')
        .strength((node) => chargeStrengthForNode(node, degreeByNodeId))
        .distanceMax(FORCE_CHARGE_DIST_MAX)
      fg.d3Force('link')
        .distance(linkDistanceForType)
        .strength(linkStrengthForType)

      // Collision : rayon *visuel* + padding — évite tout chevauchement même pour
      // les livres très cités (rayon jusqu'à 46px).
      fg.d3Force('collide', forceCollide((node) => {
        const cit = citationsByNodeId.get(node.id) || 0
        return getNodeRadius(node, cit) + FORCE_COLLIDE_PADDING
      }))

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
    }, 100)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- graphData.nodes reference changes every render;
  // we only need to re-run when the count changes (structural change) or viewMode/degreeByNodeId change.
  }, [viewMode, graphData.nodes.length, degreeByNodeId, citationsByNodeId, fgRef, camRef])
}

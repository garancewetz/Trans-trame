// @ts-nocheck — interacts with d3-force internals not exposed in react-force-graph-2d types
import { useEffect, useRef, type RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
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
  graphData: GraphData
  viewMode: string
  degreeByNodeId: Map<string, number>
  citationsByNodeId: Map<string, number>
  bookCountByAuthorId: Map<string, number>
  externalCitationsByBookId: Map<string, number>
}

export function useGraphLayout({
  fgRef, graphData, viewMode,
  degreeByNodeId, citationsByNodeId, bookCountByAuthorId, externalCitationsByBookId,
}: Args) {
  // Les maps sont référencées via refs pour que les closures de forces lisent
  // toujours la dernière valeur sans que l'effet ait besoin de re-tourner
  // (sinon chaque refetch TanStack — qui crée de nouveaux Map — dépinglerait
  //  tous les nœuds et relancerait la simulation à alpha=1, provoquant un
  //  réarrangement + zoomToFit non sollicité, aka le "désoom auto").
  const degreeRef = useRef(degreeByNodeId)
  const citationsRef = useRef(citationsByNodeId)
  const bookCountRef = useRef(bookCountByAuthorId)
  const externalCitRef = useRef(externalCitationsByBookId)
  degreeRef.current = degreeByNodeId
  citationsRef.current = citationsByNodeId
  bookCountRef.current = bookCountByAuthorId
  externalCitRef.current = externalCitationsByBookId

  const hasInitRef = useRef(false)

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    // Attend qu'il y ait des nœuds à disposer — au premier render graphData est vide.
    if (graphData.nodes.length === 0) return

    const isFirstInit = !hasInitRef.current
    hasInitRef.current = true

    const timer = setTimeout(() => {
      // Ne dépingler les nœuds QUE lors de la première mise en place ou d'un
      // changement de viewMode : sinon on casserait une disposition stabilisée
      // à chaque ajout/suppression ou refetch.
      if (isFirstInit) {
        graphData.nodes.forEach((node) => {
          node.fx = undefined
          node.fy = undefined
        })
      }

      fg.d3Force('charge')
        .strength((node) => chargeStrengthForNode(node, degreeRef.current, citationsRef.current))
        .distanceMax(FORCE_CHARGE_DIST_MAX)
      fg.d3Force('link')
        .distance((link) => linkDistanceForType(link, bookCountRef.current, citationsRef.current))
        .strength((link) => linkStrengthForType(link, externalCitRef.current, citationsRef.current))

      // Collision : rayon *visuel* + padding — évite tout chevauchement même pour
      // les livres très cités (rayon jusqu'à 46px).
      fg.d3Force('collide', forceCollide((node) => {
        const cit = citationsRef.current.get(node.id) || 0
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

      // Ne reheat QUE lors du premier placement : un refetch ou un ajout
      // ponctuel n'a pas à relancer toute la simulation.
      // NB: on NE déclenche PAS de zoomToFit ici — c'est `handleInit` dans Graph.tsx
      // qui gère le recadrage initial (à 800ms post engine-init). Déclencher un
      // second fit ici créait un "dézoom fantôme" quand les données arrivaient
      // tardivement (la simu mettait plusieurs secondes à se stabiliser avec
      // les forces courantes, et le fit tombait en plein dans l'interaction).
      if (isFirstInit) {
        fg.d3ReheatSimulation()
      }
    }, 100)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- voir commentaire sur les refs ci-dessus.
  // `graphData.nodes.length` est gardé pour détecter la transition 0→N au
  // premier chargement (quand TanStack Query résout les données).
  }, [viewMode, graphData.nodes.length, fgRef])
}

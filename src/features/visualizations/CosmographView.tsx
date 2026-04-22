import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { Graph } from '@cosmos.gl/graph'
import type { Book, Author, GraphData, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import { useAdjacencyIndex } from '@/features/graph/hooks/useAdjacencyIndex'
import { CosmographMinimap } from './CosmographMinimap'
import { CLUSTER_RING, useCosmographBuffers } from './useCosmographBuffers'
import { useCosmographKeyboardControls } from './useCosmographKeyboardControls'
import { useCosmographDataRefs } from './useCosmographDataRefs'
import { useCosmographFocalState } from './useCosmographFocalState'
import { useCosmographOverlay } from './useCosmographOverlay'
import { useCosmographInstance } from './useCosmographInstance'
import { useCosmographDataSync } from './useCosmographDataSync'
import { type CosmographMode, useCosmographLayoutEffect } from './useCosmographLayoutEffect'
import { useCosmographVisibilityEffect } from './useCosmographVisibilityEffect'
import { useCosmographFlashEffect } from './useCosmographFlashEffect'
import { useCosmographFocalCameraEffect } from './useCosmographFocalCameraEffect'

interface Props {
  graphData: GraphData
  authors: Author[]
  selectedNode?: Book | null
  onNodeClick?: (node: Book) => void
  activeAxes?: ReadonlySet<string>
  hoveredFilter?: string | null
  activeHighlight?: Highlight | null
  selectedAuthorId?: string | null
  // Preview au hover TextsPanel : met en focal un nœud sans l'épingler dans
  // la sélection. Priorité : hover > sélection > peek.
  peekNodeId?: string | null
  // IDs de livres fraîchement importés — un anneau vert pulse autour d'eux
  // pendant 3.5 s puis disparaît. Ne modifie ni la sélection ni le layout.
  flashNodeIds?: Set<string> | null
  // Plage temporelle active. On la reçoit ici plutôt que de filtrer `graphData`
  // en amont : chaque tick de la timeline (play = 120 ms) changerait l'identité
  // de graphData, invaliderait le gros useMemo qui rebuild les Float32Arrays,
  // re-randomiserait les positions et redémarrerait la simulation cosmos.gl —
  // la lecture devient injouable. À la place, on fusionne le range avec le
  // greyout existant : un simple selectPointsByIndices, zéro rebuild de layout.
  timelineRange?: TimelineRange | null
  /**
   * Mode de la vue :
   * - `free` (défaut, = vue "Transmissions") : force libre, liens visibles —
   *   pour lire les transmissions entre ressources.
   * - `categories` (vue "Catégories") : clustering par axe, liens masqués —
   *   pour lire la composition thématique du corpus.
   * - `chronological` (vue "Chronologique") : positions fixes X ∝ année de
   *   publication, simulation figée, livres sans année regroupés à droite.
   */
  mode?: CosmographMode
}

export type CosmographImperativeHandle = {
  centerCamera: () => void
}

const EMPTY_AXES: ReadonlySet<string> = new Set()

export const CosmographView = forwardRef<CosmographImperativeHandle, Props>(function CosmographView({
  graphData, authors, selectedNode, onNodeClick, activeAxes, hoveredFilter,
  activeHighlight, selectedAuthorId, peekNodeId, flashNodeIds, timelineRange,
  mode = 'free',
}: Props, ref) {
  const effectiveAxes = activeAxes ?? EMPTY_AXES
  const containerRef = useRef<HTMLDivElement>(null)
  const labelCanvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick
  const draggingRef = useRef(false)
  // Ensemble des index visibles (passés à selectPointsByIndices).
  // null = pas de filtre actif → tous les points visibles.
  const visibleIndexSetRef = useRef<Set<number> | null>(null)

  // Peek : hover TextsPanel. Priorité focal : hover > selectedNode > peek.
  // On stocke l'id (pas l'index) parce que idToIndex peut changer entre deux
  // renders ; la résolution se fait dans applyFocalVisualState.
  const peekBookIdRef = useRef<string | null>(null)
  peekBookIdRef.current = peekNodeId ?? null

  // Flash animation : anneau vert autour des nœuds fraîchement importés.
  const flashNodeIdsRef = useRef<Set<string>>(new Set())
  const flashAlphaRef = useRef(0)

  // Pont entre l'instance cosmos (qui déclare `onSimulationEnd` à la création)
  // et les effets qui veulent réagir à la convergence (ex : cluster loading
  // mask). Source unique pour éviter d'ouvrir un second listener.
  const onSimulationEndExtraRef = useRef<(() => void) | null>(null)

  // Clustering piloté par le mode de la vue. Le ref suit l'état pour que
  // drawOverlay conditionne l'affichage des labels d'axes au rendu courant.
  const clusterByAxis = mode === 'categories'
  const clusterByAxisRef = useRef(clusterByAxis)
  clusterByAxisRef.current = clusterByAxis
  // Tracks the *previous render's* mode so the layout effect can distinguish
  // a real toggle from a re-run triggered by data changing (which would
  // otherwise schedule an unwanted fitView dezoom).
  const prevModeRef = useRef<CosmographMode>(mode)
  // Ref miroir du mode courant, lu par les callbacks init-once du Graph
  // (onDrag). Maintenu en phase via une assignation à chaque render parent.
  const modeRef = useRef<CosmographMode>(mode)
  modeRef.current = mode

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])
  const linksByNodeId = useAdjacencyIndex(graphData.links)
  const buffers = useCosmographBuffers(graphData, authorsMap)
  const {
    books, idToIndex, edgeCount, minimapIndices, citationsByBookId,
    clusterAssignments, flatPositionsChrono, subClusters, totalClusterCount,
  } = buffers

  const selectedBookIdRef = useRef<string | null>(null)
  selectedBookIdRef.current = selectedNode?.id ?? null
  const selectedVisualIndexRef = useRef<number | null>(null)
  selectedVisualIndexRef.current = selectedNode?.id ? idToIndex.get(selectedNode.id) ?? null : null

  const dataRefs = useCosmographDataRefs(buffers, linksByNodeId)

  const applyFocalRef = useCosmographFocalState({
    graphRef,
    selectedBookIdRef, peekBookIdRef, visibleIndexSetRef, flashNodeIdsRef,
    ...dataRefs,
  })

  const drawOverlay = useCosmographOverlay({
    graphRef, labelCanvasRef, selectedVisualIndexRef, visibleIndexSetRef,
    clusterByAxisRef, flashNodeIdsRef, flashAlphaRef,
    hoveredIndexRef: dataRefs.hoveredIndexRef,
    flatSizesRef: dataRefs.flatSizesRef,
    labelByIndexRef: dataRefs.labelByIndexRef,
    glowHexByIndexRef: dataRefs.glowHexByIndexRef,
    landmarkIndicesExtendedRef: dataRefs.landmarkIndicesExtendedRef,
    landmarkIndicesCategoriesExtendedRef: dataRefs.landmarkIndicesCategoriesExtendedRef,
    clusterAssignmentsRef: dataRefs.clusterAssignmentsRef,
    subClusterByIndexRef: dataRefs.subClusterByIndexRef,
    subClustersRef: dataRefs.subClustersRef,
    idToIndexRef: dataRefs.idToIndexRef,
  })

  useCosmographKeyboardControls({
    graphRef, containerRef, onFrame: drawOverlay,
  })

  useCosmographInstance({
    containerRef, labelCanvasRef, graphRef, draggingRef, onNodeClickRef,
    applyFocalRef, drawOverlay,
    onSimulationEndExtraRef, modeRef, visibleIndexSetRef,
    hoveredIndexRef: dataRefs.hoveredIndexRef,
    booksRef: dataRefs.booksRef,
  })

  useCosmographDataSync({
    graphRef, mode, buffers,
    liveLinkColorsRef: dataRefs.liveLinkColorsRef,
    applyFocalRef,
  })

  useCosmographLayoutEffect({
    graphRef, mode, clusterAssignments, flatPositionsChrono,
    subClusters, totalClusterCount,
    prevModeRef, drawOverlay,
    onSimulationEndExtraRef,
  })

  useCosmographVisibilityEffect({
    graphRef, books, activeAxes: effectiveAxes, hoveredFilter, activeHighlight, selectedAuthorId,
    timelineRange, linksByNodeId, citationsByBookId, visibleIndexSetRef,
    applyFocalRef, drawOverlay,
  })

  useCosmographFocalCameraEffect({
    graphRef, selectedNodeId: selectedNode?.id, peekNodeId,
    booksLength: books.length, idToIndex, applyFocalRef, drawOverlay,
  })

  useCosmographFlashEffect({
    flashNodeIds, flashNodeIdsRef, flashAlphaRef, applyFocalRef, drawOverlay,
  })

  useImperativeHandle(ref, () => ({
    centerCamera() {
      graphRef.current?.fitView(900, 0.1, false)
    },
  }), [])

  const a11yLabel = (() => {
    const prefix = `${books.length} œuvres`
    const suffix = "Une alternative tabulaire est disponible dans l'onglet Ressources."
    switch (mode) {
      case 'categories':
        return `Cartographie Catégories : ${prefix} regroupées par axe thématique. ${suffix}`
      case 'chronological':
        return `Cartographie Chronologie : ${prefix} disposées par année de publication. ${suffix}`
      default:
        return `Cartographie Transmissions : ${prefix} reliées par ${edgeCount} citations. ${suffix}`
    }
  })()

  return (
    <div
      role="img"
      aria-label={a11yLabel}
      className="absolute inset-0 bg-bg-base overflow-hidden"
    >
      {/* cursor-grab → signale que le nœud est saisissable en modes libres.
          cursor-default en Chronologie : simulation figée, drag désactivé. */}
      <div
        ref={containerRef}
        className={`absolute inset-0 ${mode === 'chronological' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      />
      {/* Overlay canvas pour les labels — pointer-events-none pour laisser
          passer les événements au renderer WebGL en dessous. */}
      <canvas ref={labelCanvasRef} className="pointer-events-none absolute inset-0" />

      <CosmographMinimap
        graphRef={graphRef}
        containerRef={containerRef}
        trackedIndices={minimapIndices}
      />

      <div className="absolute bottom-3 left-3 text-[14px] text-white/20 font-mono">
        {mode === 'categories'
          ? `${books.length} ressources · ${CLUSTER_RING.length} catégories thématiques · cosmos.gl GPU`
          : mode === 'chronological'
            ? `${books.length} ressources · chronologie par année de publication · cosmos.gl GPU`
            : `${books.length} ressources · ${edgeCount} citations · cosmos.gl GPU`}
      </div>

    </div>
  )
})

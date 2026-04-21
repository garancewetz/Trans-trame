import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Graph } from '@cosmos.gl/graph'
import { Loader2 } from 'lucide-react'
import type { Book, Author, GraphData, TimelineRange } from '@/types/domain'
import type { Highlight } from '@/core/FilterContext'
import { buildAuthorsMap } from '@/common/utils/authorUtils'
import { useAdjacencyIndex } from '@/features/graph/hooks/useAdjacencyIndex'
import { CosmographMinimap } from './CosmographMinimap'
import { CAM_QUERY_KEY, CAM_WRITE_THROTTLE_MS, type CamState, parseCamParam, serializeCam } from './cosmographCamera'
import { CLUSTER_RING, useCosmographBuffers } from './useCosmographBuffers'
import { useCosmographKeyboardControls } from './useCosmographKeyboardControls'
import { useCosmographDataRefs } from './useCosmographDataRefs'
import { useCosmographFocalState } from './useCosmographFocalState'
import { useCosmographOverlay } from './useCosmographOverlay'
import { useCosmographInstance } from './useCosmographInstance'
import { useCosmographDataSync } from './useCosmographDataSync'
import { useCosmographClusterEffect } from './useCosmographClusterEffect'
import { useCosmographVisibilityEffect } from './useCosmographVisibilityEffect'
import { useCosmographFlashEffect } from './useCosmographFlashEffect'
import { useCosmographFocalCameraEffect } from './useCosmographFocalCameraEffect'

interface Props {
  graphData: GraphData
  authors: Author[]
  selectedNode?: Book | null
  onNodeClick?: (node: Book) => void
  activeFilter?: string | null
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
   * - `free` (défaut, = vue "Cosmograph") : force libre, liens visibles — pour
   *   lire les filiations.
   * - `categories` (vue "Catégories") : clustering par axe, liens masqués —
   *   pour lire la composition thématique du corpus.
   */
  mode?: 'free' | 'categories'
}

export type CosmographImperativeHandle = {
  centerCamera: () => void
}

export const CosmographView = forwardRef<CosmographImperativeHandle, Props>(function CosmographView({
  graphData, authors, selectedNode, onNodeClick, activeFilter, hoveredFilter,
  activeHighlight, selectedAuthorId, peekNodeId, flashNodeIds, timelineRange,
  mode = 'free',
}: Props, ref) {
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
  // Tracks the *previous render's* clusterByAxis so the cluster effect can
  // distinguish a real toggle from a re-run triggered by clusterAssignments
  // changing (which would otherwise schedule an unwanted fitView dezoom).
  const prevClusterByAxisRef = useRef(clusterByAxis)

  // URL params — on capture la caméra initiale *avant* le premier render pour
  // pouvoir désactiver fitViewOnInit quand une caméra est persistée.
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams
  const initialCamRef = useRef<CamState | null>(parseCamParam(searchParams.get(CAM_QUERY_KEY)))

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])
  const linksByNodeId = useAdjacencyIndex(graphData.links)
  const buffers = useCosmographBuffers(graphData, authorsMap)
  const {
    books, idToIndex, edgeCount, minimapIndices, citationsByBookId,
    clusterAssignments,
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
    landmarkIndicesRef: dataRefs.landmarkIndicesRef,
    landmarkIndicesCategoriesRef: dataRefs.landmarkIndicesCategoriesRef,
    clusterAssignmentsRef: dataRefs.clusterAssignmentsRef,
    idToIndexRef: dataRefs.idToIndexRef,
  })

  // URL sync caméra — throttlé pour ne pas spammer history.
  const camWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const writeCamToUrl = useCallback((cam: CamState) => {
    if (camWriteTimerRef.current) clearTimeout(camWriteTimerRef.current)
    camWriteTimerRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParamsRef.current)
      next.set(CAM_QUERY_KEY, serializeCam(cam))
      setSearchParams(next, { replace: true })
      camWriteTimerRef.current = null
    }, CAM_WRITE_THROTTLE_MS)
  }, [setSearchParams])

  useEffect(() => () => {
    if (camWriteTimerRef.current) clearTimeout(camWriteTimerRef.current)
  }, [])

  useCosmographKeyboardControls({
    graphRef, containerRef, onCamChange: writeCamToUrl, onFrame: drawOverlay,
  })

  useCosmographInstance({
    containerRef, labelCanvasRef, graphRef, draggingRef, onNodeClickRef,
    applyFocalRef, drawOverlay, initialCamRef, writeCamToUrl,
    onSimulationEndExtraRef,
    hoveredIndexRef: dataRefs.hoveredIndexRef,
    booksRef: dataRefs.booksRef,
  })

  useCosmographDataSync({
    graphRef, mode, buffers,
    liveLinkColorsRef: dataRefs.liveLinkColorsRef,
    applyFocalRef,
  })

  const { categoriesLoading } = useCosmographClusterEffect({
    graphRef, clusterByAxis, clusterAssignments, prevClusterByAxisRef, drawOverlay,
    onSimulationEndExtraRef,
  })

  useCosmographVisibilityEffect({
    graphRef, books, activeFilter, hoveredFilter, activeHighlight, selectedAuthorId,
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

  const a11yLabel = `Constellation interactive : ${books.length} œuvres reliées par ${edgeCount} citations. Une alternative tabulaire est disponible dans l'onglet Ressources.`

  return (
    <div
      role="img"
      aria-label={a11yLabel}
      className="absolute inset-0 bg-bg-base overflow-hidden"
    >
      <div ref={containerRef} className="absolute inset-0" />
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
          : `${books.length} ressources · ${edgeCount} citations · cosmos.gl GPU`}
      </div>

      {mode === 'categories' && categoriesLoading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-base/85 backdrop-blur-md"
        >
          <Loader2 size={32} className="animate-spin text-white/70" />
          <p className="text-[0.95rem] font-medium text-white/70">
            Composition des catégories…
          </p>
        </div>
      )}

    </div>
  )
})

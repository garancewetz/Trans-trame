import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { GraphData, TimelineRange } from '@/types/domain'
import { normalizeEndpointId } from '@/features/graph/domain/graphDataModel'

// Mode par défaut = réseau de citations. Synchro URL via `?view=` pour que
// partager un lien emporte le mode avec la caméra — sinon le destinataire
// retombait sur son défaut et perdait le contexte.
const VIEW_QUERY_KEY = 'view'
const VIEW_MODES = new Set(['transmissions', 'categories', 'chronological'])
const DEFAULT_VIEW_MODE = 'transmissions'

function parseViewMode(raw: string | null): string {
  if (raw && VIEW_MODES.has(raw)) return raw
  return DEFAULT_VIEW_MODE
}

export function useAppTimelineAndLayout(graphData: GraphData) {
  const allYears = useMemo(
    () =>
      graphData.nodes
        .map((n) => n.year)
        .filter((y): y is number => typeof y === 'number'),
    [graphData.nodes],
  )
  const maxYear = useMemo(() => Math.max(...allYears, 2025), [allYears])
  const minYear = useMemo(() => Math.min(...allYears, 1800), [allYears])
  const [timelineRange, setTimelineRange] = useState<TimelineRange | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  // Source de vérité = URL. Dériver le mode via useMemo plutôt que de
  // maintenir un state séparé : zéro risque de désynchro avec le back /
  // forward navigateur, et évite un setState-in-effect qui triggerait un
  // render supplémentaire à chaque fois.
  const viewMode = useMemo(
    () => parseViewMode(searchParams.get(VIEW_QUERY_KEY)),
    [searchParams],
  )

  const clampedTimelineRange = useMemo(() => {
    if (!timelineRange) return { start: minYear, end: maxYear }
    const start = timelineRange.start ?? minYear
    const end = timelineRange.end ?? maxYear
    const safeStart = Math.max(minYear, Math.min(start, end, maxYear))
    const safeEnd = Math.min(maxYear, Math.max(end, start, minYear))
    return { start: safeStart, end: safeEnd }
  }, [timelineRange, minYear, maxYear])

  const filteredGraphData = useMemo(() => {
    const start = clampedTimelineRange.start
    const end = clampedTimelineRange.end
    const visibleNodeIds = new Set(
      graphData.nodes.filter((n) => !n.year || (n.year >= start && n.year <= end)).map((n) => n.id)
    )
    return {
      nodes: graphData.nodes.filter((n) => visibleNodeIds.has(n.id)),
      links: graphData.links.filter((l) => {
        const srcId = normalizeEndpointId(l.source)
        const tgtId = normalizeEndpointId(l.target)
        return !!(srcId && tgtId && visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId))
      }),
    }
  }, [graphData, clampedTimelineRange])

  // Pousse toute bascule de mode dans l'URL. replace=true pour ne pas
  // polluer l'historique à chaque click (le back remettrait le mode
  // précédent sans raison — l'utilisateur·ice ne l'attend pas).
  const handleViewChange = useCallback((mode: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (mode === DEFAULT_VIEW_MODE) next.delete(VIEW_QUERY_KEY)
        else next.set(VIEW_QUERY_KEY, mode)
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const hasTimelineFilter = timelineRange !== null && (clampedTimelineRange.start !== minYear || clampedTimelineRange.end !== maxYear)
  const clearTimelineFilter = useCallback(() => {
    setTimelineRange(null)
  }, [])

  return {
    viewMode,
    handleViewChange,
    timelineRange,
    setTimelineRange,
    clampedTimelineRange,
    minYear,
    maxYear,
    filteredGraphData,
    hasTimelineFilter,
    clearTimelineFilter,
  }
}

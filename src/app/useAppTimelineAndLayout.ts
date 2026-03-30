import { useCallback, useMemo, useState } from 'react'
import { constellationLayout, genealogyLayout } from '../features/graph/layoutEngine'

export function useAppTimelineAndLayout(graphData) {
  const allYears = useMemo(() => graphData.nodes.map((n) => n.year).filter(Boolean), [graphData.nodes])
  const maxYear = useMemo(() => Math.max(...allYears, 2025), [allYears])
  const minYear = useMemo(() => Math.min(...allYears, 1800), [allYears])
  const [timelineRange, setTimelineRange] = useState(null)

  const [viewMode, setViewMode] = useState('constellation')

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
        const srcId = l.source && typeof l.source === 'object' ? l.source.id : l.source
        const tgtId = l.target && typeof l.target === 'object' ? l.target.id : l.target
        return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId)
      }),
    }
  }, [graphData, clampedTimelineRange])

  const layoutPositions = useMemo(() => {
    switch (viewMode) {
      case 'genealogy':
        return genealogyLayout(filteredGraphData)
      default:
        return constellationLayout()
    }
  }, [viewMode, filteredGraphData])

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode)
  }, [])

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
    layoutPositions,
    hasTimelineFilter,
    clearTimelineFilter,
  }
}

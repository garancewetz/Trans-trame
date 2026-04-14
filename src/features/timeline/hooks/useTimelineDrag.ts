import { useCallback, useRef, useState } from 'react'
import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from 'react'
import type { TimelineRange } from '@/types/domain'

type UseTimelineDragOptions = {
  minYear: number
  maxYear: number
  timelineRange: TimelineRange
  trackRef: RefObject<HTMLDivElement | null>
  onRangeChange: Dispatch<SetStateAction<TimelineRange | null>>
}

export function useTimelineDrag({
  minYear,
  maxYear,
  timelineRange,
  trackRef,
  onRangeChange,
}: UseTimelineDragOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragTargetRef = useRef<'start' | 'end'>('end')
  const targetLockedRef = useRef(false)

  function updateFromPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const year = Math.round(minYear + ratio * (maxYear - minYear))

    const start = timelineRange?.start ?? minYear
    const end = timelineRange?.end ?? maxYear

    if (!isDragging && !targetLockedRef.current) {
      const distStart = Math.abs(year - start)
      const distEnd = Math.abs(year - end)
      // Tie-break towards `end` so a click equidistant from both thumbs
      // extends the range rather than collapsing it onto the start.
      dragTargetRef.current = distStart < distEnd ? 'start' : 'end'
    }

    const target = dragTargetRef.current
    if (target === 'start') {
      const nextStart = Math.min(year, end)
      onRangeChange((prev) => {
        const prevEnd = prev?.end ?? end
        return { start: Math.min(nextStart, prevEnd), end: prevEnd }
      })
    } else {
      const nextEnd = Math.max(year, start)
      onRangeChange((prev) => {
        const prevStart = prev?.start ?? start
        return { start: prevStart, end: Math.max(nextEnd, prevStart) }
      })
    }
  }

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      // If the pointerdown originated on a specific thumb, lock to it so we
      // don't misattribute the drag to the nearer thumb in "year" space.
      const origin = e.target as HTMLElement | null
      const thumbHit = origin?.dataset?.thumb as 'start' | 'end' | undefined
      if (thumbHit) {
        dragTargetRef.current = thumbHit
        targetLockedRef.current = true
      } else {
        targetLockedRef.current = false
      }
      updateFromPointer(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `updateFromPointer` reads latest range from refs/state each event; listing it would recreate the handler every render.
    [minYear, maxYear],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      updateFromPointer(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same as handlePointerDown: stable closure over `updateFromPointer` would churn dependencies without benefit.
    [isDragging, minYear, maxYear],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    targetLockedRef.current = false
  }, [])

  return { isDragging, handlePointerDown, handlePointerMove, handlePointerUp }
}

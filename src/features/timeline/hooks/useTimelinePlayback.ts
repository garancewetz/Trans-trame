import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { TimelineRange } from '@/types/domain'

type UseTimelinePlaybackOptions = {
  minYear: number
  maxYear: number
  timelineRange: TimelineRange
  onRangeChange: Dispatch<SetStateAction<TimelineRange | null>>
}

export function useTimelinePlayback({
  minYear,
  maxYear,
  timelineRange,
  onRangeChange,
}: UseTimelinePlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Play/pause animation
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearInterval(playRef.current)
      return
    }
    playRef.current = setInterval(() => {
      onRangeChange((prev) => {
        const base = prev ?? { start: minYear, end: minYear }
        if (base.end >= maxYear) {
          setIsPlaying(false)
          return { start: base.start, end: maxYear }
        }
        return { start: base.start, end: Math.min(maxYear, base.end + 1) }
      })
    }, 120)
    return () => {
      if (playRef.current) clearInterval(playRef.current)
    }
  }, [isPlaying, maxYear, minYear, onRangeChange])

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && timelineRange.end >= maxYear) {
        onRangeChange({ start: minYear, end: minYear })
      }
      return !prev
    })
  }, [timelineRange.end, maxYear, minYear, onRangeChange])

  return { isPlaying, togglePlay }
}

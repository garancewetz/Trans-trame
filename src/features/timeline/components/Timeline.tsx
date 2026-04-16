import {
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { Book, GraphData, TimelineRange } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { useTimelinePlayback } from '@/features/timeline/hooks/useTimelinePlayback'
import { useTimelineDrag } from '@/features/timeline/hooks/useTimelineDrag'

type TimelineProps = {
  graphData: GraphData
  timelineRange: TimelineRange
  onRangeChange: Dispatch<SetStateAction<TimelineRange | null>>
}

export function Timeline({ graphData, timelineRange, onRangeChange }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  const { minYear, maxYear, booksByYear } = useMemo(() => {
    const years = graphData.nodes
      .map((n) => n.year)
      .filter((y): y is number => typeof y === 'number')
      .sort((a, b) => a - b)
    const min = years[0] ?? 1800
    const max = years[years.length - 1] ?? 2025
    const byYear: Record<number, Book[]> = {}
    graphData.nodes.forEach((n) => {
      if (n.year) {
        if (!byYear[n.year]) byYear[n.year] = []
        byYear[n.year].push(n)
      }
    })
    return { minYear: min, maxYear: max, booksByYear: byYear }
  }, [graphData.nodes])

  const { isPlaying, togglePlay } = useTimelinePlayback({
    minYear,
    maxYear,
    timelineRange,
    onRangeChange,
  })

  const { isDragging, handlePointerDown, handlePointerMove, handlePointerUp } = useTimelineDrag({
    minYear,
    maxYear,
    timelineRange,
    trackRef,
    onRangeChange,
  })

  // Tick marks for years that have books
  const ticks = useMemo(() => {
    const range = maxYear - minYear || 1
    return Object.keys(booksByYear).map((y) => ({
      year: Number(y),
      left: ((Number(y) - minYear) / range) * 100,
      count: booksByYear[Number(y)].length,
    }))
  }, [booksByYear, minYear, maxYear])

  const startYear = timelineRange?.start ?? minYear
  const endYear = timelineRange?.end ?? maxYear

  const clampPercent = (p: number) => Math.max(0, Math.min(100, Number.isFinite(p) ? p : 0))

  const startProgressRaw = maxYear === minYear ? 0 : ((startYear - minYear) / (maxYear - minYear)) * 100
  const endProgressRaw = maxYear === minYear ? 100 : ((endYear - minYear) / (maxYear - minYear)) * 100
  const startProgress = clampPercent(startProgressRaw)
  const endProgress = clampPercent(endProgressRaw)

  const thumbTransform = (p: number) => {
    if (p <= 0) return 'translate(0, -50%)'
    if (p >= 100) return 'translate(-100%, -50%)'
    return 'translate(-50%, -50%)'
  }

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20">
      <div
        className="w-full px-3 pb-3 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg-overlay/72 px-3 py-2 backdrop-blur-xl"
          style={{ background: 'rgba(8, 12, 30, 0.35)', backdropFilter: 'blur(18px)' }}
        >
        {/* Play/pause */}
        <Button
          onClick={togglePlay}
          className="h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 flex"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
          title={isPlaying ? 'Pause la progression temporelle' : 'Anime la progression temporelle'}
          aria-label={isPlaying ? 'Pause la progression temporelle' : 'Anime la progression temporelle'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="3" height="8" rx="0.5" />
              <rect x="6" y="1" width="3" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,0 10,5 2,10" />
            </svg>
          )}
        </Button>

        {/* Min year */}
        <span
          className="shrink-0 text-[13px] font-light tracking-wide"
          style={{ color: 'rgba(255, 255, 255, 0.3)', minWidth: '32px' }}
        >
          {minYear}
        </span>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative flex-1 h-6 flex items-center cursor-pointer select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Background line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-full rounded-full"
            style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }}
          />

          {/* Filled line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full transition-[width] duration-75"
            style={{
              height: '1px',
              left: `${startProgress}%`,
              width: `${Math.max(0, endProgress - startProgress)}%`,
              background: 'rgba(255, 255, 255, 0.22)',
            }}
          />

          {/* Book tick marks — subtle vertical dashes */}
          {ticks.map((tick) => (
            <div
              key={tick.year}
              className="absolute top-1/2"
              style={{
                left: `${tick.left}%`,
                width: '2px',
                height: tick.count > 1 ? '12px' : '8px',
                background:
                  tick.year >= startYear && tick.year <= endYear
                    ? 'rgba(255, 255, 255, 0.38)'
                    : 'rgba(255, 255, 255, 0.12)',
                transform: 'translate(-50%, -50%)',
                transition: 'background 0.3s',
                borderRadius: '1px',
              }}
            />
          ))}

          {/* Thumb start — visible dot + invisible 20px hit area so clicks land on the right thumb even when the two are close */}
          <div
            data-thumb="start"
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `calc(${startProgress}% - 10px)`,
              width: '20px',
              height: '20px',
              transition: isDragging ? 'none' : 'left 0.075s ease-out',
              zIndex: 2,
            }}
          />
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{
              left: `${startProgress}%`,
              width: '8px',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.55)',
              borderRadius: '50%',
              transform: thumbTransform(startProgress),
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.08)',
              transition: isDragging ? 'none' : 'left 0.075s ease-out',
            }}
          />

          {/* Thumb end — same pattern; rendered after start so its hit area wins on overlap */}
          <div
            data-thumb="end"
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `calc(${endProgress}% - 10px)`,
              width: '20px',
              height: '20px',
              transition: isDragging ? 'none' : 'left 0.075s ease-out',
              zIndex: 3,
            }}
          />
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{
              left: `${endProgress}%`,
              width: '8px',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.55)',
              borderRadius: '50%',
              transform: thumbTransform(endProgress),
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.08)',
              transition: isDragging ? 'none' : 'left 0.075s ease-out',
            }}
          />
        </div>

        {/* Max year */}
        <span
          className="shrink-0 text-[13px] font-light tracking-wide"
          style={{ color: 'rgba(255, 255, 255, 0.3)', minWidth: '32px', textAlign: 'right' }}
        >
          {maxYear}
        </span>

        {/* Current year */}
        <span
          className="shrink-0 text-sm font-light tracking-wider tabular-nums"
          style={{ color: 'rgba(255, 255, 255, 0.6)', minWidth: '40px', textAlign: 'right' }}
        >
          {startYear}–{endYear}
        </span>
        </div>
      </div>
    </div>
  )
}

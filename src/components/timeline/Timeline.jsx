import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function Timeline({ graphData, timelineYear, onYearChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const playRef = useRef(null)
  const trackRef = useRef(null)

  const { minYear, maxYear, booksByYear } = useMemo(() => {
    const years = graphData.nodes.map((n) => n.year).filter(Boolean).sort((a, b) => a - b)
    const min = years[0] ?? 1800
    const max = years[years.length - 1] ?? 2025
    const byYear = {}
    graphData.nodes.forEach((n) => {
      if (n.year) {
        if (!byYear[n.year]) byYear[n.year] = []
        byYear[n.year].push(n)
      }
    })
    return { minYear: min, maxYear: max, booksByYear: byYear }
  }, [graphData.nodes])

  // Play/pause animation
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearInterval(playRef.current)
      return
    }
    playRef.current = setInterval(() => {
      onYearChange((prev) => {
        if (prev >= maxYear) {
          setIsPlaying(false)
          return maxYear
        }
        return prev + 1
      })
    }, 120)
    return () => clearInterval(playRef.current)
  }, [isPlaying, maxYear, onYearChange])

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && timelineYear >= maxYear) {
        onYearChange(minYear)
      }
      return !prev
    })
  }, [timelineYear, maxYear, minYear, onYearChange])

  // Tick marks for years that have books
  const ticks = useMemo(() => {
    const range = maxYear - minYear || 1
    return Object.keys(booksByYear).map((y) => ({
      year: Number(y),
      left: ((Number(y) - minYear) / range) * 100,
      count: booksByYear[y].length,
    }))
  }, [booksByYear, minYear, maxYear])

  const handlePointerDown = useCallback(
    (e) => {
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      updateFromPointer(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minYear, maxYear]
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging) return
      updateFromPointer(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDragging, minYear, maxYear]
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  function updateFromPointer(e) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const year = Math.round(minYear + ratio * (maxYear - minYear))
    onYearChange(year)
  }

  const progress = maxYear === minYear ? 100 : ((timelineYear - minYear) / (maxYear - minYear)) * 100

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
      <div
        className="w-full flex items-center gap-3 px-6 py-3 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(to top, rgba(6, 3, 15, 0.6), rgba(6, 3, 15, 0))',
        }}
      >
        {/* Play/pause */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
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
        </button>

        {/* Min year */}
        <span
          className="flex-shrink-0 text-[11px] font-light tracking-wide"
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
            style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}
          />

          {/* Filled line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full transition-[width] duration-75"
            style={{
              height: '1px',
              width: `${progress}%`,
              background: 'rgba(255, 255, 255, 0.25)',
            }}
          />

          {/* Book tick marks — subtle vertical dashes */}
          {ticks.map((tick) => (
            <div
              key={tick.year}
              className="absolute top-1/2"
              style={{
                left: `${tick.left}%`,
                width: '1px',
                height: tick.count > 1 ? '10px' : '6px',
                background:
                  tick.year <= timelineYear
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.08)',
                transform: 'translate(-50%, -50%)',
                transition: 'background 0.3s',
                borderRadius: '1px',
              }}
            />
          ))}

          {/* Thumb */}
          <div
            className="absolute top-1/2"
            style={{
              left: `${progress}%`,
              width: '10px',
              height: '10px',
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.15)',
              transition: isDragging ? 'none' : 'left 0.075s ease-out',
            }}
          />
        </div>

        {/* Max year */}
        <span
          className="flex-shrink-0 text-[11px] font-light tracking-wide"
          style={{ color: 'rgba(255, 255, 255, 0.3)', minWidth: '32px', textAlign: 'right' }}
        >
          {maxYear}
        </span>

        {/* Current year */}
        <span
          className="flex-shrink-0 text-sm font-light tracking-wider tabular-nums"
          style={{ color: 'rgba(255, 255, 255, 0.6)', minWidth: '40px', textAlign: 'right' }}
        >
          {timelineYear}
        </span>
      </div>
    </div>
  )
}

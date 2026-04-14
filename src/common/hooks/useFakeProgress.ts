import { useEffect, useRef, useState } from 'react'

/**
 * Simulates a progress bar during an async operation.
 * Progress increases asymptotically toward `max` (default 85%)
 * and must be completed externally by calling `complete()`.
 */
export function useFakeProgress({
  active,
  max = 85,
  rate = 0.08,
  interval = 500,
}: {
  active: boolean
  max?: number
  rate?: number
  interval?: number
}) {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (active && progress === 0) {
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= max) { clearInterval(timerRef.current!); return p }
          return p + (max - p) * rate
        })
      }, interval)
    }
    if (!active && timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active, progress, max, rate, interval])

  const reset = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setProgress(0)
  }

  const complete = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setProgress(100)
  }

  return { progress, reset, complete }
}

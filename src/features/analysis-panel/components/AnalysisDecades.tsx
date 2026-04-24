import clsx from 'clsx'
import type { Highlight } from '@/core/FilterContext'

type DecadeEntry = {
  decade: number
  count: number
  pct: number
}

type AnalysisDecadesProps = {
  decades: DecadeEntry[]
  activeHighlight: Highlight | null
  onHighlightChange: (h: Highlight | null) => void
}

export function AnalysisDecades({ decades, activeHighlight, onHighlightChange }: AnalysisDecadesProps) {
  if (decades.length === 0) return null

  return (
    <section className="mb-5">
      <h3 className="mb-2 text-label font-semibold uppercase tracking-wide text-text-soft">Décennies</h3>
      <div className="flex flex-col gap-[3px]">
        {decades.map(({ decade, count, pct }) => {
          const isActive = activeHighlight?.kind === 'decade' && activeHighlight.decade === decade
          return (
            <button
              key={decade}
              type="button"
              onClick={() => onHighlightChange(isActive ? null : { kind: 'decade', decade })}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-all',
                isActive ? 'bg-white/10' : 'hover:bg-white/5',
              )}
            >
              <span className={`w-10 shrink-0 text-right text-micro tabular-nums ${isActive ? 'text-white/80 font-semibold' : 'text-text-secondary'}`}>
                {decade}
              </span>
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-white/60' : 'bg-white/30'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`w-6 text-right text-micro tabular-nums ${isActive ? 'text-white/60' : 'text-text-muted'}`}>{count}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

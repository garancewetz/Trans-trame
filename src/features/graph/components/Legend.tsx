import { useState } from 'react'
import { Tags, ChevronDown } from 'lucide-react'
import { AXES_LABELS, type Axis } from '@/common/utils/categories'

function isAxisKey(axis: string): axis is Axis {
  return axis in AXES_LABELS
}

function axisLabelOrRaw(axis: string): string {
  return isAxisKey(axis) ? AXES_LABELS[axis] : axis
}
import { Button } from '@/common/components/ui/Button'
import { CountBadge } from '@/common/components/ui/CountBadge'

type LegendProps = {
  axesColors: Record<string, string>
  axisCountsByAxis: Record<string, number>
  activeFilter: string | null
  hoveredFilter: string | null
  toggleFilter: (axis: string) => void
  setHoveredFilter: (axis: string | null) => void
  clearFilter: () => void
}

export function Legend({
  axesColors,
  axisCountsByAxis,
  activeFilter,
  hoveredFilter,
  toggleFilter,
  setHoveredFilter,
  clearFilter,
}: LegendProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div
      className="fixed top-[68px] left-3 z-20 flex flex-col rounded-[10px] border border-white/10 bg-bg-base/45 px-4 backdrop-blur-2xl backdrop-saturate-150 py-3"
    >
      <Button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Développer les catégories' : 'Réduire les catégories'}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left text-[0.72rem] font-bold uppercase tracking-[2px] text-white/30 outline-none transition-colors hover:text-white/45 focus-visible:ring-1 focus-visible:ring-white/20 min-h-9`}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Tags size={12} className="shrink-0" />
          Catégories
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-white/25 transition-transform duration-200 ease-out ${collapsed ? '' : 'rotate-180'}`}
          aria-hidden
        />
      </Button>
      <div
        className={`grid min-h-0 transition-[grid-template-rows] duration-200 ease-out ${collapsed ? 'grid-rows-[0fr]' : 'mt-2 grid-rows-[1fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2">
            {Object.entries(axesColors).map(([axis, color]) => {
              const isActive = activeFilter === axis
              const isHovered = hoveredFilter === axis

              const axisLabel = axisLabelOrRaw(axis)

              return (
                <Button
                  key={axis}
                  className={[
                    'flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left text-[0.82rem] font-medium uppercase tracking-[0.5px] transition-all backdrop-blur-lg',
                    isActive ? 'border-white/20 bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                  ].join(' ')}
                  onClick={() => toggleFilter(axis)}
                  onMouseEnter={() => setHoveredFilter(axis)}
                  onMouseLeave={() => setHoveredFilter(null)}
                  type="button"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full transition-all backdrop-blur-md"
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive || isHovered ? `0 0 10px 2px ${color}` : 'none',
                    }}
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate normal-case">{axisLabel}</span>
                    <CountBadge
                      count={axisCountsByAxis?.[axis] ?? 0}
                      className="bg-white/10 px-[7px] py-px text-[0.72rem] font-bold text-white/45 normal-case"
                    />
                  </span>
                </Button>
              )
            })}
            {activeFilter && (
              <Button
                className="mt-1 cursor-pointer rounded-md bg-white/5 px-2 py-1 text-[0.75rem] text-white/40 backdrop-blur-lg transition-colors hover:bg-white/10 hover:text-white/70"
                onClick={clearFilter}
                type="button"
              >
                Tout afficher
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


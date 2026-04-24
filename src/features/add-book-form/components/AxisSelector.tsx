import clsx from 'clsx'
import type { AxisId } from '@/types/domain'
import { AXES, AXES_COLORS, AXES_LABELS } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'

type Props = {
  selectedAxes: AxisId[]
  toggleAxis: (axis: AxisId) => void
}

export function AxisSelector({ selectedAxes, toggleAxis }: Props) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-caption font-semibold uppercase tracking-[1px] text-text-secondary">
        Axes de r&eacute;sonance
      </legend>
      <div className="flex flex-wrap gap-2">
        {AXES.map((axis) => {
          const active = selectedAxes.includes(axis)
          return (
            <Button
              key={axis}
              type="button"
              className={clsx(
                'cursor-pointer rounded-full border px-3 py-1.5 text-[0.8rem] font-bold uppercase tracking-[0.5px] transition-all',
                active
                  ? 'border-transparent text-black'
                  : 'border-white/15 bg-white/5 text-text-soft hover:bg-white/10 hover:text-white/80',
              )}
              style={active ? { backgroundColor: AXES_COLORS[axis] } : {}}
              onClick={() => toggleAxis(axis)}
            >
              {AXES_LABELS[axis] ?? axis}
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}

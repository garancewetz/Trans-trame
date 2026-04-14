import { useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react'
import { ChevronDown } from 'lucide-react'
import { AXES, AXES_COLORS, AXES_LABELS, type Axis } from '@/common/utils/categories'

export function AxisFilterTH({
  activeAxis,
  onSelect,
}: {
  activeAxis: Axis | null
  onSelect: (axis: Axis | null) => void
}) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const filtered = AXES.filter((a) => a !== 'UNCATEGORIZED')

  return (
    <th className="w-40 px-3 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className={[
          'inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-white/60',
          activeAxis ? 'text-white/70' : '',
        ].join(' ')}
      >
        {activeAxis ? AXES_LABELS[activeAxis] : 'Axes'}
        {activeAxis ? (
          <span
            className="ml-0.5 inline-block h-2 w-2 rounded-full"
            style={{ background: AXES_COLORS[activeAxis] }}
          />
        ) : (
          <ChevronDown size={10} className="text-white/18" />
        )}
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 grid max-h-72 grid-cols-1 gap-0.5 overflow-auto rounded-lg border border-white/10 bg-bg-overlay/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          {activeAxis && (
            <button
              type="button"
              className="rounded px-2.5 py-1.5 text-left text-[0.78rem] text-white/50 transition-colors hover:bg-white/8 hover:text-white/80"
              onClick={() => { onSelect(null); setOpen(false) }}
            >
              Tous les axes
            </button>
          )}
          {filtered.map((axis) => (
            <button
              key={axis}
              type="button"
              className={[
                'flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[0.78rem] transition-colors hover:bg-white/8',
                activeAxis === axis ? 'bg-white/10 text-white' : 'text-white/60',
              ].join(' ')}
              onClick={() => { onSelect(activeAxis === axis ? null : axis); setOpen(false) }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: AXES_COLORS[axis] }} />
              {AXES_LABELS[axis]}
            </button>
          ))}
        </div>
      )}
    </th>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { AXES, AXES_COLORS, AXES_LABELS, type Axis } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'

export function AxisDots({
  axes = [],
  onChange,
}: {
  axes?: Axis[]
  onChange: (axes: Axis[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = ref.current
      const t = e.target
      if (!el || !(t instanceof Node) || !el.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const toggle = (axis: Axis) =>
    onChange(axes.includes(axis) ? axes.filter((a) => a !== axis) : [...axes, axis])

  return (
    <div className="relative flex flex-wrap items-center gap-1" ref={ref}>
      {axes.map((axis) => (
        <Button
          key={axis}
          type="button"
          onClick={() => toggle(axis)}
          title="Retirer"
          className="inline-flex cursor-pointer items-center rounded-full px-1.5 py-px text-[0.72rem] font-semibold text-black/75 transition-all hover:opacity-75"
          style={{ backgroundColor: AXES_COLORS[axis] }}
        >
          {AXES_LABELS[axis] ?? axis}
        </Button>
      ))}
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/30 transition-colors hover:border-white/35 hover:text-white/60"
      >
        <Plus size={8} />
      </Button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-bg-overlay/98 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {AXES.map((axis) => {
            const active = axes.includes(axis)
            return (
              <Button
                key={axis}
                type="button"
                onClick={() => toggle(axis)}
                className={[
                  'cursor-pointer rounded-full px-2 py-0.5 text-[0.72rem] font-semibold transition-all',
                  active ? 'text-black/75' : 'border border-white/15 bg-white/5 text-white/45 hover:bg-white/10',
                ].join(' ')}
                style={active ? { backgroundColor: AXES_COLORS[axis] } : {}}
              >
                {AXES_LABELS[axis] ?? axis}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

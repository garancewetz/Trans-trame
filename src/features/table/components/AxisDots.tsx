import { useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react'
import { ChevronDown, Plus } from 'lucide-react'
import { AXES, AXES_COLORS, AXES_LABELS, type Axis } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'

export function AxisDots({
  axes = [],
  themes = [],
  onChange,
  onRemoveTheme,
  compact = false,
}: {
  axes?: Axis[]
  themes?: string[]
  onChange: (axes: Axis[]) => void
  onRemoveTheme?: (theme: string) => void
  /** Hides the inline dots; shows only a compact trigger button (for AddRow). */
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)

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

  const toggle = (axis: Axis) =>
    onChange(axes.includes(axis) ? axes.filter((a) => a !== axis) : [...axes, axis])

  const handleAxisClick = (axis: Axis) => {
    if (pendingRemove === axis) {
      toggle(axis)
      setPendingRemove(null)
    } else {
      setPendingRemove(axis)
    }
  }

  const handleThemeClick = (theme: string) => {
    const key = `theme:${theme}`
    if (pendingRemove === key) {
      onRemoveTheme?.(theme)
      setPendingRemove(null)
    } else {
      setPendingRemove(key)
    }
  }

  const totalCount = axes.length + themes.length

  if (compact) {
    return (
      <>
        <button
          type="button"
          ref={refs.setReference}
          {...getReferenceProps()}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-white/12 bg-white/5 px-1.5 py-1 text-micro text-white/45 transition-all hover:border-white/25 hover:text-white/70"
        >
          <Plus size={9} />
          {totalCount > 0 ? (
            <span className="font-semibold text-white/65">{totalCount}</span>
          ) : (
            <span>Axe</span>
          )}
          <ChevronDown size={9} className="text-white/25" />
        </button>
        {open && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-bg-overlay/98 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            {AXES.map((axis) => {
              const active = axes.includes(axis)
              return (
                <Button
                  key={axis}
                  type="button"
                  onClick={() => toggle(axis)}
                  className={[
                    'cursor-pointer rounded-full px-2 py-0.5 text-micro font-semibold transition-all',
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
      </>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1" onMouseLeave={() => setPendingRemove(null)}>
      {axes.map((axis) => {
        const isPending = pendingRemove === axis
        return (
          <Tooltip key={axis} content={isPending ? `Cliquer pour retirer ${AXES_LABELS[axis]}` : AXES_LABELS[axis] ?? axis}>
            <button
              type="button"
              onClick={() => handleAxisClick(axis)}
              className={[
                'h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full transition-all',
                isPending
                  ? 'scale-125 ring-2 ring-red/70 ring-offset-1 ring-offset-transparent opacity-50'
                  : 'hover:scale-125 hover:shadow-[0_0_6px_var(--dot-glow)]',
              ].join(' ')}
              style={{
                backgroundColor: AXES_COLORS[axis],
                '--dot-glow': AXES_COLORS[axis],
              } as React.CSSProperties}
            />
          </Tooltip>
        )
      })}
      {themes.length > 0 && axes.length > 0 && (
        <span className="mx-0.5 h-2.5 w-px bg-white/10" />
      )}
      {themes.map((theme) => {
        const isPending = pendingRemove === `theme:${theme}`
        return (
          <Tooltip key={theme} content={isPending ? `Cliquer pour retirer « ${theme} »` : `Sous-thème : ${theme}`}>
            <button
              type="button"
              onClick={() => handleThemeClick(theme)}
              className={[
                'cursor-pointer rounded-full border border-dashed px-1.5 py-0 text-[0.68rem] leading-[1.4] transition-all',
                isPending
                  ? 'border-red/60 bg-red/15 text-red/85'
                  : 'border-white/25 bg-white/5 text-white/55 hover:border-white/45 hover:bg-white/10 hover:text-white/80',
              ].join(' ')}
            >
              {theme}
            </button>
          </Tooltip>
        )
      })}
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/30 transition-colors hover:border-white/35 hover:text-white/60"
      >
        <Plus size={8} />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-bg-overlay/98 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {AXES.map((axis) => {
            const active = axes.includes(axis)
            return (
              <Button
                key={axis}
                type="button"
                onClick={() => toggle(axis)}
                className={[
                  'cursor-pointer rounded-full px-2 py-0.5 text-micro font-semibold transition-all',
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

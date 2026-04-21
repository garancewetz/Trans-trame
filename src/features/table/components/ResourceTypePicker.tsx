import { useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react'
import { ChevronDown } from 'lucide-react'
import { RESOURCE_TYPES, getResourceType } from '@/common/constants/resourceTypes'

export function ResourceTypePicker({
  value,
  onChange,
  allowEmpty,
}: {
  value: string
  onChange: (v: string) => void
  /** When true, show "—" if unset and offer "Non déterminé" in the menu (clears value). */
  allowEmpty?: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasSelection = Boolean(value?.trim())
  const rt = hasSelection ? getResourceType(value) : null
  const SelectedIcon = rt?.icon

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

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex cursor-pointer items-center gap-1 rounded border border-white/12 bg-white/5 px-1.5 py-1 text-micro text-white/45 transition-all hover:border-white/25 hover:text-white/70"
        title={hasSelection && rt ? rt.label : 'Type de ressource'}
      >
        {hasSelection && SelectedIcon ? (
          <SelectedIcon size={11} />
        ) : (
          <span className="min-w-9 text-center text-micro text-white/22">—</span>
        )}
        <ChevronDown size={9} className="text-white/25" />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 flex flex-col gap-0.5 rounded-lg border border-white/10 bg-bg-overlay/98 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {allowEmpty && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={[
                'inline-flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8rem] font-medium transition-all',
                !hasSelection
                  ? 'bg-cyan/12 text-cyan/90'
                  : 'text-white/55 hover:bg-white/6 hover:text-white/85',
              ].join(' ')}
            >
              Non déterminé
            </button>
          )}
          {RESOURCE_TYPES.map(({ value: v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => { onChange(v); setOpen(false) }}
              className={[
                'inline-flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8rem] font-medium transition-all',
                v === value?.trim()
                  ? 'bg-cyan/12 text-cyan/90'
                  : 'text-white/55 hover:bg-white/6 hover:text-white/85',
              ].join(' ')}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

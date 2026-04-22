import { useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react'
import { ChevronDown, ChevronUp, ListFilter } from 'lucide-react'
import { RESOURCE_TYPES, type ResourceTypeValue } from '@/common/constants/resourceTypes'

export function TypeFilterTH({
  activeType,
  onSelect,
  sortCol,
  sortDir,
  onSort,
}: {
  activeType: ResourceTypeValue | null
  onSelect: (type: ResourceTypeValue | null) => void
  sortCol?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (col: string) => void
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

  const sortActive = sortCol === 'resourceType'
  const active = RESOURCE_TYPES.find((t) => t.value === activeType)

  return (
    <div className="flex items-center gap-1 px-2 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32">
      <button
        type="button"
        onClick={() => onSort?.('resourceType')}
        className={[
          'flex cursor-pointer select-none items-center gap-1 transition-colors hover:text-white/60',
          active ? 'text-white/70' : '',
        ].join(' ')}
      >
        {active ? active.label : 'Type'}
        {sortActive
          ? (sortDir === 'asc'
            ? <ChevronUp size={13} strokeWidth={2.5} className="text-green" />
            : <ChevronDown size={13} strokeWidth={2.5} className="text-green" />)
          : <ChevronUp size={13} strokeWidth={2.5} className="text-white/45" />}
      </button>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        title="Filtrer par type"
        className={[
          'ml-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors hover:bg-white/8 hover:text-white/70',
          active ? 'text-white/70' : '',
        ].join(' ')}
      >
        <ListFilter size={12} strokeWidth={2} />
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 grid max-h-72 min-w-[160px] grid-cols-1 gap-0.5 overflow-auto rounded-lg border border-white/10 bg-bg-overlay/95 p-1.5 font-sans text-[0.78rem] normal-case tracking-normal shadow-xl backdrop-blur-xl"
        >
          {active && (
            <button
              type="button"
              className="rounded px-2.5 py-1.5 text-left text-[0.78rem] text-white/50 transition-colors hover:bg-white/8 hover:text-white/80"
              onClick={() => { onSelect(null); setOpen(false) }}
            >
              Tous les types
            </button>
          )}
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={[
                'flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[0.78rem] transition-colors hover:bg-white/8',
                activeType === t.value ? 'bg-white/10 text-white' : 'text-white/60',
              ].join(' ')}
              onClick={() => { onSelect(activeType === t.value ? null : t.value); setOpen(false) }}
            >
              <t.icon size={12} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { Hexagon, LayoutGrid, CalendarRange } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'

const VIEWS = [
  { id: 'transmissions', label: 'Transmissions', icon: Hexagon, hint: 'Réseau des citations entre ressources' },
  { id: 'categories', label: 'Catégories', icon: LayoutGrid, hint: 'Cartographie par axe thématique' },
  { id: 'chronological', label: 'Chronologie', icon: CalendarRange, hint: 'Ressources par année de publication' },
]

type ViewSelectorProps = {
  currentView: string
  onViewChange: (id: string) => void
  inline?: boolean
  discreet?: boolean
}

export function ViewSelector({ currentView, onViewChange, inline = false, discreet = false }: ViewSelectorProps) {
  return (
    <div className={inline ? '' : 'fixed left-5 top-[66px] z-30'}>
      <div
        className={[
          'flex items-center gap-1 rounded-[8px] border border-border-default p-1 backdrop-blur-md',
          inline && discreet ? 'border-border-subtle bg-transparent p-0.5' : inline ? 'bg-white/5' : 'bg-bg-overlay/90',
        ].join(' ')}
      >
        {VIEWS.map((item) => {
          const { id, label, hint } = item
          const Icon = item.icon
          const active = currentView === id
          const tooltip = `${label} - ${hint}`
          return (
            <Tooltip key={id} content={tooltip}>
              <Button
                onClick={() => onViewChange(id)}
                aria-label={tooltip}
                className={[
                  'flex items-center gap-1.5 rounded-full transition-all cursor-pointer',
                  inline && discreet
                    ? 'px-2 py-1 text-micro font-medium tracking-[0.3px]'
                    : 'px-3 py-1.5 text-caption font-semibold uppercase tracking-[1px]',
                  active
                    ? inline && discreet
                      ? 'bg-violet/30 text-white ring-1 ring-violet/50'
                      : 'bg-[rgba(109,95,255,0.6)] text-white'
                    : 'text-text-soft hover:text-white/80 hover:bg-white/5',
                ].join(' ')}
              >
                <Icon size={13} />
                <span className={inline && discreet ? 'hidden' : 'hidden sm:inline'}>{label}</span>
              </Button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

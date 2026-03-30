import { Orbit, GitFork } from 'lucide-react'

const VIEWS = [
  { id: 'constellation', label: 'Constellation', icon: Orbit, hint: 'Exploration libre' },
  { id: 'genealogy', label: 'Généalogie', icon: GitFork, hint: 'Frise chronologique en arcs' },
]

export default function ViewSelector({ currentView, onViewChange, inline = false, discreet = false }) {
  return (
    <div className={inline ? '' : 'fixed left-5 top-[66px] z-30'}>
      <div
        className={[
          'flex items-center gap-1 rounded-[8px] border border-white/10 p-1 backdrop-blur-md',
          inline && discreet ? 'border-white/5 bg-transparent p-0.5' : inline ? 'bg-white/5' : 'bg-[rgba(8,12,30,0.9)]',
        ].join(' ')}
      >
        {VIEWS.map((item) => {
          const { id, label, hint } = item
          const Icon = item.icon
          const active = currentView === id
          const tooltip = `${label} - ${hint}`
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              title={tooltip}
              aria-label={tooltip}
              className={[
                'flex items-center gap-1.5 rounded-full transition-all cursor-pointer',
                inline && discreet
                  ? 'px-2 py-1 text-[0.62rem] font-medium tracking-[0.3px]'
                  : 'px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[1px]',
                active
                  ? inline && discreet
                    ? 'bg-white/12 text-white/85'
                    : 'bg-[rgba(109,95,255,0.6)] text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={13} />
              <span className={inline && discreet ? 'hidden' : 'hidden sm:inline'}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

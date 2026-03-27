import { Orbit, GitFork } from 'lucide-react'

const VIEWS = [
  { id: 'constellation', label: 'Constellation', icon: Orbit, hint: 'Exploration libre' },
  { id: 'genealogy', label: 'Généalogie', icon: GitFork, hint: 'Frise chronologique en arcs' },
]

export default function ViewSelector({ currentView, onViewChange }) {
  return (
    <div className="fixed left-5 top-[66px] z-30">
      <div className="flex items-center gap-1 rounded-[8px] border border-white/10 bg-[rgba(8,12,30,0.9)] p-1 backdrop-blur-md">
        {VIEWS.map(({ id, label, icon: Icon, hint }) => {
          const active = currentView === id
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              title={hint}
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[1px] transition-all cursor-pointer',
                active
                  ? 'bg-[rgba(109,95,255,0.6)] text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

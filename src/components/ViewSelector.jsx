import { Orbit, GitFork } from 'lucide-react'

const VIEWS = [
  { id: 'constellation', label: 'Constellation', icon: Orbit, hint: 'Exploration libre 3D' },
  { id: 'genealogy', label: 'Généalogie', icon: GitFork, hint: 'Frise chronologique en arcs' },
]

export default function ViewSelector({ currentView, onViewChange }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(8,4,20,0.9)] px-2 py-1.5 backdrop-blur-md">
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
                  ? 'bg-white/12 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5',
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

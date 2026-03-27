import { Tags } from 'lucide-react'

export default function Legend({
  axesColors,
  activeFilter,
  hoveredFilter,
  toggleFilter,
  setHoveredFilter,
  clearFilter,
}) {
  return (
    <div className="fixed bottom-24 left-3 z-20 flex flex-col gap-2 rounded-[10px] border border-white/10 bg-[rgba(6,3,15,0.45)] px-4 py-3 backdrop-blur-2xl">
      <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[2px] text-white/30">
        <Tags size={12} />
        Catégories
      </span>
      {Object.entries(axesColors).map(([axis, color]) => {
        const isActive = activeFilter === axis
        const isHovered = hoveredFilter === axis
        return (
          <button
            key={axis}
            className={[
              'flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left text-[0.72rem] font-medium uppercase tracking-[0.5px] transition-all backdrop-blur-lg',
              isActive ? 'border-white/20 bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80',
            ].join(' ')}
            onClick={() => toggleFilter(axis)}
            onMouseEnter={() => setHoveredFilter(axis)}
            onMouseLeave={() => setHoveredFilter(null)}
            type="button"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full transition-all backdrop-blur-md"
              style={{
                backgroundColor: color,
                boxShadow: isActive || isHovered ? `0 0 10px 2px ${color}` : 'none',
              }}
            />
            {axis}
          </button>
        )
      })}
      {activeFilter && (
        <button
          className="mt-1 cursor-pointer rounded-md bg-white/5 px-2 py-1 text-[0.68rem] text-white/40 backdrop-blur-lg transition-colors hover:bg-white/10 hover:text-white/70"
          onClick={clearFilter}
          type="button"
        >
          Tout afficher
        </button>
      )}
    </div>
  )
}


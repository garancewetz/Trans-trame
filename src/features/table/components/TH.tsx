import { ChevronDown, ChevronUp } from 'lucide-react'

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronUp size={10} className="text-white/18" />
  return dir === 'asc' ? (
    <ChevronUp size={10} className="text-green" />
  ) : (
    <ChevronDown size={10} className="text-green" />
  )
}

export function TH({ col, activeCol, dir, onSort, children, className = '' }: {
  col: string
  activeCol: string
  dir: 'asc' | 'desc'
  onSort: (col: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-micro font-semibold uppercase tracking-[1.5px] text-white/32 transition-colors hover:text-white/60 ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children} <SortIcon active={activeCol === col} dir={dir} />
      </span>
    </th>
  )
}

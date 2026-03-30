import { TriangleAlert } from 'lucide-react'
import { axesGradient } from '@/lib/categories'
import { bookAuthorDisplay } from '@/lib/authorUtils'

export default function DuplicateWarning({ possibleDuplicates, authorsMap }) {
  if (!possibleDuplicates || possibleDuplicates.length === 0) return null

  return (
    <div className="rounded-[10px] border border-[rgba(255,204,0,0.3)] bg-[rgba(255,204,0,0.06)] px-4 py-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-[rgba(255,204,0,0.9)]">
        <TriangleAlert size={14} /> Doublon possible d&eacute;tect&eacute;
      </p>
      <ul className="flex list-none flex-col gap-1.5">
        {possibleDuplicates.map((n) => (
          <li key={n.id} className="flex items-center gap-2 text-[0.8rem] text-white/60">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: axesGradient(n.axes) }}
            />
            <span>
              <strong className="text-white/80">{n.title}</strong> {' '}&mdash; {bookAuthorDisplay(n, authorsMap)}, {n.year}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

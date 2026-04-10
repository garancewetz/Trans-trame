import { TriangleAlert } from 'lucide-react'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'

type Props = {
  possibleDuplicates: Book[]
  authorsMap: Map<string, AuthorNode>
}

export function DuplicateWarning({ possibleDuplicates, authorsMap }: Props) {
  if (!possibleDuplicates || possibleDuplicates.length === 0) return null

  return (
    <div className="rounded-[10px] border border-amber/30 bg-amber/6 px-4 py-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-amber/90">
        <TriangleAlert size={14} /> Doublon possible d&eacute;tect&eacute;
      </p>
      <ul className="flex list-none flex-col gap-1.5">
        {possibleDuplicates.map((n) => (
          <li key={n.id} className="flex items-center gap-2 text-[0.9rem] text-white/60">
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

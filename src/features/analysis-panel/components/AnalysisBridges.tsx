import clsx from 'clsx'
import { Waypoints } from 'lucide-react'
import { axisColor } from '@/common/utils/categories'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Highlight } from '@/core/FilterContext'

type BridgeNode = {
  id: string
  title?: string
  axes?: string[]
  authorIds?: string[]
  bridges: number
  ratio: number
}

type AnalysisBridgesProps = {
  bridges: BridgeNode[]
  authorsMap: Map<string, AuthorNode>
  activeHighlight: Highlight | null
  onHighlightChange: (h: Highlight | null) => void
}

export function AnalysisBridges({ bridges, authorsMap, activeHighlight, onHighlightChange }: AnalysisBridgesProps) {
  if (bridges.length === 0) return null

  return (
    <section className="mb-5">
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-text-soft">
        <Waypoints size={12} /> Ponts inter-axes
      </h3>
      <p className="mb-2 text-micro text-text-secondary">
        Œuvres qui relient des axes différents — coutures de la trame.
      </p>
      <div className="flex flex-col gap-1.5">
        {bridges.map((node) => {
          const isActive = activeHighlight?.kind === 'book' && activeHighlight.bookId === node.id
          const pct = Math.round(node.ratio * 100)
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onHighlightChange(isActive ? null : { kind: 'book', bookId: node.id })}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left backdrop-blur-xl transition-all',
                isActive ? 'border-white/25 bg-white/12' : 'border-border-default bg-white/5 hover:border-white/15 hover:bg-white/8',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-ui font-semibold ${isActive ? 'text-white' : 'text-white/85'}`}>{node.title}</p>
                <p className="text-caption text-text-secondary">
                  {bookAuthorDisplay(node, authorsMap)} — {node.bridges} lien{node.bridges > 1 ? 's' : ''} transversal{node.bridges > 1 ? 'aux' : ''} ({pct}%)
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {(node.axes || []).slice(0, 3).map((a) => (
                  <span
                    key={a}
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: axisColor(a) }}
                    title={a}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

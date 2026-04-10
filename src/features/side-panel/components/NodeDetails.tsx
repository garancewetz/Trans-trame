import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Pencil,
  ArrowRight,
  ArrowLeft,
  Link2,
} from 'lucide-react'
import {
  LINK_CITED_BY_COLOR_STRONG,
  LINK_CITED_BY_ICON,
  LINK_CITED_BY_ROW_BORDER,
  LINK_CITED_BY_ROW_HOVER_BG,
  LINK_CITES_COLOR_STRONG,
  LINK_CITES_ICON,
  LINK_CITES_ROW_BORDER,
  LINK_CITES_ROW_HOVER_BG,
  LINK_CITES_COLOR,
  LINK_CITED_BY_COLOR,
} from '@/common/constants/linkRelationColors'
import { mapBookUrlSearch } from '@/common/utils/bookSlug'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { AXES_COLORS } from '@/common/utils/categories'
import { AxisBadge } from '@/common/components/ui/AxisBadge'
import { Button } from '@/common/components/ui/Button'
import { linkExcerpt, refMetaLine } from '@/features/books/workPageCopy'
import { getOutgoingRefs, getIncomingRefs, computeSameAuthorBooks } from '@/features/graph/graphRelations'
import { useSelection } from '@/core/SelectionContext'
import { useAppData } from '@/core/AppDataContext'
import { useTableUi } from '@/core/TableUiContext'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Book, Link as GraphLink } from '@/types/domain'

type RefVariant = 'cites' | 'citedBy'

const PANEL_REF_ROW_STYLES: Record<
  RefVariant,
  { border: string; hoverBg: string; accent: string; label: string }
> = {
  cites: {
    border: LINK_CITES_ROW_BORDER,
    hoverBg: LINK_CITES_ROW_HOVER_BG,
    accent: LINK_CITES_COLOR,
    label: 'Cite',
  },
  citedBy: {
    border: LINK_CITED_BY_ROW_BORDER,
    hoverBg: LINK_CITED_BY_ROW_HOVER_BG,
    accent: LINK_CITED_BY_COLOR,
    label: 'Cité par',
  },
}

function PanelRefRow({
  variant,
  title,
  meta,
  excerpt,
  onClick,
}: {
  variant: RefVariant
  title?: string
  meta?: string
  excerpt?: string
  onClick: () => void
}) {
  const s = PANEL_REF_ROW_STYLES[variant]
  const excerptText = excerpt?.trim()

  return (
    <li className="border-b border-white/6 last:border-0">
      <button
        type="button"
        className="group block w-full cursor-pointer rounded-r-lg border-l-2 py-4 pl-3 text-left transition-colors hover:bg-(--ref-hover-bg) focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        style={{
          borderLeftColor: s.border,
          ['--ref-hover-bg' as string]: s.hoverBg,
        }}
        onClick={onClick}
      >
        <span
          className="mb-1 inline-flex items-center gap-1 text-[0.75rem] font-bold uppercase tracking-[0.04em]"
          style={{ color: s.accent }}
        >
          <Link2 size={10} /> {s.label}
        </span>
        <span className="block text-[0.95rem] font-medium text-white/88 group-hover:text-white">
          {title ?? '—'}
        </span>
        {meta ? <span className="mt-1 block text-[0.85rem] text-white/32">{meta}</span> : null}
        {excerptText ? (
          <p className="mt-2.5 text-[0.92rem] leading-relaxed text-white/38">&ldquo;{excerptText}&rdquo;</p>
        ) : null}
      </button>
    </li>
  )
}

export function NodeDetails() {
  const {
    selectedNode,
    setSelectedLink,
    setLinkContextNode,
    selectNode,
  } = useSelection()
  const { graphData, authorsMap } = useAppData()
  const { openTable } = useTableUi()

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, selectedNode), [graphData, selectedNode])

  if (!selectedNode) return null
  const map = authorsMap || new Map<string, AuthorNode>()
  const axes = (selectedNode.axes || []).filter(Boolean)

  return (
    <div className="px-6 pb-10 pt-14 text-text-main">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {axes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {axes.map((axis) => (
                <AxisBadge key={axis} color={(AXES_COLORS as Record<string, string>)?.[axis] ?? '#94a3b8'}>
                  {axis}
                </AxisBadge>
              ))}
            </div>
          )}
          <h2 className="text-[1.5rem] font-semibold leading-[1.2] tracking-tight text-white md:text-[1.65rem]">
            {selectedNode.title}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-white/42">
            {bookAuthorDisplay(selectedNode, map)}
            {selectedNode.year != null && (
              <span className="text-white/28"> · {selectedNode.year}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            className="cursor-pointer rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-[0.8rem] font-medium text-white/30 transition-colors hover:border-white/18 hover:bg-white/4 hover:text-white/60"
            onClick={() => openTable('books', null, selectedNode.id)}
            title="Ouvrir dans le catalogue contributeurs"
          >
            <span className="inline-flex items-center gap-1.5">
              <Pencil size={11} /> Éditer
            </span>
          </Button>
        </div>
      </div>

      {selectedNode.description ? (
        <p className="mb-12 text-[0.92rem] leading-[1.7] text-white/48">{selectedNode.description}</p>
      ) : null}

      {sameAuthorBooks.length > 0 && (
        <section className="mb-12">
          <h3 className="mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-white/28">
            Même auteur
          </h3>
          <ul className="divide-y divide-white/6">
            {sameAuthorBooks.map((n: Book) => (
              <li key={n.id} className="py-3.5 first:pt-0">
                <button
                  type="button"
                  className="block w-full cursor-pointer text-left text-[0.92rem] text-white/75 transition-colors hover:text-white"
                  onClick={() => selectNode(n)}
                >
                  <span className="font-medium">{n.title}</span>
                  {n.year != null && (
                    <span className="ml-2 text-[0.9rem] font-normal text-white/30">{n.year}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

<div className="space-y-10">
        {getOutgoingRefs(graphData, selectedNode).length > 0 && (
          <section>
            <h3
              className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em]"
              style={{ color: LINK_CITES_COLOR_STRONG }}
            >
              <ArrowRight size={13} style={{ color: LINK_CITES_ICON }} />
              Références citées
            </h3>
            <ul>
              {getOutgoingRefs(graphData, selectedNode).map(({ link, other }: { link: GraphLink; other: Book | undefined }, i: number) => (
                <PanelRefRow
                  key={link.id ?? `o-${i}`}
                  variant="cites"
                  title={other?.title}
                  meta={refMetaLine(other, link, map)}
                  excerpt={linkExcerpt(link)}
                  onClick={() => {
                    setLinkContextNode(selectedNode)
                    setSelectedLink(link)
                  }}
                />
              ))}
            </ul>
          </section>
        )}

        {getIncomingRefs(graphData, selectedNode).length > 0 && (
          <section>
            <h3
              className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em]"
              style={{ color: LINK_CITED_BY_COLOR_STRONG }}
            >
              <ArrowLeft size={13} style={{ color: LINK_CITED_BY_ICON }} />
              Cité par
            </h3>
            <ul>
              {getIncomingRefs(graphData, selectedNode).map(({ link, other }: { link: GraphLink; other: Book | undefined }, i: number) => (
                <PanelRefRow
                  key={link.id ?? `i-${i}`}
                  variant="citedBy"
                  title={other?.title}
                  meta={refMetaLine(other, link, map)}
                  excerpt={linkExcerpt(link)}
                  onClick={() => {
                    setLinkContextNode(selectedNode)
                    setSelectedLink(link)
                  }}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

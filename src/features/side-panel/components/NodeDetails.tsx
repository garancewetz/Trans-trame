import { useMemo, useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useHover, useDismiss, useInteractions, useClick } from '@floating-ui/react'
import { Link } from 'react-router-dom'
import {
  Pencil,
  ArrowRight,
  ArrowLeft,
  BookCopy,
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
import { Tooltip } from '@/common/components/ui/Tooltip'
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

function PanelWorkBadge({
  siblings,
  authorsMap,
}: {
  siblings: Book[]
  authorsMap: Map<string, AuthorNode>
}) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const hover = useHover(context, { delay: { open: 150, close: 200 } })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="ml-2 inline-flex shrink-0"
      >
        <Tooltip content="Fait partie d'une même œuvre">
          <span className="inline-flex cursor-pointer items-center rounded px-1 py-0.5 text-amber/60 transition-colors hover:text-amber">
            <BookCopy size={15} />
          </span>
        </Tooltip>
      </span>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 min-w-80 max-w-md rounded-lg border border-white/10 bg-bg-overlay/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-widest text-white/35">
            Éditions de cette œuvre ({siblings.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {siblings.map((s) => (
              <li key={s.id} className="flex gap-2 text-[0.82rem] leading-snug">
                <span className="mt-0.5 shrink-0 text-amber/40">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {s.title}
                    {s.year != null && (
                      <span className="ml-1.5 font-mono text-[0.72rem] text-white/30">{s.year}</span>
                    )}
                  </span>
                  {(s.authorIds?.length ?? 0) > 0 && (
                    <span className="text-[0.72rem] text-white/25">
                      {bookAuthorDisplay(s, authorsMap)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export function NodeDetails() {
  const {
    selectedNode,
    setSelectedLink,
    setLinkContextNode,
    selectNode,
  } = useSelection()
  const { graphData, books, authorsMap } = useAppData()
  const { openTable } = useTableUi()

  // Resolve to the collapsed oeuvre node from graphData so we always display
  // original title, merged authors, earliest year, etc.
  const node = useMemo(() => {
    if (!selectedNode) return null
    return graphData.nodes.find((n) => n.id === selectedNode.id) ?? selectedNode
  }, [graphData, selectedNode])

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, node), [graphData, node])

  const outgoingRefs = useMemo(() => node ? getOutgoingRefs(graphData, node) : [], [graphData, node])
  const incomingRefs = useMemo(() => node ? getIncomingRefs(graphData, node) : [], [graphData, node])

  /** All raw editions sharing the same originalTitle as the selected oeuvre node. */
  const workEditions = useMemo(() => {
    if (!node?.originalTitle) return []
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
    const key = norm(node.originalTitle)
    if (!key) return []
    const editions = books.filter((b) => b.originalTitle && norm(b.originalTitle) === key)
    return editions.length >= 2 ? editions : []
  }, [books, node])

  if (!node) return null
  const map = authorsMap || new Map<string, AuthorNode>()
  const axes = (node.axes || []).filter(Boolean)

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
          <h2 className="flex items-center gap-1 text-[1.5rem] font-semibold leading-[1.2] tracking-tight text-white md:text-[1.65rem]">
            {node.title}
            {workEditions.length > 0 && (
              <PanelWorkBadge siblings={workEditions} authorsMap={map} />
            )}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-white/42">
            {bookAuthorDisplay(node, map)}
            {node.year != null && (
              <span className="text-white/28"> · {node.year}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            className="cursor-pointer rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-[0.8rem] font-medium text-white/30 transition-colors hover:border-white/18 hover:bg-white/4 hover:text-white/60"
            onClick={() => openTable('books', null, node.id)}
            title="Ouvrir dans le catalogue contributeurs"
          >
            <span className="inline-flex items-center gap-1.5">
              <Pencil size={11} /> Éditer
            </span>
          </Button>
        </div>
      </div>

      {node.description ? (
        <p className="mb-12 text-[0.92rem] leading-[1.7] text-white/48">{node.description}</p>
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
        {outgoingRefs.length > 0 && (
          <section>
            <h3
              className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em]"
              style={{ color: LINK_CITES_COLOR_STRONG }}
            >
              <ArrowRight size={13} style={{ color: LINK_CITES_ICON }} />
              Références citées
            </h3>
            <ul>
              {outgoingRefs.map(({ link, other }: { link: GraphLink; other: Book | undefined }, i: number) => (
                <PanelRefRow
                  key={link.id ?? `o-${i}`}
                  variant="cites"
                  title={other?.title}
                  meta={refMetaLine(other, link, map)}
                  excerpt={linkExcerpt(link)}
                  onClick={() => {
                    setLinkContextNode(node)
                    setSelectedLink(link)
                  }}
                />
              ))}
            </ul>
          </section>
        )}

        {incomingRefs.length > 0 && (
          <section>
            <h3
              className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em]"
              style={{ color: LINK_CITED_BY_COLOR_STRONG }}
            >
              <ArrowLeft size={13} style={{ color: LINK_CITED_BY_ICON }} />
              Cité par
            </h3>
            <ul>
              {incomingRefs.map(({ link, other }: { link: GraphLink; other: Book | undefined }, i: number) => (
                <PanelRefRow
                  key={link.id ?? `i-${i}`}
                  variant="citedBy"
                  title={other?.title}
                  meta={refMetaLine(other, link, map)}
                  excerpt={linkExcerpt(link)}
                  onClick={() => {
                    setLinkContextNode(node)
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

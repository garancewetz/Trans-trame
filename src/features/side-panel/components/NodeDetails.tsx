import { useMemo, useState, type ReactNode } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useHover, useDismiss, useInteractions, useClick } from '@floating-ui/react'
import {
  Pencil,
  BookCopy,
  ChevronDown,
} from 'lucide-react'
import {
  LINK_CITED_BY_COLOR_STRONG,
  LINK_CITED_BY_ROW_BORDER,
  LINK_CITED_BY_ROW_HOVER_BG,
  LINK_CITES_COLOR_STRONG,
  LINK_CITES_ROW_BORDER,
  LINK_CITES_ROW_HOVER_BG,
} from '@/common/constants/linkRelationColors'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { AXES_COLORS, splitBookAxes } from '@/common/utils/categories'
import { Badge } from '@/common/components/ui/Badge'
import { Tooltip } from '@/common/components/ui/Tooltip'
import { Button } from '@/common/components/ui/Button'
import { SectionHeading } from '@/common/components/ui/SectionHeading'
import { AuthorLinks } from '@/common/components/AuthorLinks'
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
  { border: string; hoverBg: string; accentStrong: string }
> = {
  cites: {
    border: LINK_CITES_ROW_BORDER,
    hoverBg: LINK_CITES_ROW_HOVER_BG,
    accentStrong: LINK_CITES_COLOR_STRONG,
  },
  citedBy: {
    border: LINK_CITED_BY_ROW_BORDER,
    hoverBg: LINK_CITED_BY_ROW_HOVER_BG,
    accentStrong: LINK_CITED_BY_COLOR_STRONG,
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
    <li>
      <button
        type="button"
        className="group relative block w-full cursor-pointer rounded-r-md border-l-2 py-3.5 pl-4 pr-2 text-left transition-[background-color,border-color,padding] duration-200 ease-out hover:border-l-(--ref-accent-strong) hover:bg-(--ref-hover-bg) hover:pl-5 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        style={{
          borderLeftColor: s.border,
          ['--ref-hover-bg' as string]: s.hoverBg,
          ['--ref-accent-strong' as string]: s.accentStrong,
        }}
        onClick={onClick}
      >
        <span className="block text-[0.95rem] font-medium leading-snug text-white/85 transition-colors group-hover:text-white">
          {title ?? '—'}
        </span>
        {meta ? (
          <span className="mt-1.5 block text-[0.8rem] tracking-wide text-white/45">
            {meta}
          </span>
        ) : null}
        {excerptText ? (
          <p className="mt-2.5 text-[0.9rem] italic leading-relaxed text-white/58">
            {excerptText}
          </p>
        ) : null}
      </button>
    </li>
  )
}

const COLLAPSED_REF_COUNT = 6

function CollapsibleRefList({
  items,
  variant,
  renderItem,
}: {
  items: Array<{ link: GraphLink; other: Book | undefined }>
  variant: RefVariant
  renderItem: (entry: { link: GraphLink; other: Book | undefined }, index: number) => ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = PANEL_REF_ROW_STYLES[variant].accentStrong
  const overflow = items.length - COLLAPSED_REF_COUNT
  const canCollapse = overflow > 0
  const visibleItems = !canCollapse || expanded ? items : items.slice(0, COLLAPSED_REF_COUNT)

  return (
    <>
      <ul className="relative divide-y divide-white/5">
        {visibleItems.map(renderItem)}
        {canCollapse && !expanded && (
          <li
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-bg-overlay to-transparent"
          />
        )}
      </ul>
      {canCollapse && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/8 bg-white/1.5 px-3.5 py-1.5 text-micro font-medium uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white/85"
          >
            {expanded ? (
              'Réduire'
            ) : (
              <>
                Voir{' '}
                <span style={{ color: accent }} className="font-semibold">
                  {overflow}
                </span>{' '}
                autres
              </>
            )}
            <ChevronDown
              size={11}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      )}
    </>
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
        className="mt-1.5 inline-flex shrink-0"
      >
        <Tooltip content="Fait partie d'une même œuvre">
          <span className="inline-flex cursor-pointer items-center rounded-full p-1 text-amber/55 transition-colors hover:bg-amber/10 hover:text-amber/95">
            <BookCopy size={13} />
          </span>
        </Tooltip>
      </span>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 min-w-80 max-w-md rounded-lg border border-white/10 bg-bg-base/95 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-widest text-white/35">
            Éditions de cette œuvre ({siblings.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {siblings.map((s) => (
              <li key={s.id} className="flex gap-2 text-label leading-snug">
                <span className="mt-0.5 shrink-0 text-amber/40">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {s.title}
                    {s.year != null && (
                      <span className="ml-1.5 font-mono text-micro text-white/30">{s.year}</span>
                    )}
                  </span>
                  {(s.authorIds?.length ?? 0) > 0 && (
                    <span className="text-micro text-white/25">
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
  const { axes, themes } = splitBookAxes(node.axes)

  return (
    <div className="px-6 pb-10 pt-12 text-text-main">
      <header className="mb-9 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {(axes.length > 0 || themes.length > 0) && (
            <div className="mb-5 flex flex-wrap items-center gap-1.5">
              {axes.map((axis) => (
                <Badge
                  key={axis}
                  variant="axis"
                  color={(AXES_COLORS as Record<string, string>)?.[axis] ?? '#94a3b8'}
                >
                  {axis}
                </Badge>
              ))}
              {themes.map((theme) => (
                <span
                  key={`theme-${theme}`}
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/4 px-2 py-0.5 text-[0.7rem] font-medium lowercase tracking-wide text-white/55"
                  title={`Thème secondaire : UNCATEGORIZED:${theme}`}
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
          <h2 className="flex items-start gap-1.5 text-[1.5rem] font-semibold leading-[1.18] tracking-tight text-white md:text-[1.7rem]">
            <span className="min-w-0">{node.title}</span>
            {workEditions.length > 0 && (
              <PanelWorkBadge siblings={workEditions} authorsMap={map} />
            )}
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/55">
            <AuthorLinks book={node} authors={map} />
            {node.year != null && (
              <span className="text-white/32"> · {node.year}</span>
            )}
          </p>
        </div>
        <Button
          variant="icon"
          iconDensity="soft"
          className="shrink-0"
          onClick={() => openTable('books', null, node.id)}
          title="Éditer la fiche"
          aria-label="Éditer la fiche"
        >
          <Pencil size={14} />
        </Button>
      </header>

      {node.description ? (
        <p className="mb-10 text-[0.93rem] leading-[1.7] text-white/55">{node.description}</p>
      ) : null}

      {sameAuthorBooks.length > 0 && (
        <section className="mb-10">
          <SectionHeading>
            Même auteur·ice
            <Badge variant="count" count={sameAuthorBooks.length} className="ml-1 text-micro font-normal tracking-normal text-white/25" />
          </SectionHeading>
          <ul className="divide-y divide-white/5">
            {sameAuthorBooks.map((n: Book) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="block w-full cursor-pointer py-3 text-left text-body text-white/72 transition-colors hover:text-white"
                  onClick={() => selectNode(n)}
                >
                  <span className="font-medium">{n.title}</span>
                  {n.year != null && (
                    <span className="ml-2 text-[0.88rem] font-normal text-white/32">{n.year}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-10">
        {incomingRefs.length > 0 && (
          <section>
            <SectionHeading accent={LINK_CITED_BY_COLOR_STRONG}>
              Cité par
              <Badge variant="count" count={incomingRefs.length} className="ml-1 text-micro font-normal tracking-normal text-white/30" />
            </SectionHeading>
            <CollapsibleRefList
              items={incomingRefs}
              variant="citedBy"
              renderItem={({ link, other }, i) => (
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
              )}
            />
          </section>
        )}

        {outgoingRefs.length > 0 && (
          <section>
            <SectionHeading accent={LINK_CITES_COLOR_STRONG}>
              Références citées
              <Badge variant="count" count={outgoingRefs.length} className="ml-1 text-micro font-normal tracking-normal text-white/30" />
            </SectionHeading>
            <CollapsibleRefList
              items={outgoingRefs}
              variant="cites"
              renderItem={({ link, other }, i) => (
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
              )}
            />
          </section>
        )}
      </div>
    </div>
  )
}


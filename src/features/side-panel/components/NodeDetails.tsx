import { useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { LINK_CITED_BY_COLOR_STRONG, LINK_CITES_COLOR_STRONG } from '@/common/constants/linkRelationColors'
import { splitBookAxes, axisColor } from '@/common/utils/categories'
import { Badge } from '@/common/components/ui/Badge'
import { Button } from '@/common/components/ui/Button'
import { SectionHeading } from '@/common/components/ui/SectionHeading'
import { AuthorLinks } from '@/common/components/AuthorLinks'
import { linkExcerpt, refMetaLine } from '@/features/books/workPageCopy'
import { getOutgoingRefs, getIncomingRefs, computeSameAuthorBooks } from '@/features/graph/graphRelations'
import { useSelection } from '@/core/SelectionContext'
import { useAppData } from '@/core/AppDataContext'
import { useTableUi } from '@/core/TableUiContext'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Book } from '@/types/domain'
import { PanelRefRow, CollapsibleRefList } from './PanelRefRow'
import { PanelWorkBadge } from './PanelWorkBadge'

export function NodeDetails() {
  const {
    selectedNode,
    setSelectedLink,
    setLinkContextNode,
    selectNode,
  } = useSelection()
  const { graphData, books, authorsMap } = useAppData()
  const { openTable } = useTableUi()

  const node = useMemo(() => {
    if (!selectedNode) return null
    return graphData.nodes.find((n) => n.id === selectedNode.id) ?? selectedNode
  }, [graphData, selectedNode])

  const sameAuthorBooks = useMemo(() => computeSameAuthorBooks(graphData, node), [graphData, node])
  const outgoingRefs = useMemo(() => node ? getOutgoingRefs(graphData, node) : [], [graphData, node])
  const incomingRefs = useMemo(() => node ? getIncomingRefs(graphData, node) : [], [graphData, node])

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
                  color={axisColor(axis) ?? '#94a3b8'}
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

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  LINK_CITED_BY_ROW_BORDER,
  LINK_CITED_BY_ROW_HOVER_BG,
  LINK_CITED_BY_COLOR_STRONG,
  LINK_CITES_ROW_BORDER,
  LINK_CITES_ROW_HOVER_BG,
  LINK_CITES_COLOR_STRONG,
} from '@/common/constants/linkRelationColors'
import { citationMetaLine } from '@/features/books/workPageCopy'
import { ThemePill } from '@/common/components/ui/ThemePill'
import type { Link as GraphLink, LinkCitation } from '@/types/domain'

export type RefVariant = 'cites' | 'citedBy'

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

function hasContent(c: LinkCitation): boolean {
  return Boolean(c.citation_text?.trim() || c.page?.trim() || c.edition?.trim() || c.context?.trim())
}

function citationExcerpt(c: LinkCitation): string {
  return (c.citation_text || c.context || '').trim()
}

function SingleCitationBlock({ citation }: { citation: LinkCitation }) {
  const meta = citationMetaLine({ ...citation })
  const excerpt = citationExcerpt(citation)
  if (!meta && !excerpt) return null
  return (
    <>
      {meta ? (
        <span className="mt-1.5 block text-[0.8rem] tracking-wide text-white/45">{meta}</span>
      ) : null}
      {excerpt ? (
        <p className="mt-2.5 text-[0.9rem] italic leading-relaxed text-white/58">{excerpt}</p>
      ) : null}
    </>
  )
}

function MultiCitationList({
  citations,
  onSelect,
  accentStrong,
}: {
  citations: LinkCitation[]
  onSelect: (citation: LinkCitation) => void
  accentStrong: string
}) {
  return (
    <ul className="mt-2 space-y-1">
      {citations.map((c, i) => {
        const meta = citationMetaLine({ ...c })
        const excerpt = citationExcerpt(c)
        return (
          <li key={c.id}>
            <button
              type="button"
              className="group/cite block w-full cursor-pointer rounded-md border border-white/6 bg-white/2 px-3 py-2 text-left transition-colors hover:border-(--cite-accent) hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              style={{ ['--cite-accent' as string]: accentStrong }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(c)
              }}
            >
              <span className="flex items-center gap-2 text-micro font-semibold uppercase tracking-[1px] text-white/35 transition-colors group-hover/cite:text-white/60">
                <span style={{ color: accentStrong }}>·</span>
                Citation {i + 1}
                {meta ? <span className="font-normal normal-case tracking-wide text-white/40">{meta}</span> : null}
              </span>
              {excerpt ? (
                <p className="mt-1.5 text-[0.88rem] italic leading-relaxed text-white/62">{excerpt}</p>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function PanelRefRow({
  variant,
  title,
  meta,
  link,
  onSelectLink,
}: {
  variant: RefVariant
  title?: string
  meta?: string
  link: GraphLink
  /** Invoked with the parent link (if the user clicks the row/single-citation) or
   *  with a specific citation (multi-citation mode). LinkDetails uses the link
   *  to render the couple header; the specific citation is surfaced via a
   *  separate route later. */
  onSelectLink: (link: GraphLink, citation?: LinkCitation) => void
}) {
  const s = PANEL_REF_ROW_STYLES[variant]
  const citations = (link.citations ?? []).filter(hasContent)
  const isSingle = citations.length <= 1
  const singleCitation = citations[0]

  const rowContent = (
    <>
      <span className="block text-[0.95rem] font-medium leading-snug text-white/85 transition-colors group-hover:text-white">
        {title ?? '—'}
      </span>
      {meta ? (
        <span className="mt-1.5 block text-[0.8rem] tracking-wide text-white/45">{meta}</span>
      ) : null}
      {isSingle && singleCitation ? <SingleCitationBlock citation={singleCitation} /> : null}
      {!isSingle ? (
        <MultiCitationList
          citations={citations}
          onSelect={(c) => onSelectLink(link, c)}
          accentStrong={s.accentStrong}
        />
      ) : null}
    </>
  )

  const sharedStyle = {
    borderLeftColor: s.border,
    ['--ref-hover-bg' as string]: s.hoverBg,
    ['--ref-accent-strong' as string]: s.accentStrong,
  } as React.CSSProperties

  return (
    <li>
      {isSingle ? (
        <button
          type="button"
          className="group relative block w-full cursor-pointer rounded-r-md border-l-2 py-3.5 pl-4 pr-2 text-left transition-[background-color,border-color,padding] duration-200 ease-out hover:border-l-(--ref-accent-strong) hover:bg-(--ref-hover-bg) hover:pl-5 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          style={sharedStyle}
          onClick={() => onSelectLink(link, singleCitation)}
        >
          {rowContent}
        </button>
      ) : (
        <div
          className="group relative block rounded-r-md border-l-2 py-3.5 pl-4 pr-2 transition-[border-color] duration-200 ease-out hover:border-l-(--ref-accent-strong)"
          style={sharedStyle}
        >
          {rowContent}
        </div>
      )}
    </li>
  )
}

const COLLAPSED_REF_COUNT = 6

export function CollapsibleRefList<T>({
  items,
  variant,
  renderItem,
}: {
  items: T[]
  variant: RefVariant
  renderItem: (entry: T, index: number) => ReactNode
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

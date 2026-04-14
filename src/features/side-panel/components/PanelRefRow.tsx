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
import type { Book, Link as GraphLink } from '@/types/domain'

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

export function PanelRefRow({
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

export function CollapsibleRefList({
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

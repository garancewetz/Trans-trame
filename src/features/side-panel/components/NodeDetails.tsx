import { Pencil, ArrowRight, ArrowLeft, Plus } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { AxisBadge } from '@/common/components/ui/AxisBadge'
import { Button } from '@/common/components/ui/Button'
import { SectionHeading } from '@/common/components/ui/SectionHeading'
import { ReferenceRow } from '@/common/components/ui/ReferenceRow'

export function NodeDetails({
  selectedNode,
  AXES_COLORS,
  sameAuthorBooks,
  authorsMap,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  setLinkContextNode,
  onOpenTable,
  getOutgoingRefs,
  getIncomingRefs,
}) {
  const displayAuthor = (book) => bookAuthorDisplay(book, authorsMap || new Map())

  const refMeta = (other, link) => {
    const parts: string[] = []
    if (other) {
      const a = displayAuthor(other)
      if (a) parts.push(a)
      if (other.year) parts.push(other.year)
    }
    if (link?.page) parts.push(link.page)
    return parts.join(' — ')
  }

  const linkExcerpt = (link) => (link?.citation_text || link?.context || '').trim()

  return (
    <div className="px-6 pb-8 pt-12">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(selectedNode.axes || []).map((axis) => (
            <AxisBadge key={axis} color={AXES_COLORS[axis]}>
              {axis}
            </AxisBadge>
          ))}
        </div>

        <Button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-white/60 transition-all hover:border-[rgba(168,85,247,0.5)] hover:bg-[rgba(168,85,247,0.2)] hover:text-white"
          onClick={() => setPanelTab('edit')}
        >
          <span className="inline-flex items-center gap-1.5"><Pencil size={12} /> Modifier</span>
        </Button>
      </div>

      <h2 className="mb-1 text-[1.3rem] font-bold leading-snug text-white">{selectedNode.title}</h2>
      <p className="mb-0.5 text-[0.95rem] italic text-white/55">{displayAuthor(selectedNode)}</p>
      <p className="mb-3.5 text-[0.85rem] text-white/35">{selectedNode.year}</p>
      {selectedNode.description && (
        <p className="mb-4 text-[0.88rem] leading-relaxed text-white/60">{selectedNode.description}</p>
      )}

      {sameAuthorBooks.length > 0 && (
        <>
          <SectionHeading>
            Autres ouvrages de {displayAuthor(selectedNode)} ({sameAuthorBooks.length})
          </SectionHeading>
          <ul className="mb-5 flex list-none flex-col gap-2 border-b border-white/10 pb-5">
            {sameAuthorBooks.map((n) => (
              <li key={n.id}>
                <Button
                  type="button"
                  className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-left transition-all hover:border-white/20 hover:bg-white/8"
                  onClick={() => {
                    setLinkContextNode(null)
                    setSelectedLink(null)
                    setSelectedNode(n)
                    setPanelTab('details')
                  }}
                >
                  <strong className="mb-0.5 block text-[0.88rem] text-white">{n.title}</strong>
                  <span className="text-[0.75rem] text-white/30">{n.year}</span>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-white/10 pb-5">
        <Button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-[rgba(140,220,255,0.7)] transition-all hover:border-[rgba(140,220,255,0.5)] hover:bg-[rgba(140,220,255,0.15)] hover:text-white"
          onClick={() => onOpenTable?.('links', selectedNode.id)}
        >
          <span className="inline-flex items-center gap-1.5"><Plus size={12} /> Tisser un lien…</span>
        </Button>
      </div>

      {getOutgoingRefs(selectedNode).length > 0 && (
        <>
          <SectionHeading>
            <ArrowRight size={14} className="inline text-[rgba(140,220,255,0.8)]" />
            {' '}Références citées ({getOutgoingRefs(selectedNode).length})
          </SectionHeading>
          <ul className="flex list-none flex-col gap-2">
            {getOutgoingRefs(selectedNode).map(({ link, other }, i) => (
              <ReferenceRow
                key={i}
                label="cite"
                color="rgba(140,220,255,0.7)"
                title={other?.title}
                meta={refMeta(other, link)}
                excerpt={linkExcerpt(link)}
                onClick={() => {
                  setLinkContextNode(selectedNode)
                  setSelectedLink(link)
                }}
              />
            ))}
          </ul>
        </>
      )}

      {getIncomingRefs(selectedNode).length > 0 && (
        <>
          <SectionHeading>
            <ArrowLeft size={14} className="inline text-[rgba(255,171,64,0.8)]" />
            {' '}Cité par ({getIncomingRefs(selectedNode).length})
          </SectionHeading>
          <ul className="flex list-none flex-col gap-2">
            {getIncomingRefs(selectedNode).map(({ link, other }, i) => (
              <ReferenceRow
                key={i}
                label="cité par"
                color="rgba(255,171,64,0.7)"
                title={other?.title}
                meta={refMeta(other, link)}
                excerpt={linkExcerpt(link)}
                onClick={() => {
                  setLinkContextNode(selectedNode)
                  setSelectedLink(link)
                }}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}


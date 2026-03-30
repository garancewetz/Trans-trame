import { ArrowRight, ArrowLeft, LinkIcon, BookCopy, ExternalLink } from 'lucide-react'
import { authorName } from '../../authorUtils'

export default function LinkDetails({
  selectedLink,
  getLinkNodes,
  linkContextNode,
  showBackButton = true,
  onBackToContextNode,
  onOpenNode,
}) {
  const { source, target } = getLinkNodes(selectedLink)
  const contextIsSource = linkContextNode?.id && source?.id && linkContextNode.id === source.id
  const contextIsTarget = linkContextNode?.id && target?.id && linkContextNode.id === target.id
  const isContextPanel = !showBackButton && Boolean(linkContextNode)
  const relatedNode = contextIsSource ? target : source
  const directionLabel = contextIsSource ? 'Cet ouvrage cite cet ouvrage' : 'Cet ouvrage est cite par cet ouvrage'
  const relationVerb = contextIsSource ? 'cite' : 'est cite par'
  const relationBadgeLabel = isContextPanel ? (contextIsSource ? 'cite' : 'est cite par') : 'Lien'
  const relationBadgeClass = isContextPanel
    ? contextIsSource
      ? 'bg-[rgba(140,220,255,0.2)] text-[rgba(140,220,255,0.95)]'
      : 'bg-[rgba(255,171,64,0.22)] text-[rgba(255,171,64,0.95)]'
    : 'bg-linear-to-br from-[rgba(140,220,255,0.8)] to-[rgba(80,160,255,0.9)] text-white'

  const excerpt = (selectedLink?.citation_text || selectedLink?.context || '').trim()

  return (
    <div className="px-6 pb-8 pt-12">
      {linkContextNode && !isContextPanel && (
        <p className="mb-3 text-[0.74rem] font-semibold uppercase tracking-[0.5px] text-white/45">
          Fil: {linkContextNode.title} <ArrowRight size={12} className="mx-1 inline text-white/35" /> Citation
        </p>
      )}
      <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-[3px] text-[0.72rem] font-bold uppercase tracking-[0.5px] ${relationBadgeClass}`}>
        <LinkIcon size={11} /> {relationBadgeLabel}
      </span>
      {isContextPanel ? (
        <>
          <p className="mb-2 text-[0.78rem] text-white/55">{directionLabel}</p>
          <h2 className="mb-1 text-[1.05rem] font-bold leading-snug text-white">{relatedNode?.title}</h2>
          <p className="mb-3 text-[0.83rem] text-white/50">
            {relatedNode ? authorName(relatedNode) : ''}
            {relatedNode?.year ? ` — ${relatedNode.year}` : ''}
          </p>
          <p className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.78rem] text-white/60">
            Depuis le panneau de gauche, l'ouvrage principal <span className="font-semibold text-white/75">{relationVerb}</span> celui-ci.
          </p>
          {selectedLink.page && (
            <p className="mb-3 text-[0.76rem] font-semibold uppercase tracking-[0.5px] text-white/45">
              Passage: {selectedLink.page}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mb-2 text-[0.78rem] text-white/55">
            Lecture simple: <strong className="text-[rgba(255,171,64,0.9)]">ouvrage qui cite</strong> <ArrowRight size={12} className="mx-1 inline text-white/35" />
            <strong className="text-[rgba(140,220,255,0.9)]">ouvrage cite</strong>
          </p>
          <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold leading-snug text-white">
            {source?.title} <ArrowRight size={16} className="shrink-0 text-white/40" /> {target?.title}
          </h2>
          <p className="mb-5 text-[0.85rem] text-white/45">
            {source ? authorName(source) : ''} &mdash; {target ? authorName(target) : ''}
          </p>
        </>
      )}
      {linkContextNode && showBackButton && (
        <button
          type="button"
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-white/70 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white"
          onClick={() => onBackToContextNode?.(linkContextNode)}
        >
          <ArrowLeft size={12} />
          Revenir a l'ouvrage de depart
        </button>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        {isContextPanel && relatedNode && (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-white/75 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white"
            onClick={() => onOpenNode?.(relatedNode)}
          >
            <ExternalLink size={12} />
            Ouvrir cet ouvrage
          </button>
        )}
        {!isContextPanel && source && !contextIsSource && (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-[rgba(255,171,64,0.75)] transition-all hover:border-[rgba(255,171,64,0.45)] hover:bg-[rgba(255,171,64,0.15)] hover:text-white"
            onClick={() => onOpenNode?.(source)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage qui cite
          </button>
        )}
        {!isContextPanel && target && !contextIsTarget && (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:border-[rgba(140,220,255,0.5)] hover:bg-[rgba(140,220,255,0.15)] hover:text-white"
            onClick={() => onOpenNode?.(target)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage cite
          </button>
        )}
      </div>
      <blockquote className="mb-5 rounded-r-lg border-l-[3px] border-l-[rgba(140,220,255,0.5)] bg-[rgba(140,220,255,0.06)] px-5 py-4 text-[0.9rem] italic leading-relaxed text-white/80">
        {excerpt || '—'}
      </blockquote>
      {selectedLink.edition && (
        <p className="mb-4 inline-flex items-center gap-1.5 text-[0.8rem] text-white/40">
          <BookCopy size={12} className="shrink-0 text-white/50" />
          {selectedLink.edition}
        </p>
      )}
    </div>
  )
}


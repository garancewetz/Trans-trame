import { ArrowRight, LinkIcon, BookCopy } from 'lucide-react'
import { authorName } from '../../authorUtils'

export default function LinkDetails({ selectedLink, getLinkNodes }) {
  const { source, target } = getLinkNodes(selectedLink)

  return (
    <div className="px-6 pb-8 pt-12">
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-linear-to-br from-[rgba(140,220,255,0.8)] to-[rgba(80,160,255,0.9)] px-3 py-[3px] text-[0.72rem] font-bold uppercase tracking-[0.5px] text-white">
        <LinkIcon size={11} /> Lien
      </span>
      <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold leading-snug text-white">
        {source?.title} <ArrowRight size={16} className="shrink-0 text-white/40" /> {target?.title}
      </h2>
      <p className="mb-5 text-[0.85rem] text-white/45">
        {source ? authorName(source) : ''} &mdash; {target ? authorName(target) : ''}
      </p>
      <blockquote className="mb-5 rounded-r-lg border-l-[3px] border-l-[rgba(140,220,255,0.5)] bg-[rgba(140,220,255,0.06)] px-5 py-4 text-[0.9rem] italic leading-relaxed text-white/80">
        {selectedLink.citation_text}
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


import { LinkIcon } from 'lucide-react'

type Props = {
  /** "cite" | "cité par" or any label */
  label: string
  /** Accent color — e.g. "rgba(140,220,255,0.7)" */
  color: string
  title?: string
  meta?: string
  excerpt?: string
  onClick?: () => void
}

export function ReferenceRow({ label, color, title, meta, excerpt, onClick }: Props) {
  return (
    <li
      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 transition-all"
      style={{
        // hover styles via CSS custom properties
        ['--ref-hover-border' as string]: color.replace(/[\d.]+\)$/, '0.25)'),
        ['--ref-hover-bg' as string]: color.replace(/[\d.]+\)$/, '0.08)'),
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = `var(--ref-hover-border)`
        el.style.backgroundColor = `var(--ref-hover-bg)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = ''
        el.style.backgroundColor = ''
      }}
    >
      <span
        className="mb-1 inline-flex items-center gap-1 text-[0.75rem] font-bold uppercase tracking-[0.5px]"
        style={{ color }}
      >
        <LinkIcon size={10} /> {label}
      </span>
      <strong className="mb-0.5 block text-[0.88rem] text-white">{title}</strong>
      {meta && <span className="text-[0.85rem] text-white/30">{meta}</span>}
      <p className="mt-1.5 text-[0.9rem] italic leading-relaxed text-white/45">
        {excerpt || '—'}
      </p>
    </li>
  )
}

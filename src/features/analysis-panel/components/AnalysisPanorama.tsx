import { BookOpen, Users, Link2, Calendar } from 'lucide-react'

type PanoramaData = {
  books: number
  authors: number
  links: number
  yearMin: number | null
  yearMax: number | null
}

type AnalysisPanoramaProps = {
  panorama: PanoramaData
}

export function AnalysisPanorama({ panorama }: AnalysisPanoramaProps) {
  return (
    <section className="mb-5 grid grid-cols-2 gap-2">
      {[
        { icon: BookOpen, label: 'Ressources', value: panorama.books },
        { icon: Users, label: 'Auteur·ices', value: panorama.authors },
        { icon: Link2, label: 'Soudures', value: panorama.links },
        { icon: Calendar, label: 'Période', value: panorama.yearMin && panorama.yearMax ? `${panorama.yearMin}–${panorama.yearMax}` : '—' },
      ].map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl"
        >
          <div className="mb-0.5 flex items-center gap-1.5 text-white/40">
            <Icon size={12} />
            <span className="text-micro uppercase tracking-wide">{label}</span>
          </div>
          <p className="text-[1.1rem] font-bold tabular-nums text-white/85">{value}</p>
        </div>
      ))}
    </section>
  )
}

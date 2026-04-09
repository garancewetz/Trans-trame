import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { BarChart3, X, BookOpen, Users, Link2, Calendar, Quote, Network, AlertCircle } from 'lucide-react'
import { AXES_COLORS } from '@/common/utils/categories'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Panel } from '@/common/components/ui/Panel'
import { PANEL_WIDTH } from '@/common/constants/panels'
import {
  computePanorama,
  computeAxisStats,
  computeDecades,
  computeMostCitedWorks,
  computeTopAuthors,
  computeMaillage,
} from '../analysisMetrics'

type AnalysisPanelProps = {
  graphData: {
    nodes: unknown[]
    links: unknown[]
  }
  activeFilter: string | null
  onFilterChange: (axis: string | null) => void
  showTrigger?: boolean
  authorsMap: Map<string, AuthorNode>
}

export type AnalysisPanelImperativeHandle = {
  openPanel: () => void
  closePanel: () => void
}

type AnyBook = { id: string; title?: string; year?: number | null; axes?: string[]; authorIds?: string[] }
type AnyLink = { source: unknown; target: unknown }

const AnalysisPanel = forwardRef<AnalysisPanelImperativeHandle, AnalysisPanelProps>(function AnalysisPanel(
  { graphData, activeFilter, onFilterChange, showTrigger = true, authorsMap }: AnalysisPanelProps,
  ref,
) {
  const [open, setOpen] = useState(false)
  const bookNodes = graphData.nodes as AnyBook[]
  const links = graphData.links as AnyLink[]

  const panorama = useMemo(() => computePanorama(bookNodes, links, authorsMap), [bookNodes, links, authorsMap])
  const axisStats = useMemo(() => computeAxisStats(bookNodes), [bookNodes])
  const decades = useMemo(() => computeDecades(bookNodes), [bookNodes])
  const mostCited = useMemo(() => computeMostCitedWorks(bookNodes, links), [bookNodes, links])
  const topAuthors = useMemo(() => computeTopAuthors(bookNodes, authorsMap), [bookNodes, authorsMap])
  const maillage = useMemo(() => computeMaillage(bookNodes, links), [bookNodes, links])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useImperativeHandle(ref, () => ({
    openPanel() { setOpen(true) },
    closePanel() { setOpen(false) },
  }))

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed right-3 top-[92px] z-30 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.85rem] font-semibold text-white/70 backdrop-blur-lg transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <BarChart3 size={16} />
            Analyse
          </span>
        </Button>
      )}

      <Panel
        className={[
          `fixed right-0 top-0 z-50 h-screen ${PANEL_WIDTH.default} overflow-hidden border-l border-white/10 bg-bg-overlay/92 backdrop-blur-2xl`,
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[1rem] font-semibold text-white/90">Analyse</h2>
              <p className="text-[0.78rem] text-white/40">Radiographie de la trame</p>
            </div>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X size={18} />
            </Button>
          </div>

          {/* ── 1. Panorama ──────────────────────────── */}
          <section className="mb-5 grid grid-cols-2 gap-2">
            {[
              { icon: BookOpen, label: 'Ouvrages', value: panorama.books },
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
                  <span className="text-[0.72rem] uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-[1.1rem] font-bold tabular-nums text-white/85">{value}</p>
              </div>
            ))}
          </section>

          {/* ── 2. Axes — stacked bar ────────────────── */}
          <section className="mb-5">
            <h3 className="mb-2 text-[0.82rem] font-semibold uppercase tracking-wide text-white/50">Axes</h3>

            {/* Stacked bar */}
            <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full">
              {axisStats.map(({ axis, pct, color }) => (
                <button
                  key={axis}
                  type="button"
                  onClick={() => onFilterChange(activeFilter === axis ? null : axis)}
                  className="h-full cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    width: `${Math.max(pct, 1)}%`,
                    backgroundColor: color,
                    opacity: activeFilter && activeFilter !== axis ? 0.25 : 1,
                  }}
                  title={`${axis} — ${pct}%`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {axisStats.map(({ axis, count, pct, color }) => (
                <button
                  key={axis}
                  type="button"
                  onClick={() => onFilterChange(activeFilter === axis ? null : axis)}
                  className={[
                    'inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[0.72rem] transition-all',
                    activeFilter === axis ? 'bg-white/10 text-white/90' : 'text-white/45 hover:text-white/70',
                  ].join(' ')}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{axis}</span>
                  <span className="tabular-nums text-white/30">{count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── 3. Décennies ─────────────────────────── */}
          {decades.decades.length > 0 && (
            <section className="mb-5">
              <h3 className="mb-2 text-[0.82rem] font-semibold uppercase tracking-wide text-white/50">Décennies</h3>
              <div className="flex flex-col gap-[3px]">
                {decades.decades.map(({ decade, count, pct }) => (
                  <div key={decade} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-right text-[0.72rem] tabular-nums text-white/35">
                      {decade}
                    </span>
                    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-white/30 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-[0.72rem] tabular-nums text-white/30">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 4. Œuvres pivots ─────────────────────── */}
          <section className="mb-5">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold uppercase tracking-wide text-white/50">
              <Quote size={12} /> Œuvres pivots
            </h3>
            <div className="flex flex-col gap-1.5">
              {mostCited.map((node, i) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl"
                >
                  <span className="text-[0.9rem] font-bold text-white/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.85rem] font-semibold text-white/85">{node.title}</p>
                    <p className="text-[0.75rem] text-white/35">
                      {bookAuthorDisplay(node, authorsMap)} — {node.citedBy} citation{node.citedBy > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. Voix majeures ─────────────────────── */}
          <section className="mb-5">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold uppercase tracking-wide text-white/50">
              <Users size={12} /> Voix majeures
            </h3>
            <div className="flex flex-col gap-1.5">
              {topAuthors.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl"
                >
                  <span className="text-[0.9rem] font-bold text-white/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.85rem] font-semibold text-white/85">{a.name}</p>
                    <p className="text-[0.75rem] text-white/35">
                      {a.bookCount} ouvrage{a.bookCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
              {topAuthors.length === 0 && (
                <p className="text-[0.75rem] text-white/35">Aucun auteur·ice référencé·e</p>
              )}
            </div>
          </section>

          {/* ── 6. Maillage ──────────────────────────── */}
          <section className="mb-5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold uppercase tracking-wide text-white/50">
              <Network size={12} /> Maillage
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.3rem] font-bold text-white/85">{maillage.ratio}</span>
              <span className="text-[0.75rem] text-white/35">soudures / ouvrage</span>
            </div>
            {maillage.orphans > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.78rem] text-amber-400/70">
                <AlertCircle size={12} />
                {maillage.orphans} ouvrage{maillage.orphans > 1 ? 's' : ''} sans lien
              </p>
            )}
          </section>
        </div>
      </Panel>
    </>
  )
})

const MemoAnalysisPanel = AnalysisPanel
export { MemoAnalysisPanel as AnalysisPanel }

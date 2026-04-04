import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { BarChart3, X, Network, Quote, EyeOff, Activity } from 'lucide-react'
import { AXES_COLORS } from '@/common/utils/categories'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Panel } from '@/common/components/ui/Panel'
import {
  computeAxisStats,
  computeCommunityActivity,
  computeDensity,
  computeMostCitedWorks,
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

const AnalysisPanel = forwardRef<AnalysisPanelImperativeHandle, AnalysisPanelProps>(function AnalysisPanel(
  { graphData, activeFilter, onFilterChange, showTrigger = true, authorsMap }: AnalysisPanelProps,
  ref,
) {
  const [open, setOpen] = useState(false)
  const { nodes: bookNodes, links } = graphData

  const axisStats = useMemo(() => computeAxisStats(bookNodes), [bookNodes])
  const density = useMemo(() => computeDensity(bookNodes, links), [bookNodes, links])
  const mostCited = useMemo(() => computeMostCitedWorks(bookNodes, links), [bookNodes, links])
  const communityActivity = useMemo(() => computeCommunityActivity(links), [links])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useImperativeHandle(ref, () => ({
    openPanel() {
      setOpen(true)
    },
    closePanel() {
      setOpen(false)
    },
  }))

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed right-3 top-[92px] z-30 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.75rem] font-semibold text-white/70 backdrop-blur-lg transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <BarChart3 size={16} />
            Analyse
          </span>
        </Button>
      )}

      <Panel
        className={[
          'fixed right-0 top-0 z-50 h-screen w-[380px] overflow-hidden border-l border-white/10 bg-bg-overlay/92 backdrop-blur-2xl',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[0.9rem] font-semibold text-white/90">Analyse</h2>
              <p className="text-[0.7rem] text-white/40">Quelques repères sur la trame</p>
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

          <section className="mb-6">
            <h3 className="mb-2 text-[0.8rem] font-semibold text-white/80">Répartition des pôles</h3>
            <div className="flex flex-col gap-2">
              {axisStats.map(({ axis, count, pct, color }) => (
                <Button
                  key={axis}
                  type="button"
                  onClick={() => onFilterChange(activeFilter === axis ? null : axis)}
                  className={[
                    'group cursor-pointer rounded-lg border px-3 py-2.5 text-left backdrop-blur-xl transition-all',
                    activeFilter === axis
                      ? 'border-white/20 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8',
                  ].join(' ')}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.8rem] font-semibold" style={{ color }}>
                      {axis}
                    </span>
                    <span className="text-[0.72rem] text-white/35 tabular-nums">
                      {count} — {pct}%
                    </span>
                  </div>
                  <div className="h-[6px] w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </Button>
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <h3 className="mb-2 inline-flex items-center gap-2 text-[0.8rem] font-semibold text-white/80">
              <Network size={14} /> Densité
            </h3>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[1.4rem] font-bold text-white/85">{density.ratio}</span>
              <span className="text-[0.72rem] text-white/35">liens / livre</span>
            </div>
            <p className="mb-1 text-[0.75rem] text-white/50">
              {density.links} soudures — {density.nodes} ouvrages
            </p>
            <p className="text-[0.75rem] font-semibold text-white/60">{density.label}</p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 inline-flex items-center gap-2 text-[0.8rem] font-semibold text-white/80">
              <Quote size={14} /> Œuvres les plus citées
            </h3>
            <div className="flex flex-col gap-1.5">
              {mostCited.map((node, i) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl"
                >
                  <span className="text-[0.9rem] font-bold text-white/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.86rem] font-semibold text-white/85">{node.title}</p>
                    <p className="text-[0.72rem] text-white/35">
                      {bookAuthorDisplay(node, authorsMap)} — {node.citedBy} citation{node.citedBy > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

     

          <section className="mb-5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <h3 className="mb-2 inline-flex items-center gap-2 text-[0.8rem] font-semibold text-white/80">
              <Activity size={14} /> Activité
            </h3>
            <p className="text-[0.75rem] text-white/50">
              <span className="text-[1.05rem] font-bold text-white/80 tabular-nums">{communityActivity}</span> soudures récentes
            </p>
          </section>

        </div>
      </Panel>
    </>
  )
})

export { AnalysisPanel }

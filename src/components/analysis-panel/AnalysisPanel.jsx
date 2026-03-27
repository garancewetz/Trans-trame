import { useEffect, useMemo, useState } from 'react'
import { BarChart3, X, Network, Crown, EyeOff, Activity } from 'lucide-react'
import { AXES_COLORS } from '../../categories'
import { authorName } from '../../authorUtils'
import Button from '../ui/Button'
import Panel from '../ui/Panel'
import {
  computeAxisStats,
  computeCommunityActivity,
  computeDensity,
  computeSuperNodes,
  computeWikiGaps,
} from './analysisMetrics'

export default function AnalysisPanel({ graphData, activeFilter, onFilterChange }) {
  const [open, setOpen] = useState(false)
  const { nodes: bookNodes, links } = graphData

  const axisStats = useMemo(() => computeAxisStats(bookNodes), [bookNodes])
  const density = useMemo(() => computeDensity(bookNodes, links), [bookNodes, links])
  const superNodes = useMemo(() => computeSuperNodes(bookNodes, links), [bookNodes, links])
  const wikiGaps = useMemo(() => computeWikiGaps(bookNodes, links), [bookNodes, links])
  const communityActivity = useMemo(() => computeCommunityActivity(links), [links])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-0 top-1/2 z-20 -translate-y-1/2 cursor-pointer rounded-l-lg border border-r-0 border-white/15 bg-[rgba(8,4,20,0.85)] px-2 py-4 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-white/70 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="inline-flex items-center gap-1.5"><BarChart3 size={13} /> ANALYSE</span>
      </Button>

      <Panel
        className={[
          'fixed right-0 top-0 z-40 h-screen w-[340px] overflow-y-auto border-l border-white/10 bg-[rgba(8,4,20,0.92)] backdrop-blur-md',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="px-5 pb-8 pt-5">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-[0.85rem] font-bold uppercase tracking-[2px] text-white/80">
              Analyse de la Trame
            </h2>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer bg-transparent text-white/30 transition-colors hover:text-white"
            >
              <X size={18} />
            </Button>
          </div>

          <section className="mb-6">
            <h3 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[2px] text-white/40">
              <BarChart3 size={12} className="inline" /> Répartition des Pôles
            </h3>
            <div className="flex flex-col gap-2">
              {axisStats.map(({ axis, count, pct, color }) => (
                <Button
                  key={axis}
                  type="button"
                  onClick={() => onFilterChange(activeFilter === axis ? null : axis)}
                  className={[
                    'group cursor-pointer rounded border bg-transparent px-2 py-1.5 text-left transition-all',
                    activeFilter === axis
                      ? 'border-white/20 bg-white/5'
                      : 'border-transparent hover:border-white/10 hover:bg-white/3',
                  ].join(' ')}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.7rem] font-semibold uppercase" style={{ color }}>
                      {axis}
                    </span>
                    <span className="text-[0.65rem] text-white/30">
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

          <section className="mb-6 rounded border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[2px] text-white/40">
              <Network size={12} className="inline" /> Densité du Maillage
            </h3>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[1.4rem] font-bold text-white/85">{density.ratio}</span>
              <span className="text-[0.65rem] text-white/30">liens / livre</span>
            </div>
            <p className="mb-1 text-[0.7rem] text-white/50">
              {density.links} soudures — {density.nodes} ouvrages
            </p>
            <p className="text-[0.68rem] font-semibold text-white/60">&#9670; {density.label}</p>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[2px] text-white/40">
              <Crown size={12} className="inline" /> Les Centrales (Super-Nodes)
            </h3>
            <div className="flex flex-col gap-1.5">
              {superNodes.map((node, i) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-2.5 py-2"
                >
                  <span className="text-[0.9rem] font-bold text-white/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.72rem] font-semibold text-white/80">{node.title}</p>
                    <p className="text-[0.62rem] text-white/30">
                      {authorName(node)} — {node.degree} connexion{node.degree > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[2px] text-white/40">
              <EyeOff size={12} className="inline" /> Zones d'Ombre (Wiki-Gap)
            </h3>
            <div className="flex flex-col gap-1.5">
              {wikiGaps.map(({ a, b, count }) => (
                <div
                  key={`${a}-${b}`}
                  className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 text-[0.65rem]">
                    <span style={{ color: AXES_COLORS[a] }}>{a}</span>
                    <span className="text-white/20">&harr;</span>
                    <span style={{ color: AXES_COLORS[b] }}>{b}</span>
                  </div>
                  <span className="text-[0.6rem] text-white/25">
                    {count === 0 ? 'aucun lien' : `${count} lien${count > 1 ? 's' : ''}`}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-5 rounded border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[2px] text-white/40">
              <Activity size={12} className="inline" /> Activité de la Trame
            </h3>
            <p className="text-[0.75rem] text-white/50">
              <span className="text-[1.1rem] font-bold text-white/80">{communityActivity}</span>{' '}
              dernières soudures effectuées par la communauté
            </p>
          </section>

        </div>
      </Panel>
    </>
  )
}

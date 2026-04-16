import clsx from 'clsx'
import { useEffect } from 'react'
import { BarChart3, Network, AlertCircle, Waves } from 'lucide-react'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Panel } from '@/common/components/ui/Panel'
import { PanelHeader } from '@/common/components/ui/PanelHeader'
import { PANEL_WIDTH } from '@/common/constants/panels'
import type { Highlight } from '@/core/FilterContext'
import { usePanelVisibility } from '@/core/PanelVisibilityContext'
import { useAnalysisMetrics } from '../hooks/useAnalysisMetrics'
import { AnalysisPanorama } from './AnalysisPanorama'
import { AnalysisDecades } from './AnalysisDecades'
import { AnalysisBridges } from './AnalysisBridges'
import { AnalysisRankedLists } from './AnalysisRankedLists'

type AnalysisPanelProps = {
  graphData: {
    nodes: unknown[]
    links: unknown[]
  }
  activeFilter: string | null
  activeHighlight: Highlight | null
  onFilterChange: (axis: string | null) => void
  onHighlightChange: (h: Highlight | null) => void
  showTrigger?: boolean
  authorsMap: Map<string, AuthorNode>
}

type AnyBook = { id: string; title?: string; year?: number | null; axes?: string[]; authorIds?: string[] }
type AnyLink = { source: unknown; target: unknown }

function AnalysisPanel({ graphData, activeFilter, activeHighlight, onFilterChange, onHighlightChange, showTrigger = true, authorsMap }: AnalysisPanelProps) {
  const { analysisPanelOpen: open, setAnalysisPanelOpen } = usePanelVisibility()
  const bookNodes = graphData.nodes as AnyBook[]
  const links = graphData.links as AnyLink[]

  const { panorama, axisStats, decades, mostCited, topAuthors, maillage, bridges, archipelagos } =
    useAnalysisMetrics(bookNodes, links, authorsMap)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAnalysisPanelOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [setAnalysisPanelOpen])

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          onClick={() => setAnalysisPanelOpen(!open)}
          className="fixed right-3 top-[92px] z-30 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-ui font-semibold text-white/70 backdrop-blur-lg transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <BarChart3 size={16} />
            Analyse
          </span>
        </Button>
      )}

      <Panel
        className={clsx(
          `fixed right-0 top-0 z-50 h-screen ${PANEL_WIDTH.analysis} overflow-hidden border-l border-white/10 bg-bg-overlay/92 backdrop-blur-2xl`,
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
          <PanelHeader
            title="Analyse"
            subtitle="Radiographie de la trame"
            onClose={() => setAnalysisPanelOpen(false)}
            className="mb-5"
          />

          {/* ── 1. Panorama ──────────────────────────── */}
          <AnalysisPanorama panorama={panorama} />

          {/* ── 2. Axes — stacked bar ────────────────── */}
          <section className="mb-5">
            <h3 className="mb-2 text-label font-semibold uppercase tracking-wide text-white/50">Axes</h3>

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
              {axisStats.map(({ axis, count, color }) => (
                <button
                  key={axis}
                  type="button"
                  onClick={() => onFilterChange(activeFilter === axis ? null : axis)}
                  className={clsx(
                    'inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-micro transition-all',
                    activeFilter === axis ? 'bg-white/10 text-white/90' : 'text-white/45 hover:text-white/70',
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{axis}</span>
                  <span className="tabular-nums text-white/30">{count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── 3. Décennies ─────────────────────────── */}
          <AnalysisDecades
            decades={decades.decades}
            activeHighlight={activeHighlight}
            onHighlightChange={onHighlightChange}
          />

          {/* ── 4. Ponts inter-axes ──────────────────── */}
          <AnalysisBridges
            bridges={bridges}
            authorsMap={authorsMap}
            activeHighlight={activeHighlight}
            onHighlightChange={onHighlightChange}
          />

          {/* ── 5–6. Œuvres pivots & Voix majeures ──── */}
          <AnalysisRankedLists
            mostCited={mostCited}
            topAuthors={topAuthors}
            authorsMap={authorsMap}
            activeHighlight={activeHighlight}
            onHighlightChange={onHighlightChange}
          />

          {/* ── 7. Maillage ──────────────────────────── */}
          <section className="mb-5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-white/50">
              <Network size={12} /> Maillage
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.3rem] font-bold text-white/85">{maillage.ratio}</span>
              <span className="text-caption text-white/35">soudures / ouvrage</span>
            </div>
            {maillage.orphans > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.78rem] text-amber-400/70">
                <AlertCircle size={12} />
                {maillage.orphans} ouvrage{maillage.orphans > 1 ? 's' : ''} sans lien
              </p>
            )}
          </section>

          {/* ── 8. Archipels ─────────────────────────── */}
          {archipelagos.componentCount > 0 && (
            <section className="mb-5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-white/50">
                <Waves size={12} /> Archipels
              </h3>
              <p className="mb-2 text-micro text-white/35">
                Composantes connexes de la trame — la plus grande vs les îlots.
              </p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-[1.3rem] font-bold text-white/85">{archipelagos.mainPct}%</span>
                <span className="text-caption text-white/35">
                  dans la composante principale ({archipelagos.mainSize} ouvrage{archipelagos.mainSize > 1 ? 's' : ''})
                </span>
              </div>
              {archipelagos.smallIslands.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-micro text-white/40">Îlots isolés :</span>
                  {archipelagos.smallIslands.map((size, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-micro text-white/60"
                      title={`${size} ouvrages connectés entre eux mais détachés du reste`}
                    >
                      {size} ouvrages
                    </span>
                  ))}
                </div>
              )}
              {archipelagos.componentCount === 1 && (
                <p className="text-caption text-white/45">Trame pleinement connectée</p>
              )}
            </section>
          )}
        </div>
      </Panel>
    </>
  )
}

export { AnalysisPanel }

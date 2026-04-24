import clsx from 'clsx'
import { useEffect } from 'react'
import { BarChart3, Network, AlertCircle, Waves, TrendingUp } from 'lucide-react'
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
  activeAxes: ReadonlySet<string>
  activeHighlight: Highlight | null
  onToggleAxis: (axis: string) => void
  onClearAxes: () => void
  onHighlightChange: (h: Highlight | null) => void
  showTrigger?: boolean
  authorsMap: Map<string, AuthorNode>
}

type AnyBook = { id: string; title?: string; year?: number | null; axes?: string[]; authorIds?: string[] }
type AnyLink = { source: unknown; target: unknown }

function AnalysisPanel({ graphData, activeAxes, activeHighlight, onToggleAxis, onClearAxes, onHighlightChange, showTrigger = true, authorsMap }: AnalysisPanelProps) {
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
          className="fixed right-3 top-[92px] z-30 cursor-pointer rounded-lg border border-border-default bg-white/5 px-3 py-2 text-ui font-semibold text-white/70 backdrop-blur-lg transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <BarChart3 size={16} />
            Analyse
          </span>
        </Button>
      )}

      <Panel
        className={clsx(
          `fixed right-0 top-0 z-50 h-screen ${PANEL_WIDTH.analysis} overflow-hidden border-l border-border-default bg-bg-overlay/92 backdrop-blur-2xl`,
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
            <h3 className="mb-2 text-label font-semibold uppercase tracking-wide text-text-soft">Axes</h3>

            {/* Stacked bar — multi-axes : les axes sélectionnés restent à
                opacity 1, les autres passent à 0.25 (si au moins un axe est
                actif). Axes non actifs + set vide = full opacité. */}
            <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full">
              {axisStats.map(({ axis, pct, color }) => {
                const isSelected = activeAxes.has(axis)
                const opacity = activeAxes.size === 0 || isSelected ? 1 : 0.25
                return (
                  <button
                    key={axis}
                    type="button"
                    onClick={() => onToggleAxis(axis)}
                    className="h-full cursor-pointer transition-opacity hover:opacity-80"
                    style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color, opacity }}
                    title={`${axis} — ${pct}%`}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {axisStats.map(({ axis, count, color }) => {
                const isSelected = activeAxes.has(axis)
                return (
                  <button
                    key={axis}
                    type="button"
                    onClick={() => onToggleAxis(axis)}
                    className={clsx(
                      'inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-micro transition-all',
                      isSelected ? 'bg-white/10 text-white/90' : 'text-text-soft hover:text-white/70',
                    )}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{axis}</span>
                    <span className="tabular-nums text-text-muted">{count}</span>
                  </button>
                )
              })}
              {activeAxes.size > 0 && (
                <button
                  type="button"
                  onClick={onClearAxes}
                  className="rounded px-1 py-0.5 text-micro text-text-muted transition-colors hover:text-white/70"
                >
                  × tout
                </button>
              )}
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

          {/* ── Rayonnement (seuil de citations reçues) ── */}
          <CitedMinControl
            max={mostCited[0]?.citedBy ?? 0}
            activeHighlight={activeHighlight}
            onHighlightChange={onHighlightChange}
          />

          {/* ── 7. Maillage ──────────────────────────── */}
          <section className="mb-5 rounded-lg border border-border-default bg-white/5 p-3 backdrop-blur-xl">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-text-soft">
              <Network size={12} /> Maillage
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.3rem] font-bold text-white/85">{maillage.ratio}</span>
              <span className="text-caption text-text-secondary">soudures / ressource</span>
            </div>
            {maillage.orphans > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.78rem] text-amber-400/70">
                <AlertCircle size={12} />
                {maillage.orphans} ressource{maillage.orphans > 1 ? 's' : ''} sans lien
              </p>
            )}
          </section>

          {/* ── 8. Archipels ─────────────────────────── */}
          {archipelagos.componentCount > 0 && (
            <section className="mb-5 rounded-lg border border-border-default bg-white/5 p-3 backdrop-blur-xl">
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-text-soft">
                <Waves size={12} /> Archipels
              </h3>
              <p className="mb-2 text-micro text-text-secondary">
                Composantes connexes de la trame — la plus grande vs les îlots.
              </p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-[1.3rem] font-bold text-white/85">{archipelagos.mainPct}%</span>
                <span className="text-caption text-text-secondary">
                  dans la composante principale ({archipelagos.mainSize} ressource{archipelagos.mainSize > 1 ? 's' : ''})
                </span>
              </div>
              {archipelagos.smallIslands.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-micro text-white/40">Îlots isolés :</span>
                  {archipelagos.smallIslands.map((size, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-border-default bg-white/5 px-2 py-0.5 text-micro text-white/60"
                      title={`${size} ressources connectés entre eux mais détachés du reste`}
                    >
                      {size} ressources
                    </span>
                  ))}
                </div>
              )}
              {archipelagos.componentCount === 1 && (
                <p className="text-caption text-text-soft">Trame pleinement connectée</p>
              )}
            </section>
          )}
        </div>
      </Panel>
    </>
  )
}

type CitedMinControlProps = {
  max: number
  activeHighlight: Highlight | null
  onHighlightChange: (h: Highlight | null) => void
}

function CitedMinControl({ max, activeHighlight, onHighlightChange }: CitedMinControlProps) {
  if (max < 1) return null
  const current = activeHighlight?.kind === 'citedMin' ? activeHighlight.min : 0
  const handle = (v: number) => {
    const clamped = Math.max(0, Math.min(max, v))
    onHighlightChange(clamped <= 0 ? null : { kind: 'citedMin', min: clamped })
  }
  return (
    <section className="mb-5">
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-text-soft">
        <TrendingUp size={12} /> Rayonnement
      </h3>
      <p className="mb-2 text-micro text-text-secondary">
        N'affiche que les œuvres citées au moins {current || 'N'} fois.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={current}
          onChange={(e) => handle(Number(e.target.value))}
          className="flex-1 accent-amber-400"
          aria-label={`Seuil minimal de citations reçues (0 à ${max})`}
        />
        <span className="tabular-nums text-caption font-semibold text-white/80 min-w-[2.5ch] text-right">
          {current}
        </span>
        {current > 0 && (
          <button
            type="button"
            onClick={() => onHighlightChange(null)}
            className="cursor-pointer text-micro text-white/40 hover:text-white/70"
            aria-label="Réinitialiser le seuil"
          >
            Reset
          </button>
        )}
      </div>
    </section>
  )
}

export { AnalysisPanel }

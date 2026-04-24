import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, TrendingUp, Sparkles } from 'lucide-react'
import type { Book, Link } from '@/types/domain'
import type { BookId } from '@/types/domain'
import { axisColor, SUB_CLUSTERS } from '@/common/utils/categories'
import { computeSubAxisStats, type SubAxisStat } from '@/features/analysis-panel/analysisMetrics'

// Set des subKeys actuellement promus en sous-cluster visuel (cf.
// SUB_CLUSTERS dans categories.constants.ts). Utilisé pour marquer ces
// sous-axes comme "référencés" dans le drawer — l'équipe sait d'un coup
// d'œil lesquels ont déjà été rendus visibles dans la vue Catégories.
const REFERENCED_SUB_KEYS = new Set<string>(SUB_CLUSTERS.map((sc) => sc.subKey))

type Props = {
  books: Book[]
  links: Link[]
  onOpenWorkDetail?: (bookId: BookId) => unknown
}

/**
 * Drawer "Autres disciplines" — agrège les sous-axes stockés sous forme
 * `UNCATEGORIZED:xxx` (philosophie, sociologie, psychanalyse…) pour aider à
 * décider lesquels méritent d'être promus au rang d'axe à part entière.
 *
 * Lecture politique : promouvoir un sous-axe au rang d'axe féministe est une
 * décision éditoriale — ce tableau *propose* des candidats, il ne *décide*
 * pas à la place de l'équipe. Aucune action d'écriture, juste de la mise en
 * lumière.
 *
 * Pas de tri commutable : l'ordre par gravité décroissante est le plus
 * actionnable (candidats à référencer en haut) ; le reste des chiffres est
 * lisible sur chaque ligne.
 */
export function SubAxesTab({ books, links, onOpenWorkDetail }: Props) {
  const stats = useMemo(() => computeSubAxisStats(books, links, 5), [books, links])

  const totalBooksInSubAxes = useMemo(
    () => stats.reduce((sum, s) => sum + s.bookCount, 0),
    [stats],
  )

  const uncategorizedColor = axisColor('UNCATEGORIZED') ?? '#999999'

  if (stats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-caption text-text-secondary">
        Aucun sous-axe détecté dans le corpus. Les imports futurs avec un thème
        (philosophie, sociologie…) apparaîtront ici.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <header className="flex flex-col gap-2 border-b border-border-subtle pb-3">
          <p className="text-caption leading-snug text-text-soft">
            Ces œuvres sont citées par le corpus féministe sans en faire partie
            (philosophie, sociologie, psychanalyse, littérature…). Un sous-axe
            qui pèse lourd peut être <strong className="text-violet/90">référencé</strong> —
            il apparaît alors comme sous-pôle distinct <em>à l'intérieur</em> de
            "Autres disciplines" dans la vue Catégories, sans devenir un axe
            féministe à part entière.
          </p>
          <div className="flex items-center gap-3 text-micro text-text-soft tabular-nums">
            <span><strong className="text-white/75">{stats.length}</strong> sous-axes</span>
            {SUB_CLUSTERS.length > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="inline-flex items-center gap-1 text-violet/75">
                  <strong className="text-violet/90">{SUB_CLUSTERS.length}</strong> référencé{SUB_CLUSTERS.length > 1 ? 's' : ''}
                </span>
              </>
            )}
            <span className="text-white/20">·</span>
            <span><strong className="text-white/75">{totalBooksInSubAxes}</strong> œuvres</span>
            <span className="text-white/20">·</span>
            <span><strong className="text-white/75">{books.length}</strong> corpus total</span>
          </div>
        </header>

        <ul className="flex flex-col gap-1.5">
          {stats.map((sub) => (
            <SubAxisRow
              key={sub.key}
              sub={sub}
              color={uncategorizedColor}
              onOpenWorkDetail={onOpenWorkDetail}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function SubAxisRow({
  sub,
  color,
  onOpenWorkDetail,
}: {
  sub: SubAxisStat
  color: string
  onOpenWorkDetail?: (bookId: BookId) => unknown
}) {
  const [expanded, setExpanded] = useState(false)
  const referenced = REFERENCED_SUB_KEYS.has(sub.key)
  const subCluster = referenced ? SUB_CLUSTERS.find((sc) => sc.subKey === sub.key) : undefined
  // Couleur spécifique au sous-cluster quand il est référencé (ex :
  // Philosophy → #8B8BA3). Le dot prend cette couleur pour matcher le label
  // visible dans la vue Catégories ; non-référencés gardent le gris par
  // défaut de "Autres disciplines".
  const referencedColor = subCluster?.color ?? color
  const displayLabel = subCluster?.label ?? sub.key.replace(/[_-]/g, ' ')
  return (
    <li className={[
      'rounded-lg border bg-white/3 transition-colors',
      referenced
        ? 'border-violet/25 bg-violet/5 hover:border-violet/40'
        : 'border-border-subtle hover:border-white/15',
    ].join(' ')}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown size={13} className="shrink-0 text-white/40" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-white/40" />
        )}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: referencedColor, boxShadow: `0 0 6px ${referencedColor}55` }}
        />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {referenced && (
            <span
              className="inline-flex shrink-0 items-center rounded-full bg-violet/15 p-1 text-violet/85"
              title="Référencé : ce sous-axe apparaît comme sous-pôle distinct dans la vue Catégories"
              aria-label="Référencé"
            >
              <Sparkles size={10} />
            </span>
          )}
          <span className="truncate text-body font-medium text-white/85 first-letter:uppercase">
            {displayLabel}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-3 text-micro tabular-nums text-text-soft">
          <span title="Nombre d'œuvres">
            <strong className="text-white/80">{sub.bookCount}</strong>
            <span className="ml-1 text-text-muted">œuvres</span>
          </span>
          <span className="text-white/20">·</span>
          <span title="% du corpus total">{sub.pctOfCorpus}%</span>
          <span className="text-white/20">·</span>
          <span title="Citations reçues depuis le reste du corpus" className="inline-flex items-center gap-1">
            <TrendingUp size={10} className="text-text-secondary" />
            {sub.citedByCorpus}
          </span>
        </span>
      </button>

      {expanded && sub.topWorks.length > 0 && (
        <ul className="border-t border-border-subtle bg-bg-base/30 px-3 py-2">
          <li className="mb-1 text-micro uppercase tracking-[1px] text-text-muted">
            Œuvres les plus citées
          </li>
          {sub.topWorks.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onOpenWorkDetail?.(w.id as BookId)}
                className="group flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-left text-caption transition-colors hover:bg-white/5"
              >
                <span className="truncate text-white/70 group-hover:text-white/90">
                  {w.title}
                </span>
                {w.year && (
                  <span className="shrink-0 text-micro text-text-muted tabular-nums">
                    {w.year}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-micro tabular-nums text-white/40">
                  {w.citedBy > 0 ? `cité·e ${w.citedBy}×` : 'non cité·e'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

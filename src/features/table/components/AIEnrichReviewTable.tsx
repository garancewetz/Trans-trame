import clsx from 'clsx'
import { Check } from 'lucide-react'
import { CATEGORY_THEME, type Axis } from '@/common/utils/categories'
import type { AuthorId, Author } from '@/types/domain'
import type { Enrichment } from '../hooks/useEnrichmentState'

// ─── FieldCheckbox ────────────────────────────────────────────────────────

export function FieldCheckbox({ accepted, onClick }: { accepted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all',
        accepted ? 'border-cyan/60 bg-cyan/15' : 'border-white/20 hover:border-white/40',
      )}
    >
      {accepted && <Check size={8} className="text-cyan" />}
    </button>
  )
}

// ─── EnrichmentRow ────────────────────────────────────────────────────────

export function EnrichmentRow({
  enrichment: e,
  authorsMap,
  onToggleItem,
  onToggleField,
}: {
  enrichment: Enrichment
  authorsMap: Map<AuthorId, Author>
  onToggleItem: (bookId: string) => void
  onToggleField: (bookId: string, field: string) => void
}) {
  const authorNames = (e.book.authorIds || [])
    .map((id) => authorsMap.get(id))
    .filter(Boolean)
    .map((a) => [a!.firstName, a!.lastName].filter(Boolean).join(' '))
    .join(', ')
  const currentAxes = (e.book.axes || []).map((a) => CATEGORY_THEME[a as Axis]?.label).filter(Boolean)

  const allKeys = new Set<string>([
    ...e.diffs.map((d) => d.field),
    ...(e.newAxes.length > 0 ? ['axes'] : []),
    ...(e.suggestedThemes.length > 0 ? ['themes'] : []),
  ])
  const rowAllOn = e.acceptedFields.size === allKeys.size
  const rowPartial = e.acceptedFields.size > 0 && !rowAllOn

  return (
    <tr
      className={clsx(
        'border-b border-white/4 transition-colors',
        e.acceptedFields.size > 0 ? 'bg-cyan/3' : 'opacity-40',
      )}
    >
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={() => onToggleItem(e.bookId)}
          className={clsx(
            'mt-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all',
            rowAllOn
              ? 'border-cyan/60 bg-cyan/15'
              : rowPartial
                ? 'border-cyan/40 bg-cyan/8'
                : 'border-white/20 hover:border-white/40',
          )}
        >
          {rowAllOn && <Check size={10} className="text-cyan" />}
          {rowPartial && <span className="block h-1.5 w-1.5 rounded-sm bg-cyan/60" />}
        </button>
      </td>
      <td className="px-2 py-2">
        <div className="font-medium text-white/80">{e.book.title}</div>
        {authorNames && <div className="text-[0.78rem] text-white/40">{authorNames}</div>}
        {currentAxes.length > 0 && (
          <div className="mt-0.5 text-micro text-white/25">{currentAxes.join(', ')}</div>
        )}
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1.5">
          {e.diffs.map((d) => {
            const accepted = e.acceptedFields.has(d.field)
            return (
              <div key={d.field} className="flex items-center gap-1.5 text-[0.78rem]">
                <FieldCheckbox accepted={accepted} onClick={() => onToggleField(e.bookId, d.field)} />
                <span className={!accepted ? 'opacity-35' : ''}>
                  <span className="text-white/35">{d.label} : </span>
                  <span className="text-red/40 line-through">{d.current}</span>
                  <span className="text-white/30"> → </span>
                  <span className="text-cyan/80">{d.proposed}</span>
                </span>
              </div>
            )
          })}
          {e.newAxes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <FieldCheckbox accepted={e.acceptedFields.has('axes')} onClick={() => onToggleField(e.bookId, 'axes')} />
              <div className={clsx('flex flex-wrap items-center gap-1', !e.acceptedFields.has('axes') && 'opacity-35')}>
                <span className="text-micro text-white/35">Catégories :</span>
                {e.newAxes.map((a) => (
                  <span
                    key={a}
                    className="rounded-full px-2 py-0.5 text-micro font-medium"
                    style={{
                      backgroundColor: CATEGORY_THEME[a]?.color + '18',
                      color: CATEGORY_THEME[a]?.color,
                      border: `1px solid ${CATEGORY_THEME[a]?.color}30`,
                    }}
                  >
                    {CATEGORY_THEME[a]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {e.suggestedThemes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <FieldCheckbox accepted={e.acceptedFields.has('themes')} onClick={() => onToggleField(e.bookId, 'themes')} />
              <div className={clsx('flex flex-wrap gap-1', !e.acceptedFields.has('themes') && 'opacity-35')}>
                {e.suggestedThemes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-dashed border-white/20 bg-white/4 px-2 py-0.5 text-micro text-white/50"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

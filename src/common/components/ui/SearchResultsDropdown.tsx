import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Button } from './Button'
import { AxesDot } from './AxesDot'

type ResultItem = {
  id: string
  title: string
  axes?: string[]
  /** Secondary text (author, year, etc.) */
  meta?: string
}

type Props<T extends ResultItem> = {
  results: T[]
  onPick: (item: T) => void
  /** Shown when results is empty */
  emptyLabel?: string
  /** Optional action shown when empty (e.g. "Ajouter un ouvrage") */
  emptyAction?: ReactNode
  /** Button tone for row hover — default neutral */
  tone?: 'neutral' | 'violet'
  /** Max height CSS class — default max-h-[200px] */
  maxHeight?: string
  /** Extra container classes (positioning, shadow, etc.) */
  className?: string
  /** Custom render for each result row content — default renders dot + title + meta */
  renderItem?: (item: T) => ReactNode
}

export function SearchResultsDropdown<T extends ResultItem>({
  results,
  onPick,
  emptyLabel = 'Aucun résultat',
  emptyAction,
  tone = 'neutral',
  maxHeight = 'max-h-[200px]',
  className,
  renderItem,
}: Props<T>) {
  return (
    <div
      className={clsx(
        'overflow-y-auto rounded-[10px] border border-white/10 bg-white/5 p-1',
        maxHeight,
        className,
      )}
    >
      {results.length === 0 ? (
        <div className="p-2">
          <p className="p-2 text-center text-[0.92rem] leading-relaxed text-white/40">
            {emptyLabel}
          </p>
          {emptyAction}
        </div>
      ) : (
        <ul className="flex list-none flex-col">
          {results.map((item) => (
            <li key={item.id}>
              <Button
                variant="ghost"
                layout="row"
                tone={tone}
                type="button"
                onClick={() => onPick(item)}
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <>
                    {item.axes && <AxesDot axes={item.axes} size="default" className="h-2.5 w-2.5" />}
                    <span className="min-w-0">
                      <strong className="block text-[0.95rem] font-semibold text-white">
                        {item.title}
                      </strong>
                      {item.meta && (
                        <span className="mt-0.5 block text-[0.85rem] text-white/35">{item.meta}</span>
                      )}
                    </span>
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

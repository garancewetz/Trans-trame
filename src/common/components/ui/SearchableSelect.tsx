import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { TextInput } from './TextInput'

type SearchableSelectProps<T> = {
  query: string
  onQueryChange: (q: string) => void
  results: T[]
  onSelect: (item: T) => void
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string
  placeholder?: string
  emptyMessage?: string
  maxHeight?: string
}

export function SearchableSelect<T>({
  query,
  onQueryChange,
  results,
  onSelect,
  renderItem,
  getKey,
  placeholder = 'Rechercher…',
  emptyMessage = 'Aucun résultat',
  maxHeight = 'max-h-[180px]',
}: SearchableSelectProps<T>) {
  return (
    <div>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 text-white/25">
          <Search size={14} />
        </div>
        <TextInput
          variant="default"
          className="w-full pl-9 pr-8"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <Button
            className="absolute right-2 cursor-pointer bg-transparent px-1 py-0.5 text-white/30 hover:text-white"
            onClick={() => onQueryChange('')}
            type="button"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {query.trim() && (
        <div
          className={[
            'mt-1.5 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-1',
            maxHeight,
          ].join(' ')}
        >
          {results.length === 0 ? (
            <p className="p-2 text-center text-[0.88rem] text-white/30">{emptyMessage}</p>
          ) : (
            <ul className="flex list-none flex-col">
              {results.map((item) => (
                <li key={getKey(item)}>
                  <Button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-3 py-2 text-left transition-colors hover:bg-white/10"
                    type="button"
                    onClick={() => onSelect(item)}
                  >
                    {renderItem(item)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

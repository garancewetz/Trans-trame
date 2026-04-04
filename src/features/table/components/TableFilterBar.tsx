import { Search, X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'

type TableFilterBarProps = {
  tab?: string
  search: string
  setSearch: (v: string) => void
  authorSearch: string
  setAuthorSearch: (v: string) => void
  linkSearch: string
  setLinkSearch: (v: string) => void
}

export function TableFilterBar({
  tab,
  search,
  setSearch,
  authorSearch,
  setAuthorSearch,
  linkSearch,
  setLinkSearch,
}: TableFilterBarProps) {
  const value = tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch
  const setValue = tab === 'books' ? setSearch : tab === 'authors' ? setAuthorSearch : setLinkSearch
  const placeholder = tab === 'books' ? 'Filtrer les ouvrages…' : tab === 'authors' ? 'Filtrer les auteur·ices…' : 'Filtrer les liens…'

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
      <div className="relative w-72">
        <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/22" />
        <TextInput
          variant="table"
          className="rounded-lg border-white/8 bg-white/4 py-1.5 pl-7 pr-6 text-[0.85rem] focus:border-cyan/[0.28] focus:bg-white/6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <Button
            variant="ghost"
            layout="inline"
            tone="muted"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setValue('')}
            type="button"
          >
            <X size={11} />
          </Button>
        )}
      </div>
    </div>
  )
}

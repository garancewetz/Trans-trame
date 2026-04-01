import { X } from 'lucide-react'
import { Button } from './Button'
import { AxesDot } from './AxesDot'

type PillItem = {
  id: string
  title: string
  axes?: string[]
}

type Props<T extends PillItem> = {
  items: T[]
  onRemove: (id: string) => void
  /** Max width of the title text — default max-w-[160px] */
  titleMaxWidth?: string
}

export function SelectedItemsPills<T extends PillItem>({
  items,
  onRemove,
  titleMaxWidth = 'max-w-[160px]',
}: Props<T>) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/8 py-1 pl-2 pr-1.5 text-[0.75rem] text-white/75"
        >
          {item.axes && <AxesDot axes={item.axes} size="small" />}
          <span className={`truncate ${titleMaxWidth}`}>{item.title}</span>
          <Button
            type="button"
            onClick={() => onRemove(item.id)}
            className="ml-0.5 shrink-0 cursor-pointer rounded-full bg-transparent p-0.5 text-white/35 transition-colors hover:bg-white/15 hover:text-white"
            aria-label={`Retirer ${item.title}`}
          >
            <X size={11} />
          </Button>
        </span>
      ))}
    </div>
  )
}

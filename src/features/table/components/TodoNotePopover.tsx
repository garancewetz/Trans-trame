import clsx from 'clsx'
import { ClipboardList } from 'lucide-react'
import { Popover } from '@/common/components/ui/Popover'
import { Button } from '@/common/components/ui/Button'

type Props = {
  note: string
  /** When provided, renders an "Effacer la note" action inside the popover. */
  onClear?: () => void
  /** Extra classes for the trigger icon (e.g. `ml-1.5` when placed next to text). */
  iconClassName?: string
}

export function TodoNotePopover({ note, onClear, iconClassName }: Props) {
  return (
    <Popover
      ariaLabel="Lire la note"
      content={
        <div className="flex flex-col gap-3">
          <p>{note}</p>
          {onClear && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onClear}
                className="cursor-pointer text-caption text-white/45 underline-offset-2 hover:text-red/80 hover:underline"
              >
                Effacer la note
              </Button>
            </div>
          )}
        </div>
      }
    >
      <ClipboardList
        size={11}
        className={clsx('shrink-0 text-amber/55 hover:text-amber/90', iconClassName)}
      />
    </Popover>
  )
}

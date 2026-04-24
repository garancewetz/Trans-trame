import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  /** Focus color accent — default violet */
  focusTone?: 'violet' | 'amber' | 'cyan'
}

const FOCUS_TONE = {
  violet: 'focus:border-violet/40 focus:shadow-[0_0_0_3px_rgba(168,130,255,0.08)]',
  amber: 'focus:border-peach/40',
  cyan: 'focus:border-cyan/40 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.06)]',
} as const

export function SearchInputWithClear({
  value,
  onChange,
  onClear,
  focusTone = 'violet',
  className,
  ...props
}: Props) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      onChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>)
    }
  }

  return (
    <div className={clsx('relative flex items-center', className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dimmed"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        className={clsx(
          'w-full rounded-[10px] border border-border-default bg-white/5 px-9 py-[9px] text-body text-white outline-none backdrop-blur-lg transition-all placeholder:text-text-secondary focus:bg-white/10',
          FOCUS_TONE[focusTone],
        )}
        {...props}
      />
      {value && (
        <Button
          variant="ghost"
          layout="inline"
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          type="button"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  )
}

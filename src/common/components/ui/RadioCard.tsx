import clsx from 'clsx'
import type { ReactNode } from 'react'

type RadioCardProps = {
  checked: boolean
  onChange: () => void
  children: ReactNode
}

export function RadioCard({ checked, onChange, children }: RadioCardProps) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
        checked
          ? 'border-green/40 bg-green/6'
          : 'border-border-subtle bg-white/3 hover:border-white/15',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          checked ? 'border-green bg-green/20' : 'border-white/25',
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
      </span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <div>{children}</div>
    </label>
  )
}

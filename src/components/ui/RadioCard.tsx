import type { ReactNode } from 'react'

type RadioCardProps = {
  checked: boolean
  onChange: () => void
  children: ReactNode
}

export default function RadioCard({ checked, onChange, children }: RadioCardProps) {
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
        checked
          ? 'border-[rgba(0,255,135,0.4)] bg-[rgba(0,255,135,0.06)]'
          : 'border-white/8 bg-white/3 hover:border-white/15',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          checked ? 'border-[#00FF87] bg-[rgba(0,255,135,0.2)]' : 'border-white/25',
        ].join(' ')}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-[#00FF87]" />}
      </span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <div>{children}</div>
    </label>
  )
}

import clsx from 'clsx'
import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  children: ReactNode
  as?: 'label' | 'div'
  className?: string
}

export function FormField({
  label,
  children,
  as: Tag = 'label',
  className,
}: FormFieldProps) {
  return (
    <Tag className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-caption font-semibold uppercase tracking-[1px] text-white/35">
        {label}
      </span>
      {children}
    </Tag>
  )
}

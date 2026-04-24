import clsx from 'clsx'
import type { TextareaHTMLAttributes } from 'react'
import { Textarea } from './Textarea'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

const BASE =
  'mb-4 h-52 w-full resize-none rounded-xl border border-border-default bg-white/4 p-3 font-mono text-ui text-white outline-none placeholder:text-text-muted transition-all focus:border-cyan/[0.28] focus:bg-white/6'

export function TextareaImport({ className = '', ...props }: Props) {
  return <Textarea className={clsx(BASE, className)} {...props} />
}


import clsx from 'clsx'
import type { TextareaHTMLAttributes } from 'react'
import { Textarea } from './Textarea'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

const BASE =
  'w-full resize-none bg-transparent text-[1rem] font-mono italic text-white/80 placeholder:text-white/30 outline-none'

export function TextareaInline({ className = '', ...props }: Props) {
  return <Textarea className={clsx(BASE, className)} {...props} />
}


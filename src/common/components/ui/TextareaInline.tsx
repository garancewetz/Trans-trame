import type { TextareaHTMLAttributes } from 'react'
import { Textarea } from './Textarea'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

const BASE =
  'w-full resize-none bg-transparent text-[0.9rem] font-mono italic text-white/80 placeholder:text-white/20 outline-none'

export function TextareaInline({ className = '', ...props }: Props) {
  return <Textarea className={[BASE, className].filter(Boolean).join(' ')} {...props} />
}


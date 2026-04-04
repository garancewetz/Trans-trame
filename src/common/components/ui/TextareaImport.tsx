import type { TextareaHTMLAttributes } from 'react'
import { Textarea } from './Textarea'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

const BASE =
  'mb-4 h-52 w-full resize-none rounded-xl border border-white/10 bg-white/4 p-3 font-mono text-[0.75rem] text-white outline-none placeholder:text-white/30 transition-all focus:border-cyan/[0.28] focus:bg-white/6'

export function TextareaImport({ className = '', ...props }: Props) {
  return <Textarea className={[BASE, className].filter(Boolean).join(' ')} {...props} />
}


import type { CSSProperties, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
  style?: CSSProperties
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea({ className, style, ...props }, ref) {
  return <textarea ref={ref} className={className} style={style} {...props} />
})

export default Textarea


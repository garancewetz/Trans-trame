import { useRef, useState } from 'react'
import {
  useFloating,
  useHover,
  useFocus,
  useInteractions,
  useDismiss,
  useRole,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  type Placement,
} from '@floating-ui/react'

export function Tooltip({
  content,
  children,
  placement = 'bottom',
  delayMs = 120,
}: {
  content: string
  children: React.ReactNode
  placement?: Placement
  delayMs?: number
}) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  })

  const hover = useHover(context, { delay: { open: delayMs, close: 0 } })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  return (
    <>
      <span ref={refs.setReference} className="inline-flex" {...getReferenceProps()}>
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <span
            ref={refs.setFloating}
            style={floatingStyles}
            className="pointer-events-none z-9999 whitespace-nowrap rounded-md border border-border-default bg-bg-overlay/95 px-2 py-1 text-caption font-semibold text-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            {...getFloatingProps()}
          >
            {content}
          </span>
        </FloatingPortal>
      )}
    </>
  )
}

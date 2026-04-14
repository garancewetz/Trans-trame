import { useState } from 'react'
import { useFloating, flip, shift, offset, autoUpdate, useHover, useDismiss, useInteractions, useClick } from '@floating-ui/react'
import { BookCopy } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Tooltip } from '@/common/components/ui/Tooltip'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Book } from '@/types/domain'

export function PanelWorkBadge({
  siblings,
  authorsMap,
}: {
  siblings: Book[]
  authorsMap: Map<string, AuthorNode>
}) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const hover = useHover(context, { delay: { open: 150, close: 200 } })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="mt-1.5 inline-flex shrink-0"
      >
        <Tooltip content="Fait partie d'une même œuvre">
          <span className="inline-flex cursor-pointer items-center rounded-full p-1 text-amber/55 transition-colors hover:bg-amber/10 hover:text-amber/95">
            <BookCopy size={13} />
          </span>
        </Tooltip>
      </span>
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50 min-w-80 max-w-md rounded-lg border border-white/10 bg-bg-base/95 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-widest text-white/35">
            Éditions de cette œuvre ({siblings.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {siblings.map((s) => (
              <li key={s.id} className="flex gap-2 text-label leading-snug">
                <span className="mt-0.5 shrink-0 text-amber/40">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {s.title}
                    {s.year != null && (
                      <span className="ml-1.5 font-mono text-micro text-white/30">{s.year}</span>
                    )}
                  </span>
                  {(s.authorIds?.length ?? 0) > 0 && (
                    <span className="text-micro text-white/25">
                      {bookAuthorDisplay(s, authorsMap)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

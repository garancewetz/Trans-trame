import clsx from 'clsx'
import { Eye } from 'lucide-react'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { INPUT } from '../../../tableConstants'
import type { BookId } from '@/types/domain'
import type { ResolvedLink } from './linksTab.types'

type Props = {
  link: ResolvedLink
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (v: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  onOpenWorkDetail?: (bookId: BookId) => void
}

export function LinkExpandedPanel({
  link,
  editingLink,
  editingLinkValue,
  setEditingLinkValue,
  setEditingLink,
  commitLinkEdit,
  onOpenWorkDetail,
}: Props) {
  const isEditCtx = editingLink?.id === link.id && editingLink?.field === 'citation_text'
  const isEditPage = editingLink?.id === link.id && editingLink?.field === 'page'
  const isEditEdition = editingLink?.id === link.id && editingLink?.field === 'edition'
  const primary = link.citations[0]

  return (
    <div className="ml-5 mb-1 mt-1 rounded-lg border border-white/8 bg-white/2 p-3">
      {/* Actions row */}
      {link.targetNode && onOpenWorkDetail && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenWorkDetail(link.targetNode!.id)}
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/4 px-2 py-1 text-micro text-white/45 transition-colors hover:border-violet/30 hover:bg-violet/8 hover:text-violet/90"
          >
            <Eye size={11} /> Graphe
          </button>
        </div>
      )}

      {/* Citation */}
      <div className="mb-2">
        <label className="mb-0.5 block text-micro font-semibold uppercase tracking-[1px] text-white/25">
          Citation
        </label>
        {isEditCtx ? (
          <Textarea
            autoFocus
            className={`${INPUT} w-full resize-none text-label leading-snug`}
            rows={2}
            value={editingLinkValue}
            onChange={(e) => setEditingLinkValue(e.target.value)}
            onBlur={commitLinkEdit}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingLink({ id: link.id, field: '_expand' }) }}
          />
        ) : (
          <span
            className={clsx(
              'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] italic transition-colors hover:bg-white/5',
              (primary?.citation_text || primary?.context) ? 'text-white/50' : 'text-white/18',
            )}
            onClick={(e) => {
              e.stopPropagation()
              setEditingLink({ id: link.id, field: 'citation_text' })
              setEditingLinkValue(primary?.citation_text || primary?.context || '')
            }}
          >
            {primary?.citation_text || primary?.context || 'Ajouter une citation\u2026'}
          </span>
        )}
      </div>

      {/* Page + Edition */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-0.5 block text-micro font-semibold uppercase tracking-[1px] text-white/25">
            Page
          </label>
          {isEditPage ? (
            <TextInput
              variant="table"
              autoFocus
              className={`${INPUT} w-full text-label`}
              value={editingLinkValue}
              onChange={(e) => setEditingLinkValue(e.target.value)}
              onBlur={commitLinkEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLinkEdit()
                if (e.key === 'Escape') setEditingLink({ id: link.id, field: '_expand' })
              }}
            />
          ) : (
            <span
              className={clsx(
                'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] tabular-nums transition-colors hover:bg-white/5',
                primary?.page ? 'text-white/50' : 'text-white/18',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setEditingLink({ id: link.id, field: 'page' })
                setEditingLinkValue(primary?.page || '')
              }}
            >
              {primary?.page || '\u2014'}
            </span>
          )}
        </div>
        <div className="flex-1">
          <label className="mb-0.5 block text-micro font-semibold uppercase tracking-[1px] text-white/25">
            Edition
          </label>
          {isEditEdition ? (
            <TextInput
              variant="table"
              autoFocus
              className={`${INPUT} w-full text-label`}
              value={editingLinkValue}
              onChange={(e) => setEditingLinkValue(e.target.value)}
              onBlur={commitLinkEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLinkEdit()
                if (e.key === 'Escape') setEditingLink({ id: link.id, field: '_expand' })
              }}
            />
          ) : (
            <span
              className={clsx(
                'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] transition-colors hover:bg-white/5',
                primary?.edition ? 'text-white/50' : 'text-white/18',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setEditingLink({ id: link.id, field: 'edition' })
                setEditingLinkValue(primary?.edition || '')
              }}
            >
              {primary?.edition || '\u00e9d.\u2014'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

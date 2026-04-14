import clsx from 'clsx'
import { BookCopy, ChevronRight, Quote, Trash2 } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { AxesDot } from '@/common/components/ui/AxesDot'
import type { BookId } from '@/types/domain'
import type { ResolvedLink } from './linksTab.types'
import { LinkExpandedPanel } from './LinkExpandedPanel'

type Props = {
  link: ResolvedLink
  authorsMap: Map<string, AuthorNode>
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (v: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  isDeleting: boolean
  setDeletingLinkId: (id: string | null) => void
  onDeleteLink: (linkId: string) => void
  onOpenWorkDetail?: (bookId: BookId) => void
}

export function LinkRow({
  link,
  authorsMap,
  editingLink,
  editingLinkValue,
  setEditingLinkValue,
  setEditingLink,
  commitLinkEdit,
  isDeleting,
  setDeletingLinkId,
  onDeleteLink,
  onOpenWorkDetail,
}: Props) {
  const isExpanded = editingLink?.id === link.id
  const hasMeta = link.citation_text || link.context || link.page || link.edition

  const toggleExpand = () => {
    if (isExpanded) {
      setEditingLink(null)
    } else {
      setEditingLink({ id: link.id, field: '_expand' })
    }
  }

  return (
    <div className="group">
      {/* Main row — click to expand */}
      <div
        className={clsx(
          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          isExpanded ? 'bg-white/5' : 'hover:bg-white/3',
        )}
        onClick={toggleExpand}
      >
        <ChevronRight
          size={10}
          className={clsx(
            'shrink-0 text-white/20 transition-transform',
            isExpanded && 'rotate-90',
          )}
        />
        <AxesDot axes={link.targetNode?.axes || []} size="small" />
        <span className="min-w-0 flex-1 truncate font-mono text-ui text-white/75">
          {link.targetNode?.title || '[ouvrage supprim\u00e9]'}
          {link.targetNode && (
            <span className="ml-1.5 text-white/30">
              — {bookAuthorDisplay(link.targetNode, authorsMap)}
              {link.targetNode.year ? `, ${link.targetNode.year}` : ''}
            </span>
          )}
        </span>

        {/* Inline meta preview (collapsed) */}
        {!isExpanded && hasMeta && (
          <span className="hidden shrink-0 items-center gap-2 font-mono text-micro text-white/25 sm:flex">
            {link.page && <span className="tabular-nums">{link.page}</span>}
            {link.edition && (
              <span className="flex items-center gap-0.5"><BookCopy size={8} />{link.edition}</span>
            )}
          </span>
        )}

        {/* Delete — visible on hover or when confirming */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isDeleting) { setDeletingLinkId(link.id); return }
            onDeleteLink(link.id)
            setDeletingLinkId(null)
          }}
          onBlur={() => { if (isDeleting) setDeletingLinkId(null) }}
          className={clsx(
            'shrink-0 rounded border px-1 py-0.5 text-micro transition-all',
            isDeleting
              ? 'border-red/45 text-red/80'
              : 'border-transparent text-transparent group-hover:border-red/22 group-hover:bg-red/6 group-hover:text-red/50',
          )}
          title={isDeleting ? 'Confirmer la suppression' : 'Supprimer'}
        >
          {isDeleting ? '\u00d7' : <Trash2 size={9} />}
        </button>
      </div>

      {/* Citation preview (collapsed) */}
      {!isExpanded && (link.citation_text || link.context) && (
        <div className="ml-7 mb-1 flex items-start gap-1.5 px-2">
          <Quote size={10} className="mt-0.5 shrink-0 text-white/20" />
          <p className="whitespace-pre-wrap font-mono text-caption italic leading-relaxed text-white/30">
            {link.citation_text || link.context}
          </p>
        </div>
      )}

      {/* Expanded detail panel */}
      {isExpanded && (
        <LinkExpandedPanel
          link={link}
          editingLink={editingLink}
          editingLinkValue={editingLinkValue}
          setEditingLinkValue={setEditingLinkValue}
          setEditingLink={setEditingLink}
          commitLinkEdit={commitLinkEdit}
          onOpenWorkDetail={onOpenWorkDetail}
        />
      )}
    </div>
  )
}

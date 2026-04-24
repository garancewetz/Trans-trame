import { ChevronDown, Plus, Zap } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { AxesDot } from '@/common/components/ui/AxesDot'
import type { BookId } from '@/types/domain'
import type { LinkGroup } from './linksTab.types'
import { LinkRow } from './LinkRow'

type Props = {
  group: LinkGroup
  authorsMap: Map<string, AuthorNode>
  isOpen: boolean
  onToggle: () => void
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (v: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  deletingLinkId: string | null
  setDeletingLinkId: (id: string | null) => void
  onDeleteLink: (linkId: string) => void
  onOpenWorkDetail?: (bookId: BookId) => void
  onTisserFrom?: () => void
  onSmartImportFrom?: () => void
}

export function SourceGroup({
  group,
  authorsMap,
  isOpen,
  onToggle,
  editingLink,
  editingLinkValue,
  setEditingLinkValue,
  setEditingLink,
  commitLinkEdit,
  deletingLinkId,
  setDeletingLinkId,
  onDeleteLink,
  onOpenWorkDetail,
  onTisserFrom,
  onSmartImportFrom,
}: Props) {
  return (
    <div className="mb-1">
      {/* Source header — clickable accordion toggle */}
      <div
        className={[
          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors',
          isOpen ? 'bg-white/4' : 'hover:bg-white/3',
        ].join(' ')}
        onClick={onToggle}
      >
        <ChevronDown
          size={12}
          className={[
            'shrink-0 text-text-muted transition-transform duration-150',
            isOpen ? '' : '-rotate-90',
          ].join(' ')}
        />
        <AxesDot axes={group.sourceNode?.axes || []} />
        <span className="min-w-0 flex-1 truncate font-mono text-[0.88rem] font-semibold text-white/85">
          {group.sourceNode?.title || '[ressource supprimée]'}
          <span className="ml-1.5 font-normal text-caption text-text-muted">
            {group.sourceNode ? bookAuthorDisplay(group.sourceNode, authorsMap) : ''}
            {group.sourceNode?.year ? `, ${group.sourceNode.year}` : ''}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/6 px-2 py-px font-mono text-micro text-text-muted">
          {group.links.length}
        </span>
        {onTisserFrom && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTisserFrom() }}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-cyan/20 bg-cyan/6 px-2 py-0.5 font-mono text-micro text-cyan/60 transition-all hover:border-cyan/40 hover:bg-cyan/12 hover:text-cyan/90"
          >
            <Plus size={10} />
            Tisser
          </button>
        )}
        {onSmartImportFrom && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSmartImportFrom() }}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-amber/20 bg-amber/6 px-2 py-0.5 font-mono text-micro text-amber/60 transition-all hover:border-amber/40 hover:bg-amber/12 hover:text-amber/90"
          >
            <Zap size={10} />
            Import
          </button>
        )}
      </div>

      {/* Target links — visible only when open */}
      {isOpen && (
        <div className="ml-4 flex flex-col border-l border-border-subtle pl-3 pb-2">
          {group.links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              authorsMap={authorsMap}
              editingLink={editingLink}
              editingLinkValue={editingLinkValue}
              setEditingLinkValue={setEditingLinkValue}
              setEditingLink={setEditingLink}
              commitLinkEdit={commitLinkEdit}
              isDeleting={deletingLinkId === link.id}
              setDeletingLinkId={setDeletingLinkId}
              onDeleteLink={onDeleteLink}
              onOpenWorkDetail={onOpenWorkDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}

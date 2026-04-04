import { ArrowRight, BookCopy, Eye, Pencil, Trash2 } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { AxesDot } from '@/common/components/ui/AxesDot'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { INPUT } from '../../tableConstants'
import { LinkSourcePanel } from '../LinkSourcePanel'
import type { Book, BookId, Link } from '@/types/domain'

type ResolvedLink = Link & {
  _srcId?: string
  _tgtId?: string
  sourceNode?: Book | null
  targetNode?: Book | null
}

type LinkGroup = { srcId?: string; sourceNode?: Book | null; links: ResolvedLink[] }

type LinksTabProps = {
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  linkSourceNode: Book | null
  setLinkSourceNode: (node: Book | null) => void
  setLinkCheckedIds: (next: Set<BookId>) => void
  checklistSearch: string
  setChecklistSearch: (value: string) => void
  checklistNodes: Book[]
  existingTargetIds: Set<BookId>
  linkCheckedIds: Set<BookId>
  toggleChecklist: (id: BookId) => void
  newLinksCount: number
  handleTisser: () => void
  groupedLinks: LinkGroup[]
  linkSearch: string
  editingLink: null | { id: string; field: string }
  editingLinkValue: string
  setEditingLinkValue: (value: string) => void
  setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void
  deletingLinkId: string | null
  setDeletingLinkId: (id: string | null) => void
  onDeleteLink: (linkId: string) => void
  onFocusBookOnMap?: (bookId: BookId) => void
  onOpenWorkDetail?: (bookId: BookId) => void
}

export function LinksTab({
  nodes,
  authorsMap,
  linkSourceNode,
  setLinkSourceNode,
  setLinkCheckedIds,
  checklistSearch,
  setChecklistSearch,
  checklistNodes,
  existingTargetIds,
  linkCheckedIds,
  toggleChecklist,
  newLinksCount,
  handleTisser,
  groupedLinks,
  linkSearch,
  editingLink,
  editingLinkValue,
  setEditingLinkValue,
  setEditingLink,
  commitLinkEdit,
  deletingLinkId,
  setDeletingLinkId,
  onDeleteLink,
  onFocusBookOnMap,
  onOpenWorkDetail,
}: LinksTabProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <LinkSourcePanel
        nodes={nodes}
        authorsMap={authorsMap}
        linkSourceNode={linkSourceNode}
        setLinkSourceNode={setLinkSourceNode}
        setLinkCheckedIds={setLinkCheckedIds}
        checklistSearch={checklistSearch}
        setChecklistSearch={setChecklistSearch}
        checklistNodes={checklistNodes}
        existingTargetIds={existingTargetIds}
        linkCheckedIds={linkCheckedIds}
        toggleChecklist={toggleChecklist}
        newLinksCount={newLinksCount}
        handleTisser={handleTisser}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/6 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/30">
          Relations existantes
          {linkSearch && (
            <span className="ml-2 font-normal normal-case text-white/20">
              — filtrées
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {groupedLinks.length === 0 ? (
            <p className="py-12 text-center font-mono text-[0.85rem] text-white/22">
              {linkSearch ? `Aucun résultat pour « ${linkSearch} »` : 'Aucun lien créé'}
            </p>
          ) : (
            groupedLinks.map((group) => (
              <div key={group.srcId || group.sourceNode?.id} className="mb-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <AxesDot axes={group.sourceNode?.axes || []} />
                  <span className="font-mono text-[0.9rem] font-semibold text-white/85">
                    {group.sourceNode?.title || '[ouvrage supprimé]'}
                  </span>
                  <span className="ml-1 font-mono text-[0.75rem] text-white/30">
                    {group.sourceNode ? bookAuthorDisplay(group.sourceNode, authorsMap) : ''}
                    {group.sourceNode?.year ? `, ${group.sourceNode.year}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-white/6 px-2 py-px font-mono text-[0.72rem] text-white/30">
                    {group.links.length} lien{group.links.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ml-3 flex flex-col gap-px border-l border-white/8 pl-3">
                  {group.links.map((link) => {
                    const isExpanded = editingLink?.id === link.id
                    const isEditCtx = editingLink?.id === link.id && editingLink?.field === 'citation_text'
                    const isEditPage = editingLink?.id === link.id && editingLink?.field === 'page'
                    const isEditEdition = editingLink?.id === link.id && editingLink?.field === 'edition'
                    const isDeleting = deletingLinkId === link.id
                    const hasMeta = link.citation_text || link.context || link.page || link.edition

                    return (
                      <div
                        key={link.id}
                        className="group rounded-md px-2 py-1.5 transition-colors hover:bg-white/4"
                      >
                        <div className="flex items-start gap-2">
                          <ArrowRight size={11} className="mt-0.5 shrink-0 text-cyan/25" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-mono text-[0.85rem] text-white/75 truncate">
                              <span className="inline-flex items-center gap-1.5">
                                <AxesDot axes={link.targetNode?.axes || []} size="small" />
                                <span className="truncate">
                                  {link.targetNode?.title || '[ouvrage supprimé]'}
                                </span>
                              </span>
                              {link.targetNode && (
                                <span className="ml-1 text-white/30">
                                  — {bookAuthorDisplay(link.targetNode, authorsMap)}
                                  {link.targetNode.year ? `, ${link.targetNode.year}` : ''}
                                </span>
                              )}
                            </span>

                            {!isExpanded && hasMeta && (
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.72rem] text-white/30">
                                {(link.citation_text || link.context) && (
                                  <span className="italic truncate max-w-[200px]">{link.citation_text || link.context}</span>
                                )}
                                {link.page && <span className="tabular-nums">p.{link.page}</span>}
                                {link.edition && (
                                  <span className="flex items-center gap-0.5"><BookCopy size={8} />{link.edition}</span>
                                )}
                              </span>
                            )}
                          </div>

                          <Button
                            type="button"
                            onClick={() => {
                              if (isExpanded) { setEditingLink(null); return }
                              setEditingLink({ id: link.id, field: '_expand' })
                            }}
                            className={[
                              'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.72rem] transition-all',
                              isExpanded
                                ? 'border-cyan/35 text-cyan/80'
                                : 'border-cyan/22 bg-cyan/6 text-cyan/75 opacity-100 hover:border-cyan/35 hover:bg-cyan/12 hover:text-cyan/90',
                            ].join(' ')}
                            title="Modifier la citation"
                          >
                            <Pencil size={9} />
                          </Button>

                          {link.targetNode && (
                            <>
                              <Button
                                type="button"
                                onClick={() => {
                                  const t = link.targetNode
                                  if (t) onFocusBookOnMap?.(t.id)
                                }}
                                disabled={isDeleting || !onFocusBookOnMap}
                                className={[
                                  'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.72rem] transition-all',
                                  isDeleting || !onFocusBookOnMap
                                    ? 'border-transparent text-white/12 opacity-50 cursor-not-allowed'
                                    : 'border-white/12 bg-white/4 text-white/55 opacity-100 hover:border-cyan/35 hover:bg-cyan/8 hover:text-cyan/90',
                                ].join(' ')}
                                title="Voir le nœud sur la carte"
                              >
                                <Eye size={9} />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  const t = link.targetNode
                                  if (t) onOpenWorkDetail?.(t.id)
                                }}
                                disabled={isDeleting || !onOpenWorkDetail}
                                className={[
                                  'inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded border px-1.5 py-0.5 text-[0.72rem] font-semibold transition-all',
                                  isDeleting || !onOpenWorkDetail
                                    ? 'pointer-events-none border-transparent text-white/12 opacity-40 cursor-not-allowed'
                                    : 'border-white/10 bg-white/4 text-white/45 hover:border-violet/35 hover:bg-violet/8 hover:text-violet/95',
                                ].join(' ')}
                                title="Grande fiche ouvrage"
                              >
                                Détails
                              </Button>
                            </>
                          )}

                          <Button
                            type="button"
                            onClick={() => {
                              if (!isDeleting) { setDeletingLinkId(link.id); return }
                              onDeleteLink(link.id)
                              setDeletingLinkId(null)
                            }}
                            onBlur={() => { if (isDeleting) setDeletingLinkId(null) }}
                            className={[
                              'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.72rem] transition-all',
                              isDeleting
                                ? 'border-red/45 text-red/80'
                                : 'border-red/22 bg-red/6 text-red/65 opacity-100 hover:border-red/32 hover:bg-red/12 hover:text-red/85',
                            ].join(' ')}
                            title={isDeleting ? 'Confirmer' : 'Supprimer'}
                          >
                            {isDeleting ? '×' : <Trash2 size={9} />}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="ml-5 mt-2 flex flex-col gap-2 rounded-lg border border-white/8 bg-white/3 p-2.5">
                            <div>
                              <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/30">
                                Citation
                              </label>
                              {isEditCtx ? (
                                <Textarea
                                  autoFocus
                                  className={`${INPUT} w-full resize-none text-[0.82rem] leading-snug`}
                                  rows={2}
                                  value={editingLinkValue}
                                  onChange={(e) => setEditingLinkValue(e.target.value)}
                                  onBlur={commitLinkEdit}
                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingLink({ id: link.id, field: '_expand' }) }}
                                />
                              ) : (
                                <span
                                  className={[
                                    'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] italic transition-colors hover:bg-white/5',
                                    (link.citation_text || link.context) ? 'text-white/50' : 'text-white/18',
                                  ].join(' ')}
                                  onClick={() => {
                                    setEditingLink({ id: link.id, field: 'citation_text' })
                                    setEditingLinkValue(link.citation_text || link.context || '')
                                  }}
                                >
                                  {link.citation_text || link.context || 'Ajouter une citation…'}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/30">
                                  Page
                                </label>
                                {isEditPage ? (
                                  <TextInput
                                    variant="table"
                                    autoFocus
                                    className={`${INPUT} w-full text-[0.82rem]`}
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
                                    className={[
                                      'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] tabular-nums transition-colors hover:bg-white/5',
                                      link.page ? 'text-white/50' : 'text-white/18',
                                    ].join(' ')}
                                    onClick={() => {
                                      setEditingLink({ id: link.id, field: 'page' })
                                      setEditingLinkValue(link.page || '')
                                    }}
                                  >
                                    {link.page || 'p.—'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/30">
                                  Édition
                                </label>
                                {isEditEdition ? (
                                  <TextInput
                                    variant="table"
                                    autoFocus
                                    className={`${INPUT} w-full text-[0.82rem]`}
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
                                    className={[
                                      'block cursor-text rounded px-2 py-1 font-mono text-[0.8rem] transition-colors hover:bg-white/5',
                                      link.edition ? 'text-white/50' : 'text-white/18',
                                    ].join(' ')}
                                    onClick={() => {
                                      setEditingLink({ id: link.id, field: 'edition' })
                                      setEditingLinkValue(link.edition || '')
                                    }}
                                  >
                                    {link.edition || 'éd.—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


import { ArrowRight, BookCopy, Check, Eye, Link2, Pencil, Search, Trash2 } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/lib/authorUtils'
import AxesDot from '@/components/ui/AxesDot'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import Textarea from '@/components/ui/Textarea'
import { INPUT } from '../tableConstants'
import { NodeSearch } from '../TableSubcomponents'
import type { Book, BookId, Link } from '@/domain/types'

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
  onRevealBookLine?: (bookId: BookId) => void
}

export default function LinksTab({
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
  onRevealBookLine,
}: LinksTabProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex w-80 shrink-0 flex-col border-r border-white/8">
        <div className="shrink-0 border-b border-white/8 p-4">
          <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/30">
            Livre source
          </p>
          <NodeSearch
            nodes={nodes}
            authorsMap={authorsMap}
            value={linkSourceNode}
            onSelect={(n) => {
              setLinkSourceNode(n)
              setLinkCheckedIds(new Set<BookId>())
              setChecklistSearch('')
            }}
            placeholder="Rechercher le livre source…"
          />
          {linkSourceNode && (
            <Button
              type="button"
              onClick={() => { setLinkSourceNode(null); setLinkCheckedIds(new Set<BookId>()) }}
              className="mt-1 cursor-pointer font-mono text-[0.6rem] text-white/22 hover:text-white/55"
            >
              × retirer
            </Button>
          )}
        </div>

        {linkSourceNode ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-white/6 px-3 py-2">
              <div className="relative">
                <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/22" />
                <TextInput
                  variant="table"
                  className="rounded-md border border-white/8 bg-white/4 py-1 pl-6 pr-2 text-[0.72rem] focus:border-[rgba(140,220,255,0.28)]"
                  placeholder="Filtrer les cibles…"
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                />
              </div>
              <p className="mt-1 text-[0.6rem] text-white/25">
                {newLinksCount > 0
                  ? `${newLinksCount} nouveau${newLinksCount > 1 ? 'x' : ''} lien${newLinksCount > 1 ? 's' : ''} à créer`
                  : 'Cocher les livres à relier'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {checklistNodes.map((n) => {
                const existing = existingTargetIds.has(n.id)
                const checked = existing || linkCheckedIds.has(n.id)
                return (
                  <label
                    key={n.id}
                    className={[
                      'flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/4',
                      existing ? 'opacity-40 cursor-default' : '',
                      linkCheckedIds.has(n.id) ? 'bg-[rgba(0,255,135,0.04)]' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                        checked
                          ? existing
                            ? 'border-white/25 bg-white/10 text-white/40'
                            : 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                          : 'border-white/15 text-transparent',
                      ].join(' ')}
                    >
                      <Check size={9} />
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={existing}
                      onChange={() => toggleChecklist(n.id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[0.74rem] text-white/75">
                        {n.title}
                      </span>
                      <span className="block font-mono text-[0.62rem] text-white/30">
                        {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                        {existing && ' · existant'}
                      </span>
                    </span>
                  </label>
                )
              })}
              {checklistNodes.length === 0 && (
                <p className="px-3 py-4 font-mono text-[0.72rem] text-white/22">
                  {checklistSearch ? 'Aucun résultat' : 'Aucun autre ouvrage'}
                </p>
              )}
            </div>

            <div className="shrink-0 border-t border-white/8 p-3">
              <Button
                type="button"
                onClick={handleTisser}
                disabled={newLinksCount === 0}
                className="w-full cursor-pointer rounded-lg border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] py-2 text-[0.76rem] font-semibold text-[rgba(140,220,255,0.82)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25 flex items-center justify-center gap-2"
              >
                <Link2 size={13} />
                {newLinksCount > 0 ? `Tisser ${newLinksCount} lien${newLinksCount > 1 ? 's' : ''}` : 'Tisser'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center font-mono text-[0.72rem] text-white/22">
              Sélectionnez un livre<br />source pour commencer
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/6 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/30">
          Relations existantes
          {linkSearch && (
            <span className="ml-2 font-normal normal-case text-white/20">
              — filtrées
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {groupedLinks.length === 0 ? (
            <p className="py-12 text-center font-mono text-[0.75rem] text-white/22">
              {linkSearch ? `Aucun résultat pour « ${linkSearch} »` : 'Aucun lien créé'}
            </p>
          ) : (
            groupedLinks.map((group) => (
              <div key={group.srcId || group.sourceNode?.id} className="mb-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <AxesDot axes={group.sourceNode?.axes || []} />
                  <span className="font-mono text-[0.8rem] font-semibold text-white/85">
                    {group.sourceNode?.title || '[ouvrage supprimé]'}
                  </span>
                  <span className="ml-1 font-mono text-[0.65rem] text-white/30">
                    {group.sourceNode ? bookAuthorDisplay(group.sourceNode, authorsMap) : ''}
                    {group.sourceNode?.year ? `, ${group.sourceNode.year}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-white/6 px-2 py-px font-mono text-[0.6rem] text-white/30">
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
                          <ArrowRight size={11} className="mt-0.5 shrink-0 text-[rgba(140,220,255,0.25)]" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-mono text-[0.76rem] text-white/75 truncate">
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
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.62rem] text-white/30">
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
                              'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.6rem] transition-all',
                              isExpanded
                                ? 'border-[rgba(140,220,255,0.35)] text-[rgba(140,220,255,0.8)]'
                                : 'border-[rgba(140,220,255,0.22)] bg-[rgba(140,220,255,0.06)] text-[rgba(140,220,255,0.75)] opacity-100 hover:border-[rgba(140,220,255,0.35)] hover:bg-[rgba(140,220,255,0.12)] hover:text-[rgba(140,220,255,0.9)]',
                            ].join(' ')}
                            title="Modifier la citation"
                          >
                            <Pencil size={9} />
                          </Button>

                          {link.targetNode && (
                            <Button
                              type="button"
                              onClick={() => {
                                const t = link.targetNode
                                if (t) onRevealBookLine?.(t.id)
                              }}
                              disabled={isDeleting}
                              className={[
                                'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.6rem] transition-all',
                                isDeleting
                                  ? 'border-transparent text-white/12 opacity-50 cursor-not-allowed'
                                  : 'border-[rgba(255,255,255,0.12)] bg-white/4 text-white/55 opacity-100 hover:border-[rgba(140,220,255,0.35)] hover:bg-[rgba(140,220,255,0.08)] hover:text-[rgba(140,220,255,0.9)]',
                              ].join(' ')}
                              title="Voir l'ouvrage"
                            >
                              <Eye size={9} />
                            </Button>
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
                              'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.6rem] transition-all',
                              isDeleting
                                ? 'border-[rgba(255,55,55,0.45)] text-[rgba(255,100,100,0.8)]'
                                : 'border-[rgba(255,55,55,0.22)] bg-[rgba(255,55,55,0.06)] text-[rgba(255,120,120,0.65)] opacity-100 hover:border-[rgba(255,55,55,0.32)] hover:bg-[rgba(255,55,55,0.12)] hover:text-[rgba(255,140,140,0.85)]',
                            ].join(' ')}
                            title={isDeleting ? 'Confirmer' : 'Supprimer'}
                          >
                            {isDeleting ? '×' : <Trash2 size={9} />}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="ml-5 mt-2 flex flex-col gap-2 rounded-lg border border-white/8 bg-white/3 p-2.5">
                            <div>
                              <label className="mb-0.5 block text-[0.58rem] font-semibold uppercase tracking-[1px] text-white/30">
                                Citation
                              </label>
                              {isEditCtx ? (
                                <Textarea
                                  autoFocus
                                  className={`${INPUT} w-full resize-none text-[0.72rem] leading-snug`}
                                  rows={2}
                                  value={editingLinkValue}
                                  onChange={(e) => setEditingLinkValue(e.target.value)}
                                  onBlur={commitLinkEdit}
                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingLink({ id: link.id, field: '_expand' }) }}
                                />
                              ) : (
                                <span
                                  className={[
                                    'block cursor-text rounded px-2 py-1 font-mono text-[0.7rem] italic transition-colors hover:bg-white/5',
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
                                <label className="mb-0.5 block text-[0.58rem] font-semibold uppercase tracking-[1px] text-white/30">
                                  Page
                                </label>
                                {isEditPage ? (
                                  <TextInput
                                    variant="table"
                                    autoFocus
                                    className={`${INPUT} w-full text-[0.72rem]`}
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
                                      'block cursor-text rounded px-2 py-1 font-mono text-[0.7rem] tabular-nums transition-colors hover:bg-white/5',
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
                                <label className="mb-0.5 block text-[0.58rem] font-semibold uppercase tracking-[1px] text-white/30">
                                  Édition
                                </label>
                                {isEditEdition ? (
                                  <TextInput
                                    variant="table"
                                    autoFocus
                                    className={`${INPUT} w-full text-[0.72rem]`}
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
                                      'block cursor-text rounded px-2 py-1 font-mono text-[0.7rem] transition-colors hover:bg-white/5',
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


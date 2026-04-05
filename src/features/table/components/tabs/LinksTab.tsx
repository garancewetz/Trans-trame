import { useEffect, useRef, useState } from 'react'
import { BookCopy, Check, ChevronRight, Eye, Link2, Plus, Quote, Search, Trash2, X } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { AxesDot } from '@/common/components/ui/AxesDot'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { INPUT } from '../../tableConstants'
import { NodeSearch } from '../TableSubcomponents'
import { InlineBookForm } from '../../../add-book-form/components/InlineBookForm'
import type { Author, Book, BookId, Link } from '@/types/domain'

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
  authors?: Author[]
  onAddAuthor?: (author: Author) => void
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
}

type Mode = 'list' | 'create'

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
  authors,
  onAddAuthor,
  onAddBook,
}: LinksTabProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [inlineOpen, setInlineOpen] = useState(false)
  const [justAddedId, setJustAddedId] = useState<BookId | null>(null)
  const justAddedRef = useRef<HTMLLabelElement>(null)

  useEffect(() => {
    if (justAddedId && justAddedRef.current) {
      justAddedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const timeout = setTimeout(() => setJustAddedId(null), 1500)
      return () => clearTimeout(timeout)
    }
  }, [justAddedId])

  const totalLinks = groupedLinks.reduce((sum, g) => sum + g.links.length, 0)
  const canInline = authors && onAddBook

  const switchToCreate = () => {
    setMode('create')
    setEditingLink(null)
    setDeletingLinkId(null)
  }

  const switchToList = () => {
    setMode('list')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Mode toggle ── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/8 px-5 py-1.5">
        <button
          type="button"
          onClick={switchToList}
          className={[
            'rounded-md px-3 py-1.5 text-[0.82rem] font-semibold transition-all',
            mode === 'list'
              ? 'bg-white/8 text-white/80'
              : 'text-white/35 hover:text-white/55',
          ].join(' ')}
        >
          Relations
          {totalLinks > 0 && (
            <span className="ml-1.5 text-[0.72rem] font-normal text-white/25">{totalLinks}</span>
          )}
        </button>
        <button
          type="button"
          onClick={switchToCreate}
          className={[
            'rounded-md px-3 py-1.5 text-[0.82rem] font-semibold transition-all',
            mode === 'create'
              ? 'bg-cyan/10 text-cyan/80'
              : 'text-white/35 hover:text-cyan/60',
          ].join(' ')}
        >
          + Tisser
        </button>

        {linkSearch && mode === 'list' && (
          <span className="ml-auto text-[0.72rem] text-white/20">
            filtrées par «&nbsp;{linkSearch}&nbsp;»
          </span>
        )}
      </div>

      {/* ── List mode ── */}
      {mode === 'list' && (
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {groupedLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="font-mono text-[0.88rem] text-white/22">
                {linkSearch ? `Aucun résultat pour « ${linkSearch} »` : 'Aucun lien créé'}
              </p>
              {!linkSearch && (
                <button
                  type="button"
                  onClick={switchToCreate}
                  className="rounded-lg border border-cyan/25 bg-cyan/6 px-4 py-2 text-[0.82rem] font-semibold text-cyan/70 transition-all hover:bg-cyan/12 hover:text-cyan/90"
                >
                  <Link2 size={12} className="mr-1.5 inline-block -translate-y-px" />
                  Créer un premier lien
                </button>
              )}
            </div>
          ) : (
            groupedLinks.map((group) => (
              <SourceGroup
                key={group.srcId || group.sourceNode?.id}
                group={group}
                authorsMap={authorsMap}
                editingLink={editingLink}
                editingLinkValue={editingLinkValue}
                setEditingLinkValue={setEditingLinkValue}
                setEditingLink={setEditingLink}
                commitLinkEdit={commitLinkEdit}
                deletingLinkId={deletingLinkId}
                setDeletingLinkId={setDeletingLinkId}
                onDeleteLink={onDeleteLink}
                onOpenWorkDetail={onOpenWorkDetail}
                onTisserFrom={group.sourceNode ? () => {
                  setLinkSourceNode(group.sourceNode!)
                  setLinkCheckedIds(new Set<BookId>())
                  setChecklistSearch('')
                  switchToCreate()
                } : undefined}
              />
            ))
          )}
        </div>
      )}

      {/* ── Create mode ── */}
      {mode === 'create' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Source picker */}
          <div className="shrink-0 border-b border-white/8 px-5 py-4">
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/30">
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
              placeholder="Quel livre cite les autres ?…"
            />
            {linkSourceNode && (
              <button
                type="button"
                onClick={() => { setLinkSourceNode(null); setLinkCheckedIds(new Set<BookId>()) }}
                className="mt-1.5 inline-flex items-center gap-1 font-mono text-[0.72rem] text-white/25 transition-colors hover:text-white/55"
              >
                <X size={10} /> retirer
              </button>
            )}
          </div>

          {linkSourceNode ? (
            <>
              {/* Target checklist */}
              <div className="shrink-0 border-b border-white/6 px-5 py-2">
                <div className="relative max-w-sm">
                  <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/22" />
                  <TextInput
                    variant="table"
                    className="rounded-md border border-white/8 bg-white/4 py-1 pl-6 pr-2 text-[0.82rem] focus:border-cyan/[0.28]"
                    placeholder="Filtrer les livres cités…"
                    value={checklistSearch}
                    onChange={(e) => setChecklistSearch(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-[0.72rem] text-white/25">
                  {newLinksCount > 0
                    ? `${newLinksCount} nouveau${newLinksCount > 1 ? 'x' : ''} lien${newLinksCount > 1 ? 's' : ''} sélectionné${newLinksCount > 1 ? 's' : ''}`
                    : 'Cochez les livres cités'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {checklistNodes.map((n) => {
                  const existing = existingTargetIds.has(n.id)
                  const checked = existing || linkCheckedIds.has(n.id)
                  const isJustAdded = justAddedId === n.id
                  return (
                    <label
                      key={n.id}
                      ref={isJustAdded ? justAddedRef : undefined}
                      className={[
                        'flex cursor-pointer items-center gap-3 px-5 py-2 transition-colors hover:bg-white/4',
                        existing ? 'cursor-default opacity-40' : '',
                        linkCheckedIds.has(n.id) ? 'bg-green/4' : '',
                        isJustAdded ? 'animate-pulse-highlight ring-1 ring-cyan/40 rounded-md bg-cyan/8' : '',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                          checked
                            ? existing
                              ? 'border-white/25 bg-white/10 text-white/40'
                              : 'border-green bg-green/18 text-green'
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
                        <span className="block truncate font-mono text-[0.82rem] text-white/75">{n.title}</span>
                        <span className="block font-mono text-[0.72rem] text-white/30">
                          {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                          {existing && ' · déjà lié'}
                        </span>
                      </span>
                    </label>
                  )
                })}
                {checklistNodes.length === 0 && !inlineOpen && (
                  <div className="px-5 py-4">
                    <p className="font-mono text-[0.82rem] text-white/22">
                      {checklistSearch ? 'Aucun résultat' : 'Aucun autre ouvrage'}
                    </p>
                    {checklistSearch && canInline && (
                      <button
                        type="button"
                        onClick={() => setInlineOpen(true)}
                        className="mt-2 font-mono text-[0.78rem] text-cyan/60 transition-colors hover:text-cyan/90"
                      >
                        + Ajouter un ouvrage ?
                      </button>
                    )}
                  </div>
                )}
                {inlineOpen && canInline && (
                  <div className="px-5 py-3">
                    <InlineBookForm
                      initialTitle={checklistSearch}
                      nodes={nodes}
                      authors={authors}
                      authorsMap={authorsMap}
                      onAddAuthor={onAddAuthor}
                      onSubmit={(book) => {
                        onAddBook(book)
                        setInlineOpen(false)
                        setChecklistSearch('')
                        toggleChecklist(book.id)
                        setJustAddedId(book.id)
                      }}
                      onCancel={() => setInlineOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Tisser button */}
              <div className="shrink-0 border-t border-white/8 px-5 py-3">
                <Button
                  type="button"
                  onClick={() => {
                    handleTisser()
                    switchToList()
                  }}
                  disabled={newLinksCount === 0}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan/35 bg-cyan/10 py-2.5 text-[0.88rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Link2 size={14} />
                  {newLinksCount > 0 ? `Tisser ${newLinksCount} lien${newLinksCount > 1 ? 's' : ''}` : 'Tisser'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-center font-mono text-[0.88rem] text-white/22">
                Sélectionnez un livre source<br />pour voir les cibles disponibles
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Source group in list mode ── */

function SourceGroup({
  group,
  authorsMap,
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
}: {
  group: LinkGroup
  authorsMap: Map<string, AuthorNode>
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
}) {
  return (
    <div className="mb-4">
      {/* Source header */}
      <div className="mb-1 flex items-center gap-2">
        <AxesDot axes={group.sourceNode?.axes || []} />
        <span className="font-mono text-[0.88rem] font-semibold text-white/85">
          {group.sourceNode?.title || '[ouvrage supprimé]'}
        </span>
        <span className="font-mono text-[0.75rem] text-white/30">
          {group.sourceNode ? bookAuthorDisplay(group.sourceNode, authorsMap) : ''}
          {group.sourceNode?.year ? `, ${group.sourceNode.year}` : ''}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-white/6 px-2 py-px font-mono text-[0.72rem] text-white/30">
          {group.links.length}
        </span>
        {onTisserFrom && (
          <button
            type="button"
            onClick={onTisserFrom}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-cyan/20 bg-cyan/6 px-2 py-0.5 font-mono text-[0.72rem] text-cyan/60 transition-all hover:border-cyan/40 hover:bg-cyan/12 hover:text-cyan/90"
          >
            <Plus size={10} />
            Tisser
          </button>
        )}
      </div>

      {/* Target links */}
      <div className="ml-2 flex flex-col border-l border-white/8 pl-3">
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
    </div>
  )
}

/* ── Single link row ── */

function LinkRow({
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
}: {
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
}) {
  const isExpanded = editingLink?.id === link.id
  const isEditCtx = editingLink?.id === link.id && editingLink?.field === 'citation_text'
  const isEditPage = editingLink?.id === link.id && editingLink?.field === 'page'
  const isEditEdition = editingLink?.id === link.id && editingLink?.field === 'edition'
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
        className={[
          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          isExpanded ? 'bg-white/5' : 'hover:bg-white/3',
        ].join(' ')}
        onClick={toggleExpand}
      >
        <ChevronRight
          size={10}
          className={[
            'shrink-0 text-white/20 transition-transform',
            isExpanded ? 'rotate-90' : '',
          ].join(' ')}
        />
        <AxesDot axes={link.targetNode?.axes || []} size="small" />
        <span className="min-w-0 flex-1 truncate font-mono text-[0.85rem] text-white/75">
          {link.targetNode?.title || '[ouvrage supprimé]'}
          {link.targetNode && (
            <span className="ml-1.5 text-white/30">
              — {bookAuthorDisplay(link.targetNode, authorsMap)}
              {link.targetNode.year ? `, ${link.targetNode.year}` : ''}
            </span>
          )}
        </span>

        {/* Inline meta preview (collapsed) */}
        {!isExpanded && hasMeta && (
          <span className="hidden shrink-0 items-center gap-2 font-mono text-[0.72rem] text-white/25 sm:flex">
            {link.page && <span className="tabular-nums">p.{link.page}</span>}
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
          className={[
            'shrink-0 rounded border px-1 py-0.5 text-[0.72rem] transition-all',
            isDeleting
              ? 'border-red/45 text-red/80'
              : 'border-transparent text-transparent group-hover:border-red/22 group-hover:bg-red/6 group-hover:text-red/50',
          ].join(' ')}
          title={isDeleting ? 'Confirmer la suppression' : 'Supprimer'}
        >
          {isDeleting ? '×' : <Trash2 size={9} />}
        </button>
      </div>

      {/* Citation preview (collapsed) */}
      {!isExpanded && (link.citation_text || link.context) && (
        <div className="ml-7 mb-1 flex items-start gap-1.5 px-2">
          <Quote size={10} className="mt-0.5 shrink-0 text-white/20" />
          <p className="whitespace-pre-wrap font-mono text-[0.75rem] italic leading-relaxed text-white/30">
            {link.citation_text || link.context}
          </p>
        </div>
      )}

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="ml-5 mb-1 mt-1 rounded-lg border border-white/8 bg-white/2 p-3">
          {/* Actions row */}
          {link.targetNode && onOpenWorkDetail && (
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenWorkDetail(link.targetNode!.id)}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/4 px-2 py-1 text-[0.72rem] text-white/45 transition-colors hover:border-violet/30 hover:bg-violet/8 hover:text-violet/90"
              >
                <Eye size={11} /> Graphe
              </button>
            </div>
          )}

          {/* Citation */}
          <div className="mb-2">
            <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/25">
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
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingLink({ id: link.id, field: 'citation_text' })
                  setEditingLinkValue(link.citation_text || link.context || '')
                }}
              >
                {link.citation_text || link.context || 'Ajouter une citation…'}
              </span>
            )}
          </div>

          {/* Page + Édition */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/25">
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
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingLink({ id: link.id, field: 'page' })
                    setEditingLinkValue(link.page || '')
                  }}
                >
                  {link.page || 'p.—'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="mb-0.5 block text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/25">
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
                  onClick={(e) => {
                    e.stopPropagation()
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
}

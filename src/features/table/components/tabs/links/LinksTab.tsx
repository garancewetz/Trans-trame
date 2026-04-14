import { useEffect, useRef, useState, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Check, Link2, Plus, Search, X, Zap } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { AxesDot } from '@/common/components/ui/AxesDot'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT } from '../../../tableConstants'
import { NodeSearch } from '../../NodeSearch'
import { InlineBookForm } from '../../../../add-book-form/components/InlineBookForm'
import type { BookId } from '@/types/domain'
import type { LinksTabProps } from './linksTab.types'
import { SourceGroup } from './SourceGroup'

type Mode = 'list' | 'create'

export function LinksTab({
  nodes,
  authorsMap,
  linkSourceNode,
  setLinkSourceNode,
  linkDirection,
  setLinkDirection,
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
  onOpenWorkDetail,
  authors,
  onAddAuthor,
  onAddBook,
  onSmartImportFrom,
}: LinksTabProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [inlineOpen, setInlineOpen] = useState(false)
  const [justAddedId, setJustAddedId] = useState<BookId | null>(null)
  const justAddedRef = useRef<HTMLLabelElement>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

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
      {/* Mode toggle */}
      <ModeToggle mode={mode} totalLinks={totalLinks} linkSearch={linkSearch} onList={switchToList} onCreate={switchToCreate} />

      {/* Focused book (when navigating from Books tab) */}
      {mode === 'list' && linkSourceNode && (
        <FocusedBookBanner
          node={linkSourceNode}
          authorsMap={authorsMap}
          onTisser={() => { setLinkCheckedIds(new Set<BookId>()); setChecklistSearch(''); switchToCreate() }}
          onSmartImport={onSmartImportFrom ? () => onSmartImportFrom(linkSourceNode) : undefined}
          onClear={() => setLinkSourceNode(null)}
        />
      )}

      {/* List mode */}
      {mode === 'list' && (
        <LinkListMode
          groupedLinks={groupedLinks}
          linkSearch={linkSearch}
          linkSourceNode={linkSourceNode}
          authorsMap={authorsMap}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          editingLink={editingLink}
          editingLinkValue={editingLinkValue}
          setEditingLinkValue={setEditingLinkValue}
          setEditingLink={setEditingLink}
          commitLinkEdit={commitLinkEdit}
          deletingLinkId={deletingLinkId}
          setDeletingLinkId={setDeletingLinkId}
          onDeleteLink={onDeleteLink}
          onOpenWorkDetail={onOpenWorkDetail}
          onTisserFrom={(sourceNode) => {
            setLinkSourceNode(sourceNode)
            setLinkCheckedIds(new Set<BookId>())
            setChecklistSearch('')
            switchToCreate()
          }}
          onSmartImportFrom={onSmartImportFrom}
          switchToCreate={switchToCreate}
        />
      )}

      {/* Create mode */}
      {mode === 'create' && (
        <LinkCreateMode
          nodes={nodes}
          authorsMap={authorsMap}
          linkSourceNode={linkSourceNode}
          setLinkSourceNode={setLinkSourceNode}
          linkDirection={linkDirection}
          setLinkDirection={setLinkDirection}
          setLinkCheckedIds={setLinkCheckedIds}
          checklistSearch={checklistSearch}
          setChecklistSearch={setChecklistSearch}
          checklistNodes={checklistNodes}
          existingTargetIds={existingTargetIds}
          linkCheckedIds={linkCheckedIds}
          toggleChecklist={toggleChecklist}
          newLinksCount={newLinksCount}
          handleTisser={() => { handleTisser(); switchToList() }}
          justAddedId={justAddedId}
          justAddedRef={justAddedRef}
          inlineOpen={inlineOpen}
          setInlineOpen={setInlineOpen}
          setJustAddedId={setJustAddedId}
          authors={authors}
          onAddAuthor={onAddAuthor}
          onAddBook={onAddBook}
          canInline={!!canInline}
        />
      )}
    </div>
  )
}

/* ── Small sub-components kept in the same file ── */

function ModeToggle({ mode, totalLinks, linkSearch, onList, onCreate }: {
  mode: Mode; totalLinks: number; linkSearch: string; onList: () => void; onCreate: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-white/8 px-5 py-1.5">
      <button type="button" onClick={onList}
        className={['rounded-md px-3 py-1.5 text-label font-semibold transition-all',
          mode === 'list' ? 'bg-white/8 text-white/80' : 'text-white/35 hover:text-white/55'].join(' ')}>
        Relations
        {totalLinks > 0 && <span className="ml-1.5 text-micro font-normal text-white/25">{totalLinks}</span>}
      </button>
      <button type="button" onClick={onCreate}
        className={['rounded-md px-3 py-1.5 text-label font-semibold transition-all',
          mode === 'create' ? 'bg-cyan/10 text-cyan/80' : 'text-white/35 hover:text-cyan/60'].join(' ')}>
        + Tisser
      </button>
      {linkSearch && mode === 'list' && (
        <span className="ml-auto text-micro text-white/20">filtrées par «&nbsp;{linkSearch}&nbsp;»</span>
      )}
    </div>
  )
}

function FocusedBookBanner({ node, authorsMap, onTisser, onSmartImport, onClear }: {
  node: import('@/types/domain').Book
  authorsMap: Map<string, import('@/common/utils/authorUtils').AuthorNode>
  onTisser: () => void; onSmartImport?: () => void; onClear: () => void
}) {
  return (
    <div className="shrink-0 border-b border-white/8 px-5 py-3">
      <div className="flex items-center gap-2 rounded-lg border border-cyan/15 bg-cyan/3 px-3 py-2.5">
        <AxesDot axes={node.axes || []} />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[0.88rem] font-semibold text-white/85">{node.title}</span>
          <span className="block font-mono text-micro text-white/30">
            {bookAuthorDisplay(node, authorsMap)}{node.year ? `, ${node.year}` : ''}
          </span>
        </div>
        <button type="button" onClick={onTisser}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-cyan/20 bg-cyan/6 px-2.5 py-1 font-mono text-[0.78rem] text-cyan/60 transition-all hover:border-cyan/40 hover:bg-cyan/12 hover:text-cyan/90">
          <Plus size={10} /> Tisser
        </button>
        {onSmartImport && (
          <button type="button" onClick={onSmartImport}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-amber/20 bg-amber/6 px-2.5 py-1 font-mono text-[0.78rem] text-amber/60 transition-all hover:border-amber/40 hover:bg-amber/12 hover:text-amber/90">
            <Zap size={10} /> Import
          </button>
        )}
        <button type="button" onClick={onClear} className="shrink-0 text-white/25 transition-colors hover:text-white/55">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

function LinkListMode({ groupedLinks, linkSearch, linkSourceNode, authorsMap, expandedGroups, toggleGroup,
  editingLink, editingLinkValue, setEditingLinkValue, setEditingLink, commitLinkEdit,
  deletingLinkId, setDeletingLinkId, onDeleteLink, onOpenWorkDetail,
  onTisserFrom, onSmartImportFrom, switchToCreate }: {
  groupedLinks: import('./linksTab.types').LinkGroup[]
  linkSearch: string; linkSourceNode: import('@/types/domain').Book | null
  authorsMap: Map<string, import('@/common/utils/authorUtils').AuthorNode>
  expandedGroups: Set<string>; toggleGroup: (id: string) => void
  editingLink: null | { id: string; field: string }; editingLinkValue: string
  setEditingLinkValue: (v: string) => void; setEditingLink: (next: null | { id: string; field: string }) => void
  commitLinkEdit: () => void; deletingLinkId: string | null
  setDeletingLinkId: (id: string | null) => void; onDeleteLink: (linkId: string) => void
  onOpenWorkDetail?: (bookId: BookId) => void
  onTisserFrom: (node: import('@/types/domain').Book) => void
  onSmartImportFrom?: (book: import('@/types/domain').Book) => void
  switchToCreate: () => void
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden px-5 py-3">
      {groupedLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="font-mono text-[0.88rem] text-white/22">
            {linkSearch ? `Aucun résultat pour « ${linkSearch} »` : 'Aucun lien créé'}
          </p>
          {!linkSearch && !linkSourceNode && (
            <button type="button" onClick={switchToCreate}
              className="rounded-lg border border-cyan/25 bg-cyan/6 px-4 py-2 text-label font-semibold text-cyan/70 transition-all hover:bg-cyan/12 hover:text-cyan/90">
              <Link2 size={12} className="mr-1.5 inline-block -translate-y-px" /> Créer un premier lien
            </button>
          )}
        </div>
      ) : (
        <Virtuoso
          className="flex-1"
          totalCount={groupedLinks.length}
          itemContent={(index) => {
            const group = groupedLinks[index]
            const groupId = group.srcId || group.sourceNode?.id || ''
            return (
              <SourceGroup
                group={group}
                authorsMap={authorsMap}
                isOpen={expandedGroups.has(groupId)}
                onToggle={() => toggleGroup(groupId)}
                editingLink={editingLink}
                editingLinkValue={editingLinkValue}
                setEditingLinkValue={setEditingLinkValue}
                setEditingLink={setEditingLink}
                commitLinkEdit={commitLinkEdit}
                deletingLinkId={deletingLinkId}
                setDeletingLinkId={setDeletingLinkId}
                onDeleteLink={onDeleteLink}
                onOpenWorkDetail={onOpenWorkDetail}
                onTisserFrom={group.sourceNode ? () => onTisserFrom(group.sourceNode!) : undefined}
                onSmartImportFrom={group.sourceNode && onSmartImportFrom ? () => onSmartImportFrom(group.sourceNode!) : undefined}
              />
            )
          }}
        />
      )}
    </div>
  )
}

function LinkCreateMode({ nodes, authorsMap, linkSourceNode, setLinkSourceNode, linkDirection, setLinkDirection,
  setLinkCheckedIds, checklistSearch, setChecklistSearch, checklistNodes, existingTargetIds, linkCheckedIds,
  toggleChecklist, newLinksCount, handleTisser, justAddedId, justAddedRef, inlineOpen, setInlineOpen,
  setJustAddedId, authors, onAddAuthor, onAddBook, canInline }: {
  nodes: import('@/types/domain').Book[]; authorsMap: Map<string, import('@/common/utils/authorUtils').AuthorNode>
  linkSourceNode: import('@/types/domain').Book | null; setLinkSourceNode: (n: import('@/types/domain').Book | null) => void
  linkDirection: 'source' | 'cited'; setLinkDirection: (d: 'source' | 'cited') => void
  setLinkCheckedIds: (s: Set<BookId>) => void; checklistSearch: string; setChecklistSearch: (v: string) => void
  checklistNodes: import('@/types/domain').Book[]; existingTargetIds: Set<BookId>; linkCheckedIds: Set<BookId>
  toggleChecklist: (id: BookId) => void; newLinksCount: number; handleTisser: () => void
  justAddedId: BookId | null; justAddedRef: import('react').RefObject<HTMLLabelElement | null>
  inlineOpen: boolean; setInlineOpen: (v: boolean) => void; setJustAddedId: (id: BookId | null) => void
  authors?: import('@/types/domain').Author[]; onAddAuthor?: (a: import('@/types/domain').Author) => void
  onAddBook?: (b: Partial<import('@/types/domain').Book> & Pick<import('@/types/domain').Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  canInline: boolean
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Direction toggle + picker */}
      <div className="shrink-0 border-b border-white/8 px-5 py-4">
        <div className="mb-2 flex items-center gap-1">
          <button type="button" onClick={() => { setLinkDirection('source'); setLinkCheckedIds(new Set<BookId>()) }}
            className={['rounded-md px-2 py-1 text-micro font-semibold transition-all',
              linkDirection === 'source' ? 'bg-cyan/12 text-cyan/80' : 'text-white/30 hover:text-white/55'].join(' ')}>
            Livre source
          </button>
          <button type="button" onClick={() => { setLinkDirection('cited'); setLinkCheckedIds(new Set<BookId>()) }}
            className={['rounded-md px-2 py-1 text-micro font-semibold transition-all',
              linkDirection === 'cited' ? 'bg-cyan/12 text-cyan/80' : 'text-white/30 hover:text-white/55'].join(' ')}>
            Livre cité
          </button>
        </div>
        <NodeSearch
          nodes={nodes} authorsMap={authorsMap} value={linkSourceNode}
          onSelect={(n) => { setLinkSourceNode(n); setLinkCheckedIds(new Set<BookId>()); setChecklistSearch('') }}
          placeholder={linkDirection === 'source' ? 'Quel livre cite les autres ?…' : 'Quel livre est cité ?…'}
        />
        {linkSourceNode && (
          <button type="button" onClick={() => { setLinkSourceNode(null); setLinkCheckedIds(new Set<BookId>()) }}
            className="mt-1.5 inline-flex items-center gap-1 font-mono text-micro text-white/25 transition-colors hover:text-white/55">
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
              <TextInput variant="table"
                className="rounded-md border border-white/8 bg-white/4 py-1 pl-6 pr-2 text-label focus:border-cyan/[0.28]"
                placeholder={linkDirection === 'source' ? 'Filtrer les livres cités…' : 'Filtrer les livres sources…'}
                value={checklistSearch} onChange={(e) => setChecklistSearch(e.target.value)}
              />
            </div>
            <p className="mt-1 text-micro text-white/25">
              {newLinksCount > 0
                ? `${newLinksCount} nouveau${newLinksCount > 1 ? 'x' : ''} lien${newLinksCount > 1 ? 's' : ''} sélectionné${newLinksCount > 1 ? 's' : ''}`
                : linkDirection === 'source' ? 'Cochez les livres cités' : 'Cochez les livres qui le citent'}
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {checklistNodes.length > 0 ? (
              <Virtuoso className="flex-1" totalCount={checklistNodes.length}
                itemContent={(index) => {
                  const n = checklistNodes[index]
                  const existing = existingTargetIds.has(n.id)
                  const isChecked = existing || linkCheckedIds.has(n.id)
                  const isJustAdded = justAddedId === n.id
                  return (
                    <label ref={isJustAdded ? justAddedRef : undefined}
                      className={[
                        'flex cursor-pointer items-center gap-3 px-5 py-2 transition-colors hover:bg-white/4',
                        existing ? 'cursor-default opacity-40' : '',
                        linkCheckedIds.has(n.id) ? 'bg-green/4' : '',
                        isJustAdded ? 'animate-pulse-highlight ring-1 ring-cyan/40 rounded-md bg-cyan/8' : '',
                      ].join(' ')}>
                      <span className={[
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                        isChecked ? existing ? 'border-white/25 bg-white/10 text-white/40' : 'border-green bg-green/18 text-green' : 'border-white/15 text-transparent',
                      ].join(' ')}><Check size={9} /></span>
                      <input type="checkbox" className="sr-only" checked={isChecked} disabled={existing} onChange={() => toggleChecklist(n.id)} />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-label text-white/75">{n.title}</span>
                        <span className="block font-mono text-micro text-white/30">
                          {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}{existing && ' · déjà lié'}
                        </span>
                      </span>
                    </label>
                  )
                }}
              />
            ) : !inlineOpen ? (
              <div className="px-5 py-4">
                <p className="font-mono text-label text-white/22">{checklistSearch ? 'Aucun résultat' : 'Aucun autre ouvrage'}</p>
                {checklistSearch && canInline && (
                  <button type="button" onClick={() => setInlineOpen(true)}
                    className="mt-2 font-mono text-[0.78rem] text-cyan/60 transition-colors hover:text-cyan/90">
                    + Ajouter un ouvrage ?
                  </button>
                )}
              </div>
            ) : null}
            {inlineOpen && canInline && (
              <div className="px-5 py-3">
                <InlineBookForm initialTitle={checklistSearch} nodes={nodes} authors={authors!} authorsMap={authorsMap} onAddAuthor={onAddAuthor}
                  onSubmit={(book) => { onAddBook!(book); setInlineOpen(false); setChecklistSearch(''); toggleChecklist(book.id); setJustAddedId(book.id) }}
                  onCancel={() => setInlineOpen(false)} />
              </div>
            )}
          </div>

          {/* Tisser button */}
          <div className="shrink-0 border-t border-white/8 px-5 py-3">
            <Button type="button" onClick={handleTisser} disabled={newLinksCount === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan/35 bg-cyan/10 py-2.5 text-[0.88rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18 disabled:cursor-not-allowed disabled:opacity-25">
              <Link2 size={14} />
              {newLinksCount > 0 ? `Tisser ${newLinksCount} lien${newLinksCount > 1 ? 's' : ''}` : 'Tisser'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center font-mono text-[0.88rem] text-white/22">
            {linkDirection === 'source'
              ? <>Sélectionnez un livre source<br />pour voir les cibles disponibles</>
              : <>Sélectionnez un livre cité<br />pour voir les sources disponibles</>}
          </p>
        </div>
      )}
    </div>
  )
}

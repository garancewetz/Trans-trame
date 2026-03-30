import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Link2, Merge, Plus, Trash2 } from 'lucide-react'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import Button from '@/components/ui/Button'
import OutlineBadge from '@/components/ui/OutlineBadge'
import TextInput from '@/components/ui/TextInput'
import { INPUT, TD } from '../tableConstants'
import { AxisDots, AuthorPicker, TH } from '../TableSubcomponents'
import TableMergeModal from '../TableMergeModal'
import type { Author, AuthorId, Book, BookId, Link } from '@/domain/types'
import { narrowAxes, type Axis } from '@/lib/categories'

function maybeNodeId(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const anyV = v as { id?: unknown }
    if (typeof anyV.id === 'string') return anyV.id
  }
  return null
}

type BooksTabProps = {
  nodes: Book[]
  links: Link[]
  search: string
  authors: Author[]
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onBookAdded?: (title: string) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  initialAuthorIds?: AuthorId[]
  autoFocusTitle?: boolean
  focusBookId?: BookId | null
}

export default function BooksTab({
  nodes,
  links,
  search,
  authors,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onMergeBooks,
  onAddAuthor,
  onLastEdited,
  onBookAdded,
  onOpenLinksForBook,
  onFocusAuthorInAuthorsTab,
  initialAuthorIds = [],
  autoFocusTitle = false,
  focusBookId,
}: BooksTabProps) {
  const [editingAuthorsNodeId, setEditingAuthorsNodeId] = useState<BookId | null>(null)
  const [sortCol, setSortCol] = useState('lastName')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState<Set<BookId>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [editingCell, setEditingCell] = useState<null | { nodeId: BookId; field: 'title' | 'year' }>(null)
  const [editingValue, setEditingValue] = useState('')

  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<BookId | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)

  const [inputTitle, setInputTitle] = useState('')
  const [inputAuthorIds, setInputAuthorIds] = useState<AuthorId[]>(initialAuthorIds)
  const [inputYear, setInputYear] = useState('')
  const [inputAxes, setInputAxes] = useState<Axis[]>([])
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  // Index des auteurs par id pour affichage rapide des badges
  const authorsMap = useMemo(() => {
    const m = new Map<string, Author>()
    ;(authors || []).forEach((a) => m.set(a.id, a))
    return m
  }, [authors])

  const linkCountByNode = useMemo(() => {
    const counts = new Map()
    ;(links || []).forEach((l) => {
      const srcId = maybeNodeId(l.source)
      const tgtId = maybeNodeId(l.target)
      if (srcId) counts.set(srcId, (counts.get(srcId) || 0) + 1)
      if (tgtId) counts.set(tgtId, (counts.get(tgtId) || 0) + 1)
    })
    return counts
  }, [links])

  const filteredNodes = useMemo(() => {
    const q = String(search || '').toLowerCase().trim()
    if (!q) return nodes
    return (nodes || []).filter(
      (n) =>
        String(n.title || '').toLowerCase().includes(q) ||
        bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q) ||
        String(n.year || '').includes(q)
    )
  }, [nodes, search, authorsMap])

  const sortedNodes = useMemo(() => {
    const list = [...filteredNodes]
    list.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'title': va = String(a.title || '').toLowerCase(); vb = String(b.title || '').toLowerCase(); break
        case 'lastName': va = bookAuthorDisplay(a, authorsMap).toLowerCase(); vb = bookAuthorDisplay(b, authorsMap).toLowerCase(); break
        case 'year': va = a.year || 0; vb = b.year || 0; break
        default: va = ''; vb = ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredNodes, sortCol, sortDir, authorsMap])

  const allSelected = sortedNodes.length > 0 && sortedNodes.every((n) => selectedIds.has(n.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const mergeNodes = useMemo(() => {
    if (selectedIds.size !== 2) return []
    const ids = new Set(selectedIds)
    return (nodes || []).filter((n) => ids.has(n.id))
  }, [nodes, selectedIds])

  useEffect(() => {
    if (!autoFocusTitle) return
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [autoFocusTitle])

  useEffect(() => {
    if (!focusBookId) return
    setTimeout(() => {
      const el = document.querySelector(`[data-book-row-id="${focusBookId}"]`)
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }, 50)
  }, [focusBookId])

  const handleNodeSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedNodes.map((n) => n.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const commitNodeEdit = () => {
    if (!editingCell) return
    const { nodeId, field } = editingCell
    const node = (nodes || []).find((n) => n.id === nodeId)
    if (!node) { setEditingCell(null); return }
    let val = editingValue.trim()
    if (field === 'year') {
      const p = parseInt(val)
      val = isNaN(p) ? String(node.year || '') : String(p)
    }
    if (String(val) !== String(node[field] ?? '')) {
      onUpdateBook?.({ ...node, [field]: field === 'year' ? (val ? parseInt(val) : null) : val })
      onLastEdited?.(nodeId)
    }
    setEditingCell(null)
  }

  const handleBulkDelete = () => {
    if (!bulkDeleteConfirm) { setBulkDeleteConfirm(true); return }
    selectedIds.forEach((id) => onDeleteBook?.(id))
    clearSelection()
    setBulkDeleteConfirm(false)
  }

  const handleAddBookRow = () => {
    if (!inputTitle.trim()) return
    const title = inputTitle.trim()
    onAddBook?.({
      id: crypto.randomUUID(),
      title,
      authorIds: inputAuthorIds,
      year: parseInt(inputYear) || null,
      axes: inputAxes,
      description: '',
    })
    onBookAdded?.(title)
    setInputTitle('')
    setInputYear('')
    setInputAxes([])
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleConfirmMerge = () => {
    if (!mergeKeepId || mergeNodes.length !== 2) return
    if (!mergeConfirm) { setMergeConfirm(true); return }
    const fromNode = mergeNodes.find((n) => n.id !== mergeKeepId)
    if (fromNode) onMergeBooks?.(fromNode.id, mergeKeepId)
    setMergeModal(false)
    setMergeKeepId(null)
    setMergeConfirm(false)
    clearSelection()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* Barre de sélection */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
          <span className="font-mono text-[0.72rem] text-white/45">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          {selectedIds.size === 2 && (
            <Button
              type="button"
              onClick={() => {
                setMergeKeepId(mergeNodes[0]?.id || null)
                setMergeConfirm(false)
                setMergeModal(true)
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(255,200,60,0.3)] bg-[rgba(255,200,60,0.07)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(255,210,100,0.75)] transition-all hover:bg-[rgba(255,200,60,0.14)]"
            >
              <Merge size={12} /> Fusionner
            </Button>
          )}
          <Button
            type="button"
            onClick={handleBulkDelete}
            onBlur={() => setBulkDeleteConfirm(false)}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              bulkDeleteConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
                : 'border-[rgba(255,70,70,0.22)] text-[rgba(255,90,90,0.55)] hover:bg-[rgba(255,70,70,0.07)]',
            ].join(' ')}
          >
            <Trash2 size={11} />
            {bulkDeleteConfirm ? `Confirmer (${selectedIds.size})` : `Supprimer (${selectedIds.size})`}
          </Button>
          <Button
            type="button"
            onClick={() => { clearSelection(); setBulkDeleteConfirm(false) }}
            className="cursor-pointer text-[0.7rem] text-white/25 hover:text-white/60"
          >
            Annuler
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-[rgba(4,6,20,0.98)]">
          <tr className="border-b border-white/6">
            <th className="w-9 px-3 py-2.5">
              <Button
                onClick={toggleAll}
                type="button"
                className={[
                  'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                  allSelected ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                    : someSelected ? 'border-[rgba(0,255,135,0.38)] bg-[rgba(0,255,135,0.07)] text-[rgba(0,255,135,0.55)]'
                    : 'border-white/14 text-transparent hover:border-white/28',
                ].join(' ')}
              >
                <Check size={9} />
              </Button>
            </th>
            <TH col="title" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort} className="min-w-[200px]">
              Titre
            </TH>
            <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort}>
              Auteur·ice
            </TH>
            <TH col="year" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort} className="w-20">
              Année
            </TH>
            <th className="w-40 px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Axes
            </th>
            <th className="w-20 px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Liens
            </th>
          </tr>

          <tr className="border-b border-[rgba(140,220,255,0.1)] bg-[rgba(140,220,255,0.02)]">
            <td className="px-3 py-1.5 text-center">
              <Plus size={11} className="text-[rgba(140,220,255,0.35)]" />
            </td>
            <td className="px-2 py-1.5">
              <TextInput
                variant="table"
                ref={titleInputRef}
                className={INPUT}
                placeholder="Titre *"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookRow()}
              />
            </td>
            <td className="px-2 py-1.5">
              <AuthorPicker
                authors={authors}
                selectedAuthorIds={inputAuthorIds}
                onChange={setInputAuthorIds}
                onAddAuthor={onAddAuthor}
              />
            </td>
            <td className="px-2 py-1.5">
              <TextInput
                variant="table"
                className={INPUT}
                type="number"
                placeholder="1984"
                value={inputYear}
                onChange={(e) => setInputYear(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookRow()}
              />
            </td>
            <td className="px-3 py-1.5">
              <div className="flex items-center gap-2.5">
                <AxisDots axes={inputAxes} onChange={setInputAxes} />
                <Button
                  type="button"
                  onClick={handleAddBookRow}
                  disabled={!inputTitle.trim()}
                  className="shrink-0 cursor-pointer rounded-md border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] px-2 py-1 text-[0.65rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  + Ajouter
                </Button>
              </div>
            </td>
            <td />
          </tr>
        </thead>

        <tbody>
          {sortedNodes.map((node, i) => {
            const isSelected = selectedIds.has(node.id)
            const isEditTitle = editingCell?.nodeId === node.id && editingCell?.field === 'title'
            const isEditYear = editingCell?.nodeId === node.id && editingCell?.field === 'year'
            return (
              <tr
                key={node.id}
                data-book-row-id={node.id}
                className={[
                  'group border-b border-white/4 transition-colors',
                  isSelected ? 'bg-[rgba(0,255,135,0.025)]' : i % 2 === 0 ? 'bg-white/[0.003]' : '',
                  'hover:bg-white/2.5',
                ].join(' ')}
              >
                <td className="px-3 py-2">
                  <Button
                    onClick={() => toggleRow(node.id)}
                    type="button"
                    className={[
                      'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                      isSelected
                        ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                        : 'border-white/14 text-transparent hover:border-white/28',
                    ].join(' ')}
                  >
                    <Check size={9} />
                  </Button>
                </td>
                <td className={TD}>
                  {isEditTitle ? (
                    <TextInput
                      variant="table"
                      autoFocus
                      className={INPUT}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
                      onBlur={commitNodeEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                    />
                  ) : (
                    <span className="cursor-text px-0.5 hover:text-white"
                      onClick={() => { setEditingCell({ nodeId: node.id, field: 'title' }); setEditingValue(node.title) }}>
                      {node.title}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {editingAuthorsNodeId === node.id ? (
                    // Édition inline via AuthorPicker
                    <div
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingAuthorsNodeId(null) }}
                    >
                      <AuthorPicker
                        authors={authors}
                        selectedAuthorIds={node.authorIds || []}
                        onChange={(ids) => {
                          onUpdateBook?.({ ...node, authorIds: ids })
                          onLastEdited?.(node.id)
                        }}
                        onAddAuthor={onAddAuthor}
                      />
                    </div>
                  ) : (node.authorIds?.length ?? 0) > 0 ? (
                    // Badges cliquables → ouvre le picker
                    <div
                      className="flex min-h-[1.5em] cursor-pointer flex-wrap items-center gap-1 rounded px-0.5 py-0.5 hover:bg-white/4"
                      onClick={() => setEditingAuthorsNodeId(node.id)}
                    >
                      {(node.authorIds ?? []).map((aid) => {
                        const a = authorsMap.get(aid)
                        return a ? (
                          <OutlineBadge
                            key={aid}
                            onClick={(e) => {
                              e.stopPropagation()
                              onFocusAuthorInAuthorsTab?.(aid)
                            }}
                            title="Aller à l'auteur dans la table"
                            className="cursor-pointer hover:text-white"
                          >
                            {bookAuthorDisplay({ authorIds: [aid] }, authorsMap)}
                          </OutlineBadge>
                        ) : null
                      })}
                    </div>
                  ) : (
                    // Pas encore d'auteur·ice — clic ouvre le picker
                    <span
                      className="block min-h-[1.2em] w-full cursor-text px-0.5 text-white/42 hover:text-white"
                      onClick={() => setEditingAuthorsNodeId(node.id)}
                    >
                      {bookAuthorDisplay(node, authorsMap) || <span className="text-white/18">—</span>}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {isEditYear ? (
                    <TextInput
                      variant="table"
                      autoFocus
                      className={INPUT}
                      type="number"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
                      onBlur={commitNodeEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                    />
                  ) : (
                    <span className="cursor-text tabular-nums px-0.5 hover:text-white"
                      onClick={() => { setEditingCell({ nodeId: node.id, field: 'year' }); setEditingValue(String(node.year || '')) }}>
                      {node.year || <span className="text-white/18">—</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <AxisDots
                    axes={narrowAxes(node.axes)}
                    onChange={(newAxes) => { onUpdateBook?.({ ...node, axes: newAxes }); onLastEdited?.(node.id) }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    title="Voir / ajouter des liens pour cet ouvrage"
                    onClick={() => {
                      onOpenLinksForBook?.(node)
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[0.7rem] text-white/45 transition-all hover:border-[rgba(140,220,255,0.35)] hover:bg-[rgba(140,220,255,0.07)] hover:text-[rgba(140,220,255,0.8)]"
                  >
                    {linkCountByNode.get(node.id) ?? 0}
                    <Link2 size={10} className="shrink-0" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sortedNodes.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-[0.75rem] text-white/22">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun ouvrage'}
          </p>
        </div>
      )}
      </div>

      <TableMergeModal
        mergeModal={mergeModal}
        mergeNodes={mergeNodes}
        nodes={nodes}
        authorsMap={authorsMap}
        mergeKeepId={mergeKeepId}
        setMergeKeepId={setMergeKeepId}
        setMergeConfirm={setMergeConfirm}
        mergeConfirm={mergeConfirm}
        handleConfirmMerge={handleConfirmMerge}
        setMergeModal={setMergeModal}
      />
    </div>
  )
}


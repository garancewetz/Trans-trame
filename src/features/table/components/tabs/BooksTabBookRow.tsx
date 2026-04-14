import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCopy, Check, ClipboardList, Eye, Link2 } from 'lucide-react'
import { mapBookUrlSearch } from '@/common/utils/bookSlug'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'
import { Badge } from '@/common/components/ui/Badge'
import { TextInput } from '@/common/components/ui/TextInput'
import { INPUT, TD } from '../../tableConstants'
import { AxisDots, AuthorPicker } from '../TableSubcomponents'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import { splitBookAxes } from '@/common/utils/categories'

type Props = {
  node: Book
  rowIndex: number
  justAdded?: boolean
  isSelected: boolean
  isEditTitle: boolean
  isEditYear: boolean
  editingAuthorsNodeId: BookId | null
  setEditingAuthorsNodeId: (id: BookId | null) => void
  editingValue: string
  setEditingValue: (v: string) => void
  setEditingCell: (v: null | { nodeId: BookId; field: 'title' | 'year' }) => void
  authors: Author[]
  authorsMap: Map<string, Author>
  linkCount: number
  workSiblings?: Book[]
  toggleRow: (id: BookId) => void
  commitNodeEdit: () => void
  onUpdateBook?: (book: Book) => unknown
  onLastEdited?: (bookId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenLinksForBook?: (node: Book) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
}

function WorkSiblingsBadge({ siblings, authorsMap }: { siblings: Book[]; authorsMap: Map<string, Author> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const show = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setOpen(true), 150) }
  const hide = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setOpen(false), 200) }

  return (
    <span
      ref={ref}
      className="relative ml-1 inline-flex shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
    >
      <Tooltip content="Fait partie d'une même œuvre">
        <span className="inline-flex cursor-pointer items-center rounded px-0.5 text-amber/55 transition-colors hover:text-amber">
          <BookCopy size={13} />
        </span>
      </Tooltip>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-72 max-w-md rounded-lg border border-white/10 bg-bg-overlay/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
          onMouseLeave={hide}
        >
          <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-widest text-white/35">
            Même œuvre ({siblings.length + 1})
          </p>
          <ul className="flex flex-col gap-1">
            {siblings.map((s) => (
              <li key={s.id} className="flex gap-1.5 text-[0.78rem] leading-snug">
                <span className="mt-0.5 shrink-0 text-amber/40">•</span>
                <div className="flex flex-col">
                  <span className="text-white/75">
                    {s.title}
                    {s.year && <span className="ml-1.5 font-mono text-[0.7rem] text-white/30">{s.year}</span>}
                  </span>
                  {(s.authorIds?.length ?? 0) > 0 && (
                    <span className="text-[0.7rem] text-white/25">{bookAuthorDisplay(s, authorsMap)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}

export function BooksTabBookRow({
  node,
  rowIndex,
  justAdded,
  isSelected,
  isEditTitle,
  isEditYear,
  editingAuthorsNodeId,
  setEditingAuthorsNodeId,
  editingValue,
  setEditingValue,
  setEditingCell,
  authors,
  authorsMap,
  linkCount,
  workSiblings,
  toggleRow,
  commitNodeEdit,
  onUpdateBook,
  onLastEdited,
  onAddAuthor,
  onFocusAuthorInAuthorsTab,
  onOpenLinksForBook,
  onOpenWorkDetail,
}: Props) {
  return (
    <tr
      data-book-row-id={node.id}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 44px' }}
      className={[
        'group cursor-pointer border-b border-white/4 transition-colors',
        justAdded ? 'animate-flash-row' : '',
        isSelected ? 'bg-green/[0.025]' : rowIndex % 2 === 0 ? 'bg-white/[0.003]' : '',
        'hover:bg-white/2.5',
      ].join(' ')}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, a, [data-editable]')) return
        toggleRow(node.id)
      }}
    >
      <td className="px-3 py-2">
        <Button
          onClick={() => toggleRow(node.id)}
          type="button"
          className={[
            'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
            isSelected
              ? 'border-green bg-green/18 text-green'
              : 'border-white/14 text-transparent hover:border-white/28',
          ].join(' ')}
        >
          <Check size={9} />
        </Button>
      </td>
      <td className={`${TD} min-w-0`}>
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
          <span className="flex items-center">
            <span
              className="block cursor-text px-0.5 leading-snug hover:text-white"
              onClick={(e) => { e.stopPropagation(); setEditingCell({ nodeId: node.id, field: 'title' }); setEditingValue(node.title) }}
            >
              {node.title}
            </span>
            {node.todo && (
              <Tooltip content={node.todo}>
                <ClipboardList size={11} className="ml-1.5 shrink-0 text-amber/50" />
              </Tooltip>
            )}
            {workSiblings && workSiblings.length > 0 && (
              <WorkSiblingsBadge siblings={workSiblings} authorsMap={authorsMap} />
            )}
          </span>
        )}
      </td>
      <td className={TD}>
        {editingAuthorsNodeId === node.id ? (
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
          <div
            className="flex min-h-[1.5em] cursor-pointer flex-wrap items-center gap-1 rounded px-0.5 py-0.5 hover:bg-white/4"
            onClick={(e) => { e.stopPropagation(); setEditingAuthorsNodeId(node.id) }}
          >
            {(node.authorIds ?? []).map((aid) => {
              const a = authorsMap.get(aid)
              return a ? (
                <Badge
                  key={aid}
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFocusAuthorInAuthorsTab?.(aid)
                  }}
                  title="Aller à l'auteur·ice dans la table"
                  className="cursor-pointer hover:text-white"
                >
                  {bookAuthorDisplay({ authorIds: [aid] }, authorsMap)}
                </Badge>
              ) : null
            })}
          </div>
        ) : (
          <span
            className="block min-h-[1.2em] w-full cursor-text px-0.5 text-white/42 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setEditingAuthorsNodeId(node.id) }}
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
            onClick={(e) => { e.stopPropagation(); setEditingCell({ nodeId: node.id, field: 'year' }); setEditingValue(String(node.year || '')) }}>
            {node.year || <span className="text-white/18">—</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {(() => {
          const { axes: bookAxes, themes: bookThemes } = splitBookAxes(node.axes)
          return (
            <AxisDots
              axes={bookAxes}
              themes={bookThemes}
              onChange={(newAxes) => {
                const combined = [...newAxes, ...bookThemes.map((t) => `UNCATEGORIZED:${t}`)]
                onUpdateBook?.({ ...node, axes: combined })
                onLastEdited?.(node.id)
              }}
              onRemoveTheme={(theme) => {
                const remaining = bookThemes.filter((t) => t !== theme)
                const combined = [...bookAxes, ...remaining.map((t) => `UNCATEGORIZED:${t}`)]
                onUpdateBook?.({ ...node, axes: combined })
                onLastEdited?.(node.id)
              }}
            />
          )
        })()}
      </td>
      <td className="px-3 py-2">
        <Button
          type="button"
          onClick={() => {
            onOpenLinksForBook?.(node)
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[0.8rem] text-white/45 transition-all hover:border-cyan/35 hover:bg-cyan/[0.07] hover:text-cyan/80"
        >
          {linkCount}
          <Link2 size={10} className="shrink-0" />
        </Button>
      </td>
      <td className="px-3 py-2">
        <span className="font-mono text-[0.78rem] tabular-nums text-white/30">
          {node.created_at
            ? new Date(node.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—'}
        </span>
      </td>
      <td className="px-2 py-2">
        {onOpenWorkDetail ? (
          <Button
            type="button"
            title="Ouvrir la grande fiche ouvrage"
            onClick={() => onOpenWorkDetail(node.id)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-caption font-semibold text-white/45 transition-all hover:border-violet/40 hover:bg-violet/10 hover:text-violet/95"
          >
            <Eye size={12} className="shrink-0" />
            Graphe
          </Button>
        ) : (
          <Link
            to={{ pathname: '/', search: mapBookUrlSearch(node.id) }}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir la carte sur cet ouvrage (nouvel onglet, ?book=…)"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-caption font-semibold text-white/45 transition-all hover:border-violet/40 hover:bg-violet/10 hover:text-violet/95"
          >
            <Eye size={12} className="shrink-0" />
            Graphe
          </Link>
        )}
      </td>
    </tr>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Author, AuthorId, Book, BookId, Link } from '@/domain/types'
import type { AuthorNode } from '@/lib/authorUtils'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import { BookForm, type BookFormValues, type BookRecentDraft } from './BookForm'
import { bookDefaultValues } from './addBookFormDefaults'
import { useAddBookFormActions } from './useAddBookFormActions'
import { LinkForm } from './LinkForm'

/** Référence stable pour éviter un nouveau `[]` à chaque rendu (exhaustive-deps / useMemo). */
const EMPTY_AUTHOR_IDS: string[] = []

type BookPrefill = { authorIds?: AuthorId[] }

type AddBookFormProps = {
  nodes: Book[]
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  onAddAuthor?: (author: Author) => void
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
  onUpdateBook?: (book: Book) => void
  onDeleteBook?: (nodeId: BookId) => void
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => void
  mode: 'book' | 'edit' | 'link'
  editNode?: Book | null
  prefilledSourceId?: string | null
  prefilledTargetId?: string | null
  prefilledAuthor?: BookPrefill | null
  onRequestAddBook?: () => void
  onRequestBack?: () => void
}

export function AddBookForm({
  nodes,
  authors,
  onAddAuthor,
  onAddBook,
  onAddLink,
  onUpdateBook,
  onDeleteBook,
  onMergeBooks,
  mode,
  editNode,
  prefilledSourceId = null,
  prefilledTargetId = null,
  prefilledAuthor = null,
  onRequestAddBook,
  onRequestBack,
  authorsMap,
}: AddBookFormProps) {
  const bookPrefill = mode === 'book' && prefilledAuthor ? prefilledAuthor : null

  const bookForm = useForm<BookFormValues>({
    defaultValues: bookDefaultValues(mode, editNode, bookPrefill),
  })

  const linkForm = useForm({
    defaultValues: {
      citationText: '',
      edition: '',
      page: '',
      context: '',
    },
  })

  useEffect(() => {
    if (mode !== 'book' && mode !== 'edit') return
    bookForm.reset(bookDefaultValues(mode, editNode, bookPrefill))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `bookForm` omitted: listing it retriggers reset loops; we only sync when mode, edit target, or prefill signature changes.
  }, [mode, editNode?.id, bookPrefill?.authorIds?.join(','), bookForm])

  useEffect(() => {
    if (mode === 'link') {
      linkForm.reset({ citationText: '', edition: '', page: '', context: '' })
    }
  }, [mode, linkForm])

  const titleWatch = useWatch({ control: bookForm.control, name: 'title' }) ?? ''
  const authorIdsRaw = useWatch({ control: bookForm.control, name: 'authorIds' })
  const authorIdsWatch = authorIdsRaw ?? EMPTY_AUTHOR_IDS

  const [recentQueue, setRecentQueue] = useState<BookRecentDraft[]>([])

  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const [sourceId, setSourceId] = useState(mode === 'link' && prefilledSourceId ? prefilledSourceId : '')
  const [targetIds, setTargetIds] = useState(
    mode === 'link' && prefilledTargetId ? [prefilledTargetId] : []
  )

  const selectedSource = useMemo(() => nodes.find((n) => n.id === sourceId) || null, [nodes, sourceId])
  const selectedTargets = useMemo((): Book[] => {
    const list: Book[] = []
    for (const id of targetIds) {
      const n = nodes.find((b) => b.id === id)
      if (n) list.push(n)
    }
    return list
  }, [nodes, targetIds])

  const sourceResults = useMemo(() => {
    const q = sourceSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter((n) => n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q))
  }, [sourceSearch, nodes, authorsMap])

  const targetResults = useMemo(() => {
    const q = targetSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter(
      (n) =>
        !targetIds.includes(n.id) &&
        (n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q))
    )
  }, [targetSearch, nodes, targetIds, authorsMap])

  const possibleDuplicates = useMemo(() => {
    if (mode === 'edit') return []
    const t = (titleWatch || '').toLowerCase().trim()
    const selectedIds = new Set(authorIdsWatch)
    if (!t) return []

    return nodes.filter((n) => {
      const nt = (n.title || '').toLowerCase()
      const nIds = new Set(n.authorIds || [])
      const overlap = [...selectedIds].some((id) => nIds.has(id))
      if (nt === t) return true
      if (t.length >= 4 && (nt.includes(t) || t.includes(nt))) return true
      if (overlap && t.length >= 3 && (nt.includes(t.slice(0, Math.min(t.length, 12))) || t.includes(nt.slice(0, Math.min(nt.length, 12))))) return true
      return false
    })
  }, [titleWatch, authorIdsWatch, nodes, mode])

  const { submitAddBook, submitEditBook, submitAddLink, toggleAxis } = useAddBookFormActions({
    bookForm,
    linkForm,
    editNode,
    onAddBook,
    onUpdateBook,
    onAddLink,
    sourceId,
    targetIds,
    setTargetIds,
    setTargetSearch,
    setRecentQueue,
  })

  const inputClass =
    'w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-[0.85rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-[rgba(140,220,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.06)]'

  return (
    <div className="flex flex-col gap-5">
      {(mode === 'book' || mode === 'edit') && (
        <BookForm
          mode={mode}
          inputClass={inputClass}
          onSubmit={bookForm.handleSubmit(mode === 'edit' ? submitEditBook : submitAddBook)}
          bookForm={bookForm}
          toggleAxis={toggleAxis}
          possibleDuplicates={possibleDuplicates}
          editNode={editNode}
          nodes={nodes}
          onDeleteBook={onDeleteBook}
          onMergeBooks={onMergeBooks}
          recentQueue={recentQueue}
          authorsMap={authorsMap}
          authors={authors}
          onAddAuthor={onAddAuthor}
        />
      )}

      {mode === 'link' && (
        <LinkForm
          onSubmit={linkForm.handleSubmit(submitAddLink)}
          onRequestBack={onRequestBack}
          linkForm={linkForm}
          sourceId={sourceId}
          setSourceId={setSourceId}
          targetIds={targetIds}
          setTargetIds={setTargetIds}
          selectedSource={selectedSource}
          selectedTargets={selectedTargets}
          sourceSearch={sourceSearch}
          setSourceSearch={setSourceSearch}
          targetSearch={targetSearch}
          setTargetSearch={setTargetSearch}
          sourceResults={sourceResults}
          targetResults={targetResults}
          onRequestAddBook={onRequestAddBook}
          inputClass={inputClass}
          authorsMap={authorsMap}
        />
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { bookAuthorDisplay } from '../../authorUtils'
import BookForm from './BookForm'
import LinkForm from './LinkForm'

function bookDefaultValues(mode, editNode, bookPrefill) {
  if (mode === 'edit' && editNode) {
    return {
      title: editNode.title || '',
      authorIds: Array.isArray(editNode.authorIds) ? [...editNode.authorIds] : [],
      year: String(editNode.year || ''),
      axes: Array.isArray(editNode.axes) ? editNode.axes : [],
      description: editNode.description || '',
      stickyAuthor: false,
    }
  }
  return {
    title: '',
    authorIds: bookPrefill?.authorIds ? [...bookPrefill.authorIds] : [],
    year: '',
    axes: [],
    description: '',
    stickyAuthor: false,
  }
}

export default function AddBookForm({
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
  prefilledSourceId,
  prefilledTargetId,
  prefilledAuthor,
  onRequestAddBook,
  onRequestBack,
  authorsMap,
}) {
  const bookPrefill = mode === 'book' && prefilledAuthor ? prefilledAuthor : null

  const bookForm = useForm({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voir ci-dessus
  }, [mode, editNode?.id, bookPrefill?.authorIds?.join(','), bookForm])

  useEffect(() => {
    if (mode === 'link') {
      linkForm.reset({ citationText: '', edition: '', page: '', context: '' })
    }
  }, [mode, linkForm])

  const titleWatch = useWatch({ control: bookForm.control, name: 'title' }) ?? ''
  const authorIdsWatch = useWatch({ control: bookForm.control, name: 'authorIds' }) ?? []

  const [recentQueue, setRecentQueue] = useState([])

  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const [sourceId, setSourceId] = useState(mode === 'link' && prefilledSourceId ? prefilledSourceId : '')
  const [targetIds, setTargetIds] = useState(
    mode === 'link' && prefilledTargetId ? [prefilledTargetId] : []
  )

  const selectedSource = useMemo(() => nodes.find((n) => n.id === sourceId) || null, [nodes, sourceId])
  const selectedTargets = useMemo(
    () => targetIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean),
    [nodes, targetIds]
  )

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

  const submitAddBook = (data) => {
    if (!data.title.trim() || !data.authorIds?.length) return
    const book = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      authorIds: data.authorIds,
      year: parseInt(data.year, 10) || new Date().getFullYear(),
      axes: data.axes || [],
      description: (data.description || '').trim(),
    }
    onAddBook(book)
    setRecentQueue((prev) =>
      [{ title: book.title, authorIds: book.authorIds, year: book.year }, ...prev].slice(0, 3)
    )
    bookForm.reset({
      title: '',
      authorIds: data.stickyAuthor ? [...data.authorIds] : [],
      year: '',
      axes: [],
      description: '',
      stickyAuthor: data.stickyAuthor,
    })
  }

  const submitEditBook = (data) => {
    if (!data.title.trim() || !data.authorIds?.length) return
    onUpdateBook({
      ...editNode,
      title: data.title.trim(),
      authorIds: data.authorIds,
      year: parseInt(data.year, 10) || new Date().getFullYear(),
      axes: data.axes || [],
      description: (data.description || '').trim(),
    })
  }

  const submitAddLink = (data) => {
    if (!sourceId || targetIds.length === 0) return
    const validTargets = targetIds.filter((tid) => tid !== sourceId)
    if (validTargets.length === 0) return
    validTargets.forEach((tid) => {
      onAddLink({
        source: sourceId,
        target: tid,
        citation_text: (data.citationText || '').trim(),
        edition: (data.edition || '').trim(),
        page: (data.page || '').trim(),
        context: (data.context || '').trim(),
      })
    })
    setTargetIds([])
    setTargetSearch('')
    linkForm.reset({ citationText: '', edition: '', page: '', context: '' })
  }

  const toggleAxis = (axis) => {
    const cur = bookForm.getValues('axes') || []
    bookForm.setValue(
      'axes',
      cur.includes(axis) ? cur.filter((a) => a !== axis) : [...cur, axis],
      { shouldDirty: true }
    )
  }

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

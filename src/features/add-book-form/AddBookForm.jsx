import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { authorName } from '../../authorUtils'
import BookForm from './BookForm'
import LinkForm from './LinkForm'

function bookDefaultValues(mode, editNode, bookPrefill) {
  if (mode === 'edit' && editNode) {
    return {
      title: editNode.title || '',
      firstName: editNode.firstName || '',
      lastName: editNode.lastName || '',
      year: String(editNode.year || ''),
      axes: Array.isArray(editNode.axes) ? editNode.axes : [],
      description: editNode.description || '',
      stickyAuthor: false,
    }
  }
  return {
    title: '',
    firstName: bookPrefill?.firstName ?? '',
    lastName: bookPrefill?.lastName ?? '',
    year: '',
    axes: [],
    description: '',
    stickyAuthor: false,
  }
}

export default function AddBookForm({
  nodes,
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
    // editNode / bookPrefill : on synchronise au changement d’id ou de préremplissage, pas à chaque nouvelle référence objet
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voir ci-dessus
  }, [mode, editNode?.id, bookPrefill?.firstName, bookPrefill?.lastName, bookForm])

  useEffect(() => {
    if (mode === 'link') {
      linkForm.reset({ citationText: '', edition: '', page: '', context: '' })
    }
  }, [mode, linkForm])

  const title = useWatch({ control: bookForm.control, name: 'title' }) ?? ''
  const lastNameWatch = useWatch({ control: bookForm.control, name: 'lastName' }) ?? ''

  // Bulk insert
  const [recentQueue, setRecentQueue] = useState([]) // [{title, firstName, lastName, year}]

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
    return nodes.filter((n) => n.title.toLowerCase().includes(q) || authorName(n).toLowerCase().includes(q))
  }, [sourceSearch, nodes])

  const targetResults = useMemo(() => {
    const q = targetSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter(
      (n) =>
        !targetIds.includes(n.id) &&
        (n.title.toLowerCase().includes(q) || authorName(n).toLowerCase().includes(q))
    )
  }, [targetSearch, nodes, targetIds])

  const possibleDuplicates = useMemo(() => {
    if (mode === 'edit') return []
    const t = (title || '').toLowerCase().trim()
    const ln = (lastNameWatch || '').toLowerCase().trim()
    if (!t && !ln) return []

    return nodes.filter((n) => {
      const nt = n.title.toLowerCase()
      const nln = (n.lastName || '').toLowerCase()
      if (t && nt === t) return true
      if (t.length >= 4 && (nt.includes(t) || t.includes(nt))) return true
      if (ln.length >= 3 && nln.includes(ln) && t.length >= 3 && nt.includes(t)) return true
      if (!t && ln.length >= 3 && nln.includes(ln)) return true
      return false
    })
  }, [title, lastNameWatch, nodes, mode])

  const submitAddBook = (data) => {
    if (!data.title.trim() || !data.lastName.trim()) return
    const book = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      year: parseInt(data.year, 10) || new Date().getFullYear(),
      axes: data.axes || [],
      description: (data.description || '').trim(),
    }
    onAddBook(book)
    setRecentQueue((prev) =>
      [{ title: book.title, firstName: book.firstName, lastName: book.lastName, year: book.year }, ...prev].slice(0, 3)
    )
    bookForm.reset({
      title: '',
      firstName: data.stickyAuthor ? data.firstName : '',
      lastName: data.stickyAuthor ? data.lastName : '',
      year: '',
      axes: [],
      description: '',
      stickyAuthor: data.stickyAuthor,
    })
  }

  const submitEditBook = (data) => {
    if (!data.title.trim() || !data.lastName.trim()) return
    onUpdateBook({
      ...editNode,
      title: data.title.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
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
        />
      )}
    </div>
  )
}

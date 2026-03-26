import { useMemo, useState } from 'react'
import BookForm from './BookForm'
import LinkForm from './LinkForm'

export default function AddBookForm({
  nodes,
  onAddBook,
  onAddLink,
  onUpdateBook,
  mode,
  editNode,
  prefilledSourceId,
  prefilledTargetId,
  onRequestAddBook,
  onRequestBack,
}) {
  const [title, setTitle] = useState(mode === 'edit' && editNode ? editNode.title || '' : '')
  const [author, setAuthor] = useState(mode === 'edit' && editNode ? editNode.author || '' : '')
  const [year, setYear] = useState(mode === 'edit' && editNode ? String(editNode.year || '') : '')
  const [selectedAxes, setSelectedAxes] = useState(mode === 'edit' && editNode ? editNode.axes || [] : [])
  const [description, setDescription] = useState(mode === 'edit' && editNode ? editNode.description || '' : '')

  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const [sourceId, setSourceId] = useState(mode === 'link' && prefilledSourceId ? prefilledSourceId : '')
  const [targetId, setTargetId] = useState(mode === 'link' && prefilledTargetId ? prefilledTargetId : '')
  const [citationText, setCitationText] = useState('')
  const [page, setPage] = useState('')
  const [context, setContext] = useState('')

  const selectedSource = useMemo(() => nodes.find((n) => n.id === sourceId) || null, [nodes, sourceId])
  const selectedTarget = useMemo(() => nodes.find((n) => n.id === targetId) || null, [nodes, targetId])

  const sourceResults = useMemo(() => {
    const q = sourceSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter((n) => n.title.toLowerCase().includes(q) || n.author.toLowerCase().includes(q))
  }, [sourceSearch, nodes])

  const targetResults = useMemo(() => {
    const q = targetSearch.toLowerCase().trim()
    if (!q) return []
    return nodes.filter((n) => n.title.toLowerCase().includes(q) || n.author.toLowerCase().includes(q))
  }, [targetSearch, nodes])

  const possibleDuplicates = useMemo(() => {
    if (mode === 'edit') return []
    const t = title.toLowerCase().trim()
    const a = author.toLowerCase().trim()
    if (!t && !a) return []

    return nodes.filter((n) => {
      const nt = n.title.toLowerCase()
      const na = n.author.toLowerCase()
      if (t && nt === t) return true
      if (t.length >= 4 && (nt.includes(t) || t.includes(nt))) return true
      if (a.length >= 3 && na.includes(a) && t.length >= 3 && nt.includes(t)) return true
      if (!t && a.length >= 3 && na.includes(a)) return true
      return false
    })
  }, [title, author, nodes, mode])

  const toggleAxis = (axis) => {
    setSelectedAxes((prev) => (prev.includes(axis) ? prev.filter((a) => a !== axis) : [...prev, axis]))
  }

  const handleAddBook = (e) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    onAddBook({
      id: crypto.randomUUID(),
      title: title.trim(),
      author: author.trim(),
      year: parseInt(year) || new Date().getFullYear(),
      axes: selectedAxes,
      description: description.trim(),
    })
    setTitle('')
    setAuthor('')
    setYear('')
    setSelectedAxes([])
    setDescription('')
  }

  const handleEditBook = (e) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    onUpdateBook({
      ...editNode,
      title: title.trim(),
      author: author.trim(),
      year: parseInt(year) || new Date().getFullYear(),
      axes: selectedAxes,
      description: description.trim(),
    })
  }

  const handleAddLink = (e) => {
    e.preventDefault()
    if (!sourceId || !targetId || sourceId === targetId) return
    onAddLink({
      source: sourceId,
      target: targetId,
      citation_text: citationText.trim(),
      page: page.trim(),
      context: context.trim(),
    })
    setCitationText('')
    setPage('')
    setContext('')
  }

  const inputClass =
    'w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-[0.85rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-[rgba(140,220,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.06)]'

  return (
    <div className="flex flex-col gap-5">
      {(mode === 'book' || mode === 'edit') && (
        <BookForm
          mode={mode}
          inputClass={inputClass}
          onSubmit={mode === 'edit' ? handleEditBook : handleAddBook}
          title={title}
          setTitle={setTitle}
          author={author}
          setAuthor={setAuthor}
          year={year}
          setYear={setYear}
          selectedAxes={selectedAxes}
          toggleAxis={toggleAxis}
          description={description}
          setDescription={setDescription}
          possibleDuplicates={possibleDuplicates}
        />
      )}

      {mode === 'link' && (
        <LinkForm
          onSubmit={handleAddLink}
          onRequestBack={onRequestBack}
          sourceId={sourceId}
          setSourceId={setSourceId}
          targetId={targetId}
          setTargetId={setTargetId}
          selectedSource={selectedSource}
          selectedTarget={selectedTarget}
          sourceSearch={sourceSearch}
          setSourceSearch={setSourceSearch}
          targetSearch={targetSearch}
          setTargetSearch={setTargetSearch}
          sourceResults={sourceResults}
          targetResults={targetResults}
          onRequestAddBook={onRequestAddBook}
          inputClass={inputClass}
          citationText={citationText}
          setCitationText={setCitationText}
          page={page}
          setPage={setPage}
          context={context}
          setContext={setContext}
        />
      )}
    </div>
  )
}

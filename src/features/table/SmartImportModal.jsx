import { useState } from 'react'
import { ChevronLeft, X, Zap } from 'lucide-react'
import { parseSmartInput } from './parseSmartInput'
import SmartImportInputPhase from './SmartImportInputPhase'
import SmartImportPreviewPhase from './SmartImportPreviewPhase'

/** Normalise une chaîne pour la comparaison auteur */
function normStr(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

/**
 * Pour chaque auteur dans la liste, cherche un auteur existant (match prénom+nom normalisé).
 * Si absent, crée un nouveau nœud auteur via onAddAuthor et retourne son id.
 * Retourne un tableau d'ids auteurs résolus.
 */
function resolveOrCreateAuthors(authorList, existingAuthors, onAddAuthor) {
  if (!authorList?.length) return []
  const resolved = []
  authorList.forEach(({ firstName, lastName }) => {
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    if (!fn && !ln) return
    const existing = existingAuthors.find(
      (a) => normStr(a.firstName) === normStr(fn) && normStr(a.lastName) === normStr(ln)
    )
    if (existing) {
      resolved.push(existing.id)
    } else {
      const newId = crypto.randomUUID()
      onAddAuthor({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      // Ajouter à existingAuthors localement pour éviter les doublons dans le même batch
      existingAuthors.push({ id: newId, firstName: fn, lastName: ln, axes: [] })
      resolved.push(newId)
    }
  })
  return resolved
}

export default function SmartImportModal({
  open,
  onClose,
  existingNodes,
  existingAuthors = [],
  authorsMap,
  onAddBook,
  onAddAuthor,
  onAddLink,
  onUpdateBook,
  onQueued,
  onImportComplete,
}) {
  const [phase, setPhase] = useState('input')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState([])
  const [checked, setChecked] = useState(new Set())
  const [injected, setInjected] = useState(false)
  const [masterNode, setMasterNode] = useState(null)
  const [masterContext, setMasterContext] = useState('')
  const [editingCell, setEditingCell] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingAuthor, setEditingAuthor] = useState(null)
  const [mergedIds, setMergedIds] = useState(new Set())

  if (!open) return null

  const resetAll = () => {
    setPhase('input')
    setRawText('')
    setParsed([])
    setChecked(new Set())
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setInjected(false)
  }

  const handleAnalyze = () => {
    const results = parseSmartInput(rawText, existingNodes)
    setParsed(results)
    setChecked(new Set(results.filter((r) => !r.isDuplicate).map((r) => r.id)))
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setPhase('preview')
    setInjected(false)
  }

  const handleMerge = (item) => {
    if (!item.existingNode || !onUpdateBook) return
    const existing = item.existingNode
    const updates = { ...existing }
    if (!existing.firstName && item.firstName) updates.firstName = item.firstName
    if (!existing.lastName && item.lastName) updates.lastName = item.lastName
    if ((!existing.year || existing.year === new Date().getFullYear()) && item.year && !item.yearMissing) {
      updates.year = item.year
    }
    onUpdateBook(updates)
    if (masterNode) {
      onAddLink?.({ source: masterNode.id, target: existing.id, citation_text: masterContext.trim(), edition: '', page: '', context: '' })
    }
    setMergedIds((prev) => new Set([...prev, item.id]))
    setChecked((prev) => { const next = new Set(prev); next.delete(item.id); return next })
  }

  const toggleItem = (id) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const commitCellEdit = () => {
    if (!editingCell) return
    const { id, field } = editingCell
    let val = editingValue.trim()
    if (field === 'year') {
      const p = parseInt(val)
      val = isNaN(p) ? val : p
    }
    setParsed((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: val }
        if (field === 'year') updated.yearMissing = false
        return updated
      })
    )
    setEditingCell(null)
  }

  const commitAuthorEdit = () => {
    if (!editingAuthor) return
    const { id, authorIndex, firstName, lastName } = editingAuthor
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    setParsed((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (authorIndex != null && item.authors?.length > authorIndex) {
          let updatedAuthors
          if (!fn && !ln) {
            // Retirer l'auteur vide (sauf s'il n'en reste qu'un)
            updatedAuthors = item.authors.filter((_, i) => i !== authorIndex)
            if (updatedAuthors.length === 0) updatedAuthors = [{ firstName: '', lastName: '' }]
          } else {
            updatedAuthors = item.authors.map((a, i) =>
              i === authorIndex ? { firstName: fn, lastName: ln } : a
            )
          }
          const first = updatedAuthors[0] || {}
          return { ...item, authors: updatedAuthors, firstName: first.firstName || '', lastName: first.lastName || '' }
        }
        return { ...item, firstName: fn, lastName: ln }
      })
    )
    setEditingAuthor(null)
  }

  const handleUpdateAxes = (itemId, newAxes) => {
    setParsed((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, axes: newAxes } : item))
    )
  }

  const handleAddCoAuthor = (itemId) => {
    const item = parsed.find((i) => i.id === itemId)
    if (!item) return
    const currentAuthors = item.authors?.length > 0
      ? item.authors
      : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
    const newIndex = currentAuthors.length
    setParsed((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        return { ...it, authors: [...currentAuthors, { firstName: '', lastName: '' }] }
      })
    )
    setEditingAuthor({ id: itemId, authorIndex: newIndex, firstName: '', lastName: '' })
  }

  const handleInject = () => {
    const toAdd = parsed.filter((r) => checked.has(r.id))
    const newIds = []
    // Copie locale pour résoudre les doublons dans le même batch d'import
    const localAuthors = [...existingAuthors]
    toAdd.forEach((r) => {
      // Résoudre ou créer les auteurs de ce livre
      const authorIds = onAddAuthor
        ? resolveOrCreateAuthors(r.authors || [], localAuthors, onAddAuthor)
        : []
      onAddBook({
        id: r.id,
        title: r.title,
        firstName: r.firstName,   // legacy fallback
        lastName: r.lastName,     // legacy fallback
        authorIds,
        year: r.year,
        axes: r.axes,
        description: '',
      })
      newIds.push(r.id)
      if (masterNode) {
        onAddLink?.({ source: masterNode.id, target: r.id, citation_text: masterContext.trim(), edition: '', page: '', context: '' })
      }
    })
    onQueued?.(toAdd.map((r) => r.title))
    onImportComplete?.(newIds)
    setInjected(true)
    setTimeout(() => { resetAll(); onClose() }, 1100)
  }

  const handleClose = () => { resetAll(); onClose() }
  const goBack = () => { setPhase('input'); setEditingCell(null); setEditingAuthor(null) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (phase === 'input' && rawText.trim()) handleAnalyze()
    else if (phase === 'preview' && checked.size > 0 && !injected) handleInject()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <form
        onSubmit={handleSubmit}
        className={[
          'w-full rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] transition-all duration-200',
          phase === 'preview' ? 'max-w-5xl' : 'max-w-4xl',
        ].join(' ')}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {phase === 'preview' && (
              <button
                type="button"
                onClick={goBack}
                className="mr-0.5 cursor-pointer rounded-lg p-1 text-white/30 transition-colors hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <Zap size={14} className="text-[rgba(140,220,255,0.7)]" />
            <h3 className="font-semibold text-white">Import Magique</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-lg p-1 text-white/30 transition-colors hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {phase === 'input' && (
          <SmartImportInputPhase
            rawText={rawText}
            setRawText={setRawText}
            masterNode={masterNode}
            setMasterNode={setMasterNode}
            masterContext={masterContext}
            setMasterContext={setMasterContext}
            existingNodes={existingNodes}
            authorsMap={authorsMap}
          />
        )}

        {phase === 'preview' && (
          <SmartImportPreviewPhase
            parsed={parsed}
            checked={checked}
            mergedIds={mergedIds}
            editingCell={editingCell}
            editingValue={editingValue}
            setEditingValue={setEditingValue}
            editingAuthor={editingAuthor}
            setEditingAuthor={setEditingAuthor}
            toggleItem={toggleItem}
            commitCellEdit={commitCellEdit}
            setEditingCell={setEditingCell}
            commitAuthorEdit={commitAuthorEdit}
            handleMerge={handleMerge}
            onAddCoAuthor={handleAddCoAuthor}
            onUpdateAxes={handleUpdateAxes}
            masterNode={masterNode}
            selectedCount={checked.size}
            injected={injected}
            handleClose={handleClose}
          />
        )}
      </form>
    </div>
  )
}

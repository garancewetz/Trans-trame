import { useState, type FormEvent } from 'react'
import type { Book } from '@/domain/types'
import { parseSmartInput, type ParsedBook } from './parseSmartInput'
import { runSmartImportBatchInsert } from './smartImportModal.batchInsert'
import type { SmartImportModalProps } from './smartImportModal.types'

export function useSmartImportModalLogic({
  onClose,
  existingNodes,
  existingAuthors = [],
  onAddBook,
  onAddAuthor,
  onAddLink,
  onUpdateBook,
  onQueued,
  onImportComplete,
}: SmartImportModalProps) {
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedBook[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [injected, setInjected] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [masterNode, setMasterNode] = useState<Book | null>(null)
  const [masterContext, setMasterContext] = useState('')
  const [linkDirection, setLinkDirection] = useState('master-cites-imported')
  const [editingCell, setEditingCell] = useState<null | { id: string; field: string }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingAuthor, setEditingAuthor] = useState<
    null | { id: string; authorIndex: number | null; firstName: string; lastName: string }
  >(null)
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())

  const resetAll = () => {
    setPhase('input')
    setRawText('')
    setParsed([])
    setChecked(new Set())
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setInjected(false)
    setInserting(false)
    setLinkDirection('master-cites-imported')
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

  const handleMerge = (item: ParsedBook) => {
    if (!item.existingNode || !onUpdateBook) return
    const existing = item.existingNode
    if (!existing.id) return
    const baseBook = existingNodes.find((n) => n.id === existing.id)
    if (!baseBook) return
    const merged: Book = { ...baseBook }
    if (!existing.firstName && item.firstName) merged.firstName = item.firstName
    if (!existing.lastName && item.lastName) merged.lastName = item.lastName
    const existingYear = existing.year
    if (
      (existingYear === undefined || existingYear === null || existingYear === new Date().getFullYear()) &&
      item.year &&
      !item.yearMissing
    ) {
      merged.year = item.year
    }
    onUpdateBook(merged)
    if (masterNode) {
      const exId = existing.id
      const source = linkDirection === 'imported-cites-master' ? exId : masterNode.id
      const target = linkDirection === 'imported-cites-master' ? masterNode.id : exId
      onAddLink?.({
        source,
        target,
        citation_text: masterContext.trim(),
        edition: item.edition || '',
        page: '',
        context: '',
      })
    }
    setMergedIds((prev) => new Set([...prev, item.id]))
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  const toggleItem = (id: string) =>
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
      const p = parseInt(val, 10)
      val = Number.isNaN(p) ? val : String(p)
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
            updatedAuthors = item.authors.filter((_, authorIdx) => authorIdx !== authorIndex)
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

  const handleUpdateAxes = (itemId: string, newAxes: ParsedBook['axes']) => {
    setParsed((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, axes: newAxes } : item))
    )
  }

  const handleAddCoAuthor = (itemId: string) => {
    const item = parsed.find((row) => row.id === itemId)
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

  const handleInject = async () => {
    setInserting(true)
    await runSmartImportBatchInsert({
      parsed,
      checked,
      existingAuthors,
      onAddAuthor,
      onAddBook,
      onAddLink,
      masterNode,
      linkDirection,
      masterContext,
      onQueued,
      onImportComplete,
    })
    setInjected(true)
    setTimeout(() => {
      resetAll()
      onClose()
    }, 1100)
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const goBack = () => {
    setPhase('input')
    setEditingCell(null)
    setEditingAuthor(null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'input' && rawText.trim()) handleAnalyze()
    else if (phase === 'preview' && checked.size > 0 && !injected && !inserting) void handleInject()
  }

  return {
    phase,
    rawText,
    setRawText,
    parsed,
    checked,
    injected,
    inserting,
    masterNode,
    setMasterNode,
    masterContext,
    setMasterContext,
    linkDirection,
    setLinkDirection,
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    editingAuthor,
    setEditingAuthor,
    mergedIds,
    handleClose,
    goBack,
    handleSubmit,
    toggleItem,
    commitCellEdit,
    commitAuthorEdit,
    handleMerge,
    handleAddCoAuthor,
    handleUpdateAxes,
  }
}

import { useState } from 'react'
import type { ParsedAuthor, ParsedBook } from '../parseSmartInput.types'

export function useSmartImportEditing(
  setParsed: React.Dispatch<React.SetStateAction<ParsedBook[]>>,
) {
  const [editingCell, setEditingCell] = useState<null | { id: string; field: string }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingAuthor, setEditingAuthor] = useState<
    null | { id: string; authorIndex: number | null; firstName: string; lastName: string }
  >(null)

  const commitCellEdit = (override?: string) => {
    if (!editingCell) return
    const { id, field } = editingCell
    let val = (override ?? editingValue).trim()
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
        const baseAuthors = item.authors?.length > 0
          ? item.authors
          : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
        const idx = authorIndex ?? 0
        let updatedAuthors: ParsedAuthor[]
        if (!fn && !ln) {
          updatedAuthors = baseAuthors.filter((_, i) => i !== idx)
          if (updatedAuthors.length === 0) updatedAuthors = [{ firstName: '', lastName: '' }]
        } else if (idx >= baseAuthors.length) {
          updatedAuthors = [...baseAuthors, { firstName: fn, lastName: ln }]
        } else {
          updatedAuthors = baseAuthors.map((a, i) =>
            i === idx ? { firstName: fn, lastName: ln } : a
          )
        }
        const first = updatedAuthors[0] || { firstName: '', lastName: '' }
        return {
          ...item,
          authors: updatedAuthors,
          firstName: first.firstName || '',
          lastName: first.lastName || '',
        }
      })
    )
    setEditingAuthor(null)
  }

  const handleAddCoAuthor = (itemId: string, parsed: ParsedBook[]) => {
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

  const handleUpdateAxes = (itemId: string, newAxes: ParsedBook['axes']) => {
    setParsed((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, axes: newAxes } : item))
    )
  }

  const handleRemoveTheme = (itemId: string, theme: string) => {
    setParsed((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, suggestedThemes: (item.suggestedThemes || []).filter((t) => t !== theme) }
          : item
      )
    )
  }

  const handleUpdateField = (itemId: string, field: string, value: string) => {
    setParsed((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    )
  }

  const handleSwapFields = (itemId: string, swapWith: 'title' | 'edition') => {
    setParsed((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const authors = item.authors?.length > 0
          ? item.authors
          : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
        const authorStr = [authors[0]?.firstName, authors[0]?.lastName].filter(Boolean).join(' ')
        const otherVal = swapWith === 'title' ? item.title : (item.edition || '')

        const parts = otherVal.trim().split(/\s+/)
        let newFirst = '', newLast = ''
        if (parts.length >= 2) {
          newLast = parts.pop()!
          newFirst = parts.join(' ')
        } else {
          newLast = otherVal.trim()
        }

        const newAuthors = [...authors]
        newAuthors[0] = { firstName: newFirst, lastName: newLast }

        return {
          ...item,
          [swapWith]: authorStr,
          authors: newAuthors,
          firstName: newFirst,
          lastName: newLast,
        }
      })
    )
  }

  const resetEditing = () => {
    setEditingCell(null)
    setEditingAuthor(null)
  }

  return {
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    editingAuthor,
    setEditingAuthor,
    commitCellEdit,
    commitAuthorEdit,
    handleAddCoAuthor,
    handleUpdateAxes,
    handleRemoveTheme,
    handleUpdateField,
    handleSwapFields,
    resetEditing,
  }
}

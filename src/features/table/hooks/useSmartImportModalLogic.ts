import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toggleSetItem } from '@/common/utils/setUtils'
import type { Book } from '@/types/domain'
import { parseSmartInput, parseSmartInputHybrid, type ParsedBook } from '../parseSmartInput'
import { runSmartImportBatchInsert } from '../smartImportModal.batchInsert'
import type { SmartImportModalProps } from '../smartImportModal.types'
import { detectAuthorInitialMatches, normStr, type AuthorMergeSuggestion } from '../smartImportModal.utils'
import { useKnownAuthors, useKnownEditions } from './useKnownData'

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
  initialMasterNode,
}: SmartImportModalProps) {
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedBook[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [injected, setInjected] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const fakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [masterNode, setMasterNode] = useState<Book | null>(null)
  const [masterContext, setMasterContext] = useState('')
  const [linkDirection, setLinkDirection] = useState('master-cites-imported')
  const [editingCell, setEditingCell] = useState<null | { id: string; field: string }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingAuthor, setEditingAuthor] = useState<
    null | { id: string; authorIndex: number | null; firstName: string; lastName: string }
  >(null)
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())
  const [preMergeBooks, setPreMergeBooks] = useState<Map<string, Book>>(new Map())
  const { data: knownAuthors = [] } = useKnownAuthors()
  const { data: knownEditions = [] } = useKnownEditions()
  const [dismissedAuthorMerges, setDismissedAuthorMerges] = useState<Set<string>>(new Set())
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (initialMasterNode) {
      setMasterNode(initialMasterNode)
    }
  }, [initialMasterNode])

  const effectiveParsed = useMemo(
    () => parsed.map((item) =>
      dismissedDuplicates.has(item.id)
        ? { ...item, isDuplicate: false, isFuzzyDuplicate: false, existingNode: null }
        : item
    ),
    [parsed, dismissedDuplicates]
  )

  const authorMergeSuggestions = useMemo(
    () => detectAuthorInitialMatches(parsed, existingAuthors || [])
      .filter((s) => !dismissedAuthorMerges.has(s.id)),
    [parsed, existingAuthors, dismissedAuthorMerges]
  )

  const resetAll = () => {
    setPhase('input')
    setRawText('')
    setParsed([])
    setChecked(new Set())
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setPreMergeBooks(new Map())
    setDismissedAuthorMerges(new Set())
    setDismissedDuplicates(new Set())
    setInjected(false)
    setInserting(false)
    setAnalyzing(false)
    setAnalyzeProgress(0)
    if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null }
    setLinkDirection('master-cites-imported')
  }

  const handleAnalyze = async () => {
    const localResults = parseSmartInput(rawText, existingNodes, knownAuthors, knownEditions)
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setInjected(false)
    setAnalyzing(true)
    setAnalyzeProgress(0)

    // Simulated progress that creeps up to ~85% while waiting for the API
    if (fakeTimerRef.current) clearInterval(fakeTimerRef.current)
    fakeTimerRef.current = setInterval(() => {
      setAnalyzeProgress((p) => {
        if (p >= 85) { clearInterval(fakeTimerRef.current!); fakeTimerRef.current = null; return p }
        return p + (85 - p) * 0.08
      })
    }, 400)

    try {
      const enriched = await parseSmartInputHybrid(localResults, existingNodes, (done, total) => {
        // Real chunk progress overrides fake progress
        const real = Math.round((done / total) * 100)
        setAnalyzeProgress((p) => Math.max(p, real))
      })
      if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null }
      setAnalyzeProgress(100)
      if (enriched.some((r) => r.parsedByLLM)) {
        setParsed(enriched)
        setChecked(new Set(enriched.filter((r) => !r.isDuplicate).map((r) => r.id)))
      } else {
        setParsed(localResults)
        setChecked(new Set(localResults.filter((r) => !r.isDuplicate).map((r) => r.id)))
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[SmartImport] LLM enrichment failed, using local results:', err)
      if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null }
      setAnalyzeProgress(100)
      setParsed(localResults)
      setChecked(new Set(localResults.filter((r) => !r.isDuplicate).map((r) => r.id)))
    }

    setAnalyzing(false)
    setPhase('preview')
  }

  const handleMerge = (item: ParsedBook) => {
    if (!item.existingNode || !onUpdateBook) return
    const existing = item.existingNode
    if (!existing.id) return
    const baseBook = existingNodes.find((n) => n.id === existing.id)
    if (!baseBook) return

    // Save original state for undo
    setPreMergeBooks((prev) => new Map([...prev, [item.id, { ...baseBook }]]))

    // Merge book data only (no link creation — that happens during inject)
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
    setMergedIds((prev) => new Set([...prev, item.id]))

    // Auto-check so the link gets created during inject (if masterNode exists)
    if (masterNode) {
      setChecked((prev) => new Set([...prev, item.id]))
    }
  }

  const handleUnmerge = (item: ParsedBook) => {
    const original = preMergeBooks.get(item.id)
    if (original && onUpdateBook) {
      onUpdateBook(original)
    }
    setMergedIds((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
    setPreMergeBooks((prev) => {
      const next = new Map(prev)
      next.delete(item.id)
      return next
    })
    // Uncheck — it's back to being a duplicate
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  const handleAuthorMerge = (suggestion: AuthorMergeSuggestion) => {
    const { initialAuthor, fullAuthor, affectedItemIds } = suggestion
    setParsed((prev) =>
      prev.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item
        const authors = item.authors?.length > 0
          ? item.authors
          : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
        const updatedAuthors = authors.map((a) => {
          if (normStr(a.firstName) === normStr(initialAuthor.firstName) && normStr(a.lastName) === normStr(initialAuthor.lastName)) {
            return { firstName: fullAuthor.firstName, lastName: fullAuthor.lastName }
          }
          return a
        })
        const first = updatedAuthors[0] || {}
        return { ...item, authors: updatedAuthors, firstName: first.firstName || '', lastName: first.lastName || '' }
      })
    )
    setDismissedAuthorMerges((prev) => new Set([...prev, suggestion.id]))
  }

  const dismissAuthorMerge = (suggestionId: string) => {
    setDismissedAuthorMerges((prev) => new Set([...prev, suggestionId]))
  }

  const dismissDuplicate = (itemId: string) => {
    setDismissedDuplicates((prev) => new Set([...prev, itemId]))
    // Auto-check the item since the user treats it as a new entry
    setChecked((prev) => new Set([...prev, itemId]))
  }

  const toggleItem = (id: string) => setChecked((prev) => toggleSetItem(prev, id))

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

        // Parse the other value into firstName/lastName (last word = lastName)
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

  const handleInsertRow = (afterIndex: number) => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const empty: ParsedBook = {
      id,
      authors: [{ firstName: '', lastName: '' }],
      firstName: '',
      lastName: '',
      title: '',
      edition: '',
      page: '',
      year: 0,
      yearMissing: false,
      axes: [],
      citation: '',
      isDuplicate: false,
      isFuzzyDuplicate: false,
      existingNode: null,
      raw: '',
    }
    setParsed((prev) => {
      const next = [...prev]
      next.splice(afterIndex + 1, 0, empty)
      return next
    })
    setChecked((prev) => new Set([...prev, id]))
    // Auto-open title editing on the new row
    setEditingCell({ id, field: 'title' })
    setEditingValue('')
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
      mergedIds,
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

  const handleReparseChecked = async () => {
    const selected = parsed.filter((r) => checked.has(r.id))
    if (selected.length === 0) return
    setAnalyzing(true)
    try {
      const enriched = await parseSmartInputHybrid(selected, existingNodes)
      // Merge enriched items back into the full list
      const enrichedMap = new Map(enriched.map((r) => [r.id, r]))
      setParsed((prev) =>
        prev.map((item) => enrichedMap.get(item.id) ?? item),
      )
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[SmartImport] LLM re-parse failed:', err)
    }
    setAnalyzing(false)
  }

  const goBack = () => {
    setPhase('input')
    setEditingCell(null)
    setEditingAuthor(null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'input' && rawText.trim() && !analyzing) void handleAnalyze()
    else if (phase === 'preview' && checked.size > 0 && !injected && !inserting) void handleInject()
  }

  return {
    phase,
    rawText,
    setRawText,
    parsed: effectiveParsed,
    checked,
    injected,
    inserting,
    analyzing,
    analyzeProgress,
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
    authorMergeSuggestions,
    handleAuthorMerge,
    dismissAuthorMerge,
    handleClose,
    goBack,
    handleSubmit,
    toggleItem,
    commitCellEdit,
    commitAuthorEdit,
    handleMerge,
    handleUnmerge,
    dismissDuplicate,
    handleInsertRow,
    handleAddCoAuthor,
    handleUpdateAxes,
    handleUpdateField,
    handleSwapFields,
    handleReparseChecked,
    knownEditions,
  }
}

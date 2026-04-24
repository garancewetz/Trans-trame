import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { toggleSetItem } from '@/common/utils/setUtils'
import { useFakeProgress } from '@/common/hooks/useFakeProgress'
import { devWarn } from '@/common/utils/logger'
import { formatSupabaseError } from '@/core/supabaseErrors'
import { parseSmartInput, parseSmartInputHybrid, parseSmartInputFromImages, type ParsedBook } from '../parseSmartInput'
import { runSmartImportBatchInsert } from '../smartImportModal.batchInsert'
import type { SmartImportModalProps } from '../smartImportModal.types'
import { useKnownAuthors, useKnownEditions } from './useKnownData'
import { useSmartImportPhase } from './useSmartImportPhase'
import { useSmartImportEditing } from './useSmartImportEditing'
import { useSmartImportMerge } from './useSmartImportMerge'

export function useSmartImportModalLogic({
  onClose,
  existingNodes,
  existingAuthors = [],
  onAddBook,
  onAddAuthor,
  onAddLink,
  onAddLinks,
  onUpdateBook,
  onQueued,
  onImportComplete,
  initialMasterNode,
}: SmartImportModalProps) {
  const phaseState = useSmartImportPhase(initialMasterNode)
  const { phase, setPhase, inputMode, imageFiles, rawText, masterNode, linkDirection, masterContext, resetPhase, goBack: goBackPhase } = phaseState

  const [parsed, setParsed] = useState<ParsedBook[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [injected, setInjected] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const { progress: fakeAnalyzeProgress, reset: resetAnalyzeProgress, complete: completeAnalyzeProgress } = useFakeProgress({ active: analyzing, rate: 0.08, interval: 400 })
  const [realAnalyzeProgress, setRealAnalyzeProgress] = useState<number | null>(null)
  const analyzeProgress = realAnalyzeProgress ?? fakeAnalyzeProgress

  const editing = useSmartImportEditing(setParsed)
  const merge = useSmartImportMerge(existingNodes, existingAuthors, parsed, setParsed, setChecked, masterNode, onUpdateBook)

  const { data: knownAuthors = [] } = useKnownAuthors()
  const { data: knownEditions = [] } = useKnownEditions()

  const resetAll = () => {
    resetPhase()
    setParsed([])
    setChecked(new Set())
    setInjected(false)
    setInserting(false)
    setAnalyzing(false)
    resetAnalyzeProgress()
    setRealAnalyzeProgress(null)
    editing.resetEditing()
    merge.resetMerge()
  }

  const startAnalyzeProgress = () => {
    resetAnalyzeProgress()
    setRealAnalyzeProgress(null)
  }

  const onRealProgress = (done: number, total: number) => {
    const real = Math.round((done / total) * 100)
    setRealAnalyzeProgress((p) => Math.max(p ?? 0, real))
  }

  const setResultsAndCheck = (results: ParsedBook[]) => {
    setParsed(results)
    setChecked(new Set(results.filter((r) => !r.isDuplicate).map((r) => r.id)))
  }

  const handleAnalyzeImages = async () => {
    editing.resetEditing()
    merge.resetMerge()
    setInjected(false)
    setAnalyzing(true)
    startAnalyzeProgress()

    try {
      const images = await Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const dataUrl = reader.result as string
                resolve({ base64: dataUrl.split(',')[1], mimeType: file.type })
              }
              reader.onerror = reject
              reader.readAsDataURL(file)
            }),
        ),
      )
      const results = await parseSmartInputFromImages(images, existingNodes, onRealProgress)
      completeAnalyzeProgress()
      setResultsAndCheck(results)
    } catch (err) {
      devWarn('[SmartImport] Image analysis failed', err)
      toast.error(`Analyse des images échouée : ${formatSupabaseError(err, 'erreur Gemini')}`)
      completeAnalyzeProgress()
      setResultsAndCheck([])
    }

    setAnalyzing(false)
    setPhase('preview')
  }

  const handleAnalyze = async () => {
    if (inputMode === 'image') return handleAnalyzeImages()

    const localResults = parseSmartInput(rawText, existingNodes, knownAuthors, knownEditions)
    editing.resetEditing()
    merge.resetMerge()
    setInjected(false)
    setAnalyzing(true)
    startAnalyzeProgress()

    try {
      const enriched = await parseSmartInputHybrid(localResults, existingNodes, onRealProgress)
      completeAnalyzeProgress()
      setResultsAndCheck(enriched.some((r) => r.parsedByLLM) ? enriched : localResults)
    } catch (err) {
      devWarn('[SmartImport] LLM enrichment failed, using local results', err)
      toast.warning(`Enrichissement Gemini indisponible : ${formatSupabaseError(err, 'analyse locale utilisée')}`)
      completeAnalyzeProgress()
      setResultsAndCheck(localResults)
    }

    setAnalyzing(false)
    setPhase('preview')
  }

  const toggleItem = (id: string) => setChecked((prev) => toggleSetItem(prev, id))

  const handleAddCoAuthor = (itemId: string) => editing.handleAddCoAuthor(itemId, parsed)

  const handleInject = async () => {
    setInserting(true)
    await runSmartImportBatchInsert({
      parsed, checked, mergedIds: merge.mergedIds, intraBatchMerges: merge.intraBatchMerges, existingAuthors,
      onAddAuthor, onAddBook, onAddLink, onAddLinks, masterNode, linkDirection, masterContext,
      onQueued, onImportComplete,
    })
    setInjected(true)
    setTimeout(() => { resetAll(); onClose() }, 1100)
  }

  const handleClose = () => { resetAll(); onClose() }

  const handleReparseChecked = async () => {
    const selected = parsed.filter((r) => checked.has(r.id))
    if (selected.length === 0) return
    setAnalyzing(true)
    try {
      const enriched = await parseSmartInputHybrid(selected, existingNodes)
      const enrichedMap = new Map(enriched.map((r) => [r.id, r]))
      setParsed((prev) => prev.map((item) => enrichedMap.get(item.id) ?? item))
    } catch (err) {
      devWarn('[SmartImport] LLM re-parse failed', err)
      toast.error(`Ré-analyse échouée : ${formatSupabaseError(err, 'erreur Gemini')}`)
    }
    setAnalyzing(false)
  }

  const goBack = () => { goBackPhase(); editing.resetEditing() }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const canAnalyze = inputMode === 'image' ? imageFiles.length > 0 : rawText.trim()
    if (phase === 'input' && canAnalyze && !analyzing) void handleAnalyze()
    else if (phase === 'preview' && checked.size > 0 && !injected && !inserting) void handleInject()
  }

  return {
    phase,
    inputMode,
    setInputMode: phaseState.setInputMode,
    rawText,
    setRawText: phaseState.setRawText,
    imageFiles,
    imagePreviews: phaseState.imagePreviews,
    addImages: phaseState.addImages,
    removeImage: phaseState.removeImage,
    parsed: merge.effectiveParsed,
    checked,
    injected,
    inserting,
    analyzing,
    analyzeProgress,
    masterNode,
    setMasterNode: phaseState.setMasterNode,
    masterContext,
    setMasterContext: phaseState.setMasterContext,
    linkDirection,
    setLinkDirection: phaseState.setLinkDirection,
    editingCell: editing.editingCell,
    setEditingCell: editing.setEditingCell,
    editingValue: editing.editingValue,
    setEditingValue: editing.setEditingValue,
    editingAuthor: editing.editingAuthor,
    setEditingAuthor: editing.setEditingAuthor,
    mergedIds: merge.mergedIds,
    authorMergeSuggestions: merge.authorMergeSuggestions,
    handleAuthorMerge: merge.handleAuthorMerge,
    dismissAuthorMerge: merge.dismissAuthorMerge,
    intraBatchSuggestions: merge.intraBatchSuggestions,
    intraBatchCountByPrimary: merge.intraBatchCountByPrimary,
    handleIntraBatchMerge: merge.handleIntraBatchMerge,
    handleIntraBatchUnmerge: merge.handleIntraBatchUnmerge,
    dismissIntraBatchMerge: merge.dismissIntraBatchMerge,
    handleClose,
    goBack,
    handleSubmit,
    toggleItem,
    commitCellEdit: editing.commitCellEdit,
    commitAuthorEdit: editing.commitAuthorEdit,
    handleMerge: merge.handleMerge,
    handleUnmerge: merge.handleUnmerge,
    dismissDuplicate: merge.dismissDuplicate,
    handleAddCoAuthor,
    handleUpdateAxes: editing.handleUpdateAxes,
    handleRemoveTheme: editing.handleRemoveTheme,
    handleUpdateField: editing.handleUpdateField,
    handleSwapFields: editing.handleSwapFields,
    handleReparseChecked,
    knownEditions,
  }
}

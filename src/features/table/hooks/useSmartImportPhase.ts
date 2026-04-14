import { useState } from 'react'
import type { Book } from '@/types/domain'

export type InputMode = 'text' | 'image'
export type Phase = 'input' | 'preview'

export function useSmartImportPhase(initialMasterNode?: Book | null) {
  const [phase, setPhase] = useState<Phase>('input')
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [rawText, setRawText] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [masterNode, setMasterNode] = useState<Book | null>(null)
  const [masterContext, setMasterContext] = useState('')
  const [linkDirection, setLinkDirection] = useState('master-cites-imported')

  // Sync masterNode when the prop changes (React "adjust state during render" pattern).
  const [prevInitialMasterNode, setPrevInitialMasterNode] = useState(initialMasterNode)
  if (initialMasterNode !== prevInitialMasterNode) {
    setPrevInitialMasterNode(initialMasterNode)
    if (initialMasterNode) setMasterNode(initialMasterNode)
  }

  const addImages = (files: File[]) => {
    const valid = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 4 * 1024 * 1024,
    )
    const remaining = 5 - imageFiles.length
    const toAdd = valid.slice(0, remaining)
    if (toAdd.length === 0) return
    setImageFiles((prev) => [...prev, ...toAdd])
    for (const file of toAdd) {
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const resetPhase = () => {
    setPhase('input')
    setInputMode('text')
    setRawText('')
    setImageFiles([])
    setImagePreviews([])
    setLinkDirection('master-cites-imported')
  }

  const goBack = () => {
    setPhase('input')
  }

  return {
    phase,
    setPhase,
    inputMode,
    setInputMode,
    rawText,
    setRawText,
    imageFiles,
    imagePreviews,
    addImages,
    removeImage,
    masterNode,
    setMasterNode,
    masterContext,
    setMasterContext,
    linkDirection,
    setLinkDirection,
    resetPhase,
    goBack,
  }
}

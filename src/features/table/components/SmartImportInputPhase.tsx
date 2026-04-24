import { useCallback, useRef, useState } from 'react'
import { ImageIcon, Loader2, Type, Upload, X, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextareaImport } from '@/common/components/ui/TextareaImport'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { useImageCapture } from '../hooks/useImageCapture'
import { ImageCaptureView } from './ImageCaptureView'
import { MasterNodeLinkSection } from './MasterNodeLinkSection'

type Props = {
  rawText: string
  setRawText: (value: string) => void
  inputMode: 'text' | 'image'
  setInputMode: (mode: 'text' | 'image') => void
  imageFiles: File[]
  imagePreviews: string[]
  addImages: (files: File[]) => void
  removeImage: (index: number) => void
  masterNode: Book | null
  setMasterNode: (node: Book | null) => void
  masterContext: string
  setMasterContext: (value: string) => void
  linkDirection: string
  setLinkDirection: (value: string) => void
  existingNodes: Book[]
  authorsMap: Map<string, AuthorNode>
  analyzing: boolean
  analyzeProgress: number
}

export function SmartImportInputPhase({
  rawText,
  setRawText,
  inputMode,
  setInputMode,
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
  existingNodes,
  authorsMap,
  analyzing,
  analyzeProgress,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const camera = useImageCapture(addImages)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (files.length > 0) addImages(files)
    },
    [addImages],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) addImages(files)
      e.target.value = ''
    },
    [addImages],
  )

  const canSubmit = inputMode === 'text' ? !!rawText.trim() : imageFiles.length > 0

  return (
    <>
      <p className="mb-3 text-label text-white/40">
        Colle une bibliographie ou importe une photo de page de bibliographie.
        L'app détectera auteur·ices, titres et années.
      </p>

      {/* ── Mode toggle ───────────────────────────────────────── */}
      <div className="mb-3 flex gap-1 rounded-lg bg-white/5 p-0.5 self-start w-fit">
        <button
          type="button"
          onClick={() => setInputMode('text')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.8rem] font-medium transition-all ${
            inputMode === 'text'
              ? 'bg-white/12 text-white/80'
              : 'text-text-secondary hover:text-text-soft'
          }`}
        >
          <Type size={13} /> Texte
        </button>
        <button
          type="button"
          onClick={() => setInputMode('image')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.8rem] font-medium transition-all ${
            inputMode === 'image'
              ? 'bg-white/12 text-white/80'
              : 'text-text-secondary hover:text-text-soft'
          }`}
        >
          <ImageIcon size={13} /> Image
        </button>
      </div>

      {/* ── Text input ────────────────────────────────────────── */}
      {inputMode === 'text' && (
        <TextareaImport
          placeholder={
            'BEAUVOIR Simone de, Le Deuxième Sexe, 1949\nbell hooks (2019), Apprendre à transgresser\nButler J., Gender Trouble, 1990\nPardo et Delor, Femmes et féminismes'
          }
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || !rawText.trim()) return
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }}
          autoFocus
        />
      )}

      {/* ── Image input ───────────────────────────────────────── */}
      {inputMode === 'image' && (
        <div className="mb-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
              dragOver
                ? 'border-cyan/50 bg-cyan/5'
                : 'border-border-default bg-white/2 hover:border-white/25 hover:bg-white/4'
            }`}
          >
            <Upload size={24} className="mb-2 text-text-dimmed" />
            <p className="text-label text-white/40">
              Glisse une image ici ou clique pour en sélectionner
            </p>
            <p className="mt-1 text-micro text-white/22">
              JPG, PNG ou WebP — max 4 Mo par image, 5 images max
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <ImageCaptureView {...camera} />

          {imagePreviews.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {imagePreviews.map((src, i) => (
                <div key={i} className="group relative shrink-0">
                  <img
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="h-24 w-auto rounded-lg border border-border-default object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MasterNodeLinkSection
        masterNode={masterNode}
        setMasterNode={setMasterNode}
        masterContext={masterContext}
        setMasterContext={setMasterContext}
        linkDirection={linkDirection}
        setLinkDirection={setLinkDirection}
        existingNodes={existingNodes}
        authorsMap={authorsMap}
      />

      {analyzing ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2 text-ui text-cyan/70">
            <Loader2 size={14} className="animate-spin" />
            <span>Analyse en cours… {Math.round(analyzeProgress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-cyan/60 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(analyzeProgress, 3)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/35 bg-cyan/10 px-4 py-2 text-ui font-semibold text-cyan/85 transition-all hover:bg-cyan/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Zap size={13} /> Analyser
          </Button>
        </div>
      )}
    </>
  )
}

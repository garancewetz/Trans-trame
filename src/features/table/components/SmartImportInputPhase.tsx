import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Camera, Check, ImageIcon, Link2, Loader2, RectangleHorizontal, RotateCcw, Square, Type, Upload, X, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { TextareaImport } from '@/common/components/ui/TextareaImport'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { NodeSearch } from './TableSubcomponents'
import { INPUT } from '../tableConstants'

function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      canvas.getContext('2d')!.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height,
      )
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

type CropShape = 'square' | '4:3' | '16:9'

const CROP_SHAPES: { key: CropShape; label: string; icon: typeof Square }[] = [
  { key: 'square', label: 'Carré', icon: Square },
  { key: '4:3', label: '4:3', icon: RectangleHorizontal },
  { key: '16:9', label: '16:9', icon: RectangleHorizontal },
]

function getCropProps(shape: CropShape): { aspect: number } {
  switch (shape) {
    case 'square': return { aspect: 1 }
    case '4:3': return { aspect: 4 / 3 }
    case '16:9': return { aspect: 16 / 9 }
  }
}

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState<CropShape>('4:3')
  const croppedAreaRef = useRef<Area | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
    setCameraError(null)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      setCameraActive(true)
      // Attach stream once the video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorise l'accès dans les réglages du navigateur."
          : "Impossible d'accéder à la caméra."
      setCameraError(msg)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const url = canvas.toDataURL('image/jpeg', 0.92)
    stopCamera()
    setCropImageUrl(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    croppedAreaRef.current = null
  }, [stopCamera])

  const cancelCrop = useCallback(() => {
    setCropImageUrl(null)
    croppedAreaRef.current = null
  }, [])

  const confirmCrop = useCallback(async () => {
    if (!cropImageUrl) return
    const area = croppedAreaRef.current
    if (area) {
      const blob = await getCroppedBlob(cropImageUrl, area)
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      addImages([file])
    } else {
      // No crop — use full image
      const res = await fetch(cropImageUrl)
      const blob = await res.blob()
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      addImages([file])
    }
    setCropImageUrl(null)
    croppedAreaRef.current = null
  }, [cropImageUrl, addImages])

  // Cleanup camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

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
      <p className="mb-3 text-[0.82rem] text-white/40">
        Colle une bibliographie ou importe une photo de page de bibliographie.
        L&apos;app détectera auteurs, titres et années.
      </p>

      {/* ── Mode toggle ───────────────────────────────────────── */}
      <div className="mb-3 flex gap-1 rounded-lg bg-white/5 p-0.5 self-start w-fit">
        <button
          type="button"
          onClick={() => setInputMode('text')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.8rem] font-medium transition-all ${
            inputMode === 'text'
              ? 'bg-white/12 text-white/80'
              : 'text-white/35 hover:text-white/55'
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
              : 'text-white/35 hover:text-white/55'
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
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
              dragOver
                ? 'border-cyan/50 bg-cyan/5'
                : 'border-white/12 bg-white/2 hover:border-white/25 hover:bg-white/4'
            }`}
          >
            <Upload size={24} className="mb-2 text-white/25" />
            <p className="text-[0.82rem] text-white/40">
              Glisse une image ici ou clique pour en sélectionner
            </p>
            <p className="mt-1 text-[0.72rem] text-white/22">
              JPG, PNG ou WebP — max 4 Mo par image, 5 images max
            </p>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Camera capture / Crop */}
          {cropImageUrl ? (
            <div className="mt-2 flex flex-col gap-2">
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black" style={{ height: 300 }}>
                <Cropper
                  image={cropImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={getCropProps(cropShape).aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_: Area, pixels: Area) => { croppedAreaRef.current = pixels }}
                  style={{ containerStyle: { borderRadius: 12 } }}
                />
              </div>
              <div className="flex justify-center gap-1 rounded-lg bg-white/5 p-0.5 self-center w-fit">
                {CROP_SHAPES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCropShape(key)}
                    className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[0.72rem] font-medium transition-all ${
                      cropShape === key
                        ? 'bg-white/12 text-white/80'
                        : 'text-white/30 hover:text-white/55'
                    }`}
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
              <p className="text-center text-[0.72rem] text-white/30">
                Glisse pour déplacer, scroll pour zoomer
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={confirmCrop}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[0.8rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18"
                >
                  <Check size={14} /> Valider le recadrage
                </button>
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] text-white/35 transition-colors hover:bg-white/5 hover:text-white/55"
                >
                  <RotateCcw size={14} /> Reprendre
                </button>
              </div>
            </div>
          ) : cameraActive ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video rounded-xl border border-white/10 object-contain bg-black"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[0.8rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18"
                >
                  <Camera size={14} /> Capturer
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] text-white/35 transition-colors hover:bg-white/5 hover:text-white/55"
                >
                  <X size={14} /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] text-white/35 transition-colors hover:bg-white/5 hover:text-white/55"
            >
              <Camera size={14} /> Prendre une photo
            </button>
          )}
          {cameraError && (
            <p className="mt-1.5 text-[0.78rem] text-red-400/80">{cameraError}</p>
          )}

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {imagePreviews.map((src, i) => (
                <div key={i} className="group relative shrink-0">
                  <img
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="h-24 w-auto rounded-lg border border-white/10 object-cover"
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

      <div className="mb-4 rounded-xl border border-white/8 bg-white/2 p-3">
        <label className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[1.2px] text-white/35">
          <Link2 size={10} /> Créer des liens avec…
          <span className="ml-1 font-normal normal-case tracking-normal text-white/22">(optionnel)</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <NodeSearch
              nodes={existingNodes}
              authorsMap={authorsMap}
              value={masterNode}
              onSelect={setMasterNode}
              placeholder="Rechercher un ouvrage source…"
            />
          </div>
          {masterNode && (
            <Button
              type="button"
              onClick={() => { setMasterNode(null); setMasterContext(''); setLinkDirection('master-cites-imported') }}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-white/30 transition-colors hover:text-white"
            >
              <X size={13} />
            </Button>
          )}
        </div>
        {masterNode && (
          <>
            <select
              className={INPUT + ' mt-2'}
              value={linkDirection}
              onChange={(e) => setLinkDirection(e.target.value)}
            >
              <option value="master-cites-imported">L'œuvre source cite chaque ouvrage importé</option>
              <option value="imported-cites-master">Chaque ouvrage importé cite l'œuvre source</option>
            </select>
            <TextInput
              variant="table"
              className={INPUT + ' mt-2'}
              placeholder="Contexte de citation appliqué à tous les liens…"
              value={masterContext}
              onChange={(e) => setMasterContext(e.target.value)}
            />
          </>
        )}
      </div>

      {analyzing ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2 text-[0.85rem] text-cyan/70">
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/35 bg-cyan/10 px-4 py-2 text-[0.85rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Zap size={13} /> Analyser
          </Button>
        </div>
      )}
    </>
  )
}

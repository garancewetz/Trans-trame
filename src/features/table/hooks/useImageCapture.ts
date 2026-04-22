import { useCallback, useEffect, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'

// ── Crop utilities ──────────────────────────────────────────

export function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
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

export type CropShape = 'square' | '4:3' | '16:9'

export const CROP_SHAPES: { key: CropShape; label: string }[] = [
  { key: 'square', label: 'Carré' },
  { key: '4:3', label: '4:3' },
  { key: '16:9', label: '16:9' },
]

export function getCropProps(shape: CropShape): { aspect: number } {
  switch (shape) {
    case 'square': return { aspect: 1 }
    case '4:3': return { aspect: 4 / 3 }
    case '16:9': return { aspect: 16 / 9 }
  }
}

// ── Hook ────────────────────────────────────────────────────

export function useImageCapture(addImages: (files: File[]) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const croppedAreaRef = useRef<Area | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState<CropShape>('4:3')

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
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorise l'accès dans les réglages du navigateur."
          : "Impossible d'accéder à la caméra."
      setCameraError(msg)
    }
  }, [])

  // Attach stream once <video> is mounted to avoid a render/rAF race
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

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

  return {
    cameraActive,
    cameraError,
    cropImageUrl,
    crop,
    setCrop,
    zoom,
    setZoom,
    cropShape,
    setCropShape,
    videoRef,
    croppedAreaRef,
    startCamera,
    stopCamera,
    capturePhoto,
    cancelCrop,
    confirmCrop,
  }
}

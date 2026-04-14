import type { RefObject } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Camera, Check, RotateCcw, RectangleHorizontal, Square, X } from 'lucide-react'
import type { CropShape } from '../hooks/useImageCapture'
import { CROP_SHAPES, getCropProps } from '../hooks/useImageCapture'

type Props = {
  cameraActive: boolean
  cameraError: string | null
  cropImageUrl: string | null
  crop: { x: number; y: number }
  setCrop: (crop: { x: number; y: number }) => void
  zoom: number
  setZoom: (zoom: number) => void
  cropShape: CropShape
  setCropShape: (shape: CropShape) => void
  videoRef: RefObject<HTMLVideoElement | null>
  croppedAreaRef: RefObject<Area | null>
  startCamera: () => void
  stopCamera: () => void
  capturePhoto: () => void
  cancelCrop: () => void
  confirmCrop: () => void
}

const SHAPE_ICONS: Record<CropShape, typeof Square> = {
  'square': Square,
  '4:3': RectangleHorizontal,
  '16:9': RectangleHorizontal,
}

export function ImageCaptureView({
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
}: Props) {
  return (
    <>
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
            {CROP_SHAPES.map(({ key, label }) => {
              const Icon = SHAPE_ICONS[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCropShape(key)}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-micro font-medium transition-all ${
                    cropShape === key
                      ? 'bg-white/12 text-white/80'
                      : 'text-white/30 hover:text-white/55'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              )
            })}
          </div>
          <p className="text-center text-micro text-white/30">
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
    </>
  )
}

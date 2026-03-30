import { X } from 'lucide-react'

export default function TableDedupeModal({
  dedupeModal,
  duplicateGroups,
  handleCleanDupes,
  dedupeConfirm,
  setDedupeModal,
  setDedupeConfirm,
}) {
  if (!dedupeModal) return null

  const totalToRemove = duplicateGroups.reduce((acc, g) => acc + g.length - 1, 0)

  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Dédoublonner</h3>
          <button
            type="button"
            onClick={() => { setDedupeModal(false); setDedupeConfirm(false) }}
            className="cursor-pointer rounded-lg p-1 text-white/30 transition-colors hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <p className="mb-4 text-[0.75rem] text-white/55">
          <span className="font-semibold text-white">{duplicateGroups.length} groupe{duplicateGroups.length > 1 ? 's' : ''}</span>{' '}
          de doublons détectés ({totalToRemove} ouvrage{totalToRemove > 1 ? 's' : ''} à supprimer).
          Le plus riche de chaque groupe sera conservé, ses liens préservés.
        </p>

        <div className="mb-4 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-white/8 text-[0.7rem]">
          {duplicateGroups.map((group, i) => (
            <div key={i} className="border-b border-white/5 px-3 py-2 last:border-0">
              <span className="font-mono text-white/70">{group[0].title}</span>
              <span className="ml-2 text-white/30">×{group.length}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setDedupeModal(false); setDedupeConfirm(false) }}
            className="flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleCleanDupes}
            className={[
              'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all',
              dedupeConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
                : 'border-[rgba(255,180,60,0.3)] bg-[rgba(255,180,60,0.06)] text-[rgba(255,200,100,0.8)] hover:bg-[rgba(255,180,60,0.12)]',
            ].join(' ')}
          >
            {dedupeConfirm ? `Confirmer (−${totalToRemove})` : 'Fusionner les doublons'}
          </button>
        </div>
      </div>
    </div>
  )
}

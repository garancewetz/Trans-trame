import { authorName } from '../../authorUtils'
import { axesGradient } from '../../categories'

export default function TableOrphanModal({
  orphanModal,
  orphans,
  handleCleanOrphans,
  orphanConfirm,
  setOrphanModal,
  setOrphanConfirm,
}) {
  if (!orphanModal) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <h3 className="mb-1 font-semibold text-white">Ouvrages orphelins</h3>
        <p className="mb-4 text-[0.73rem] text-white/38">
          {orphans.length} ouvrage{orphans.length > 1 ? 's' : ''} sans aucun lien dans la galaxie.
        </p>
        <div className="mb-4 max-h-[220px] overflow-y-auto rounded-xl border border-white/8 bg-white/[0.025] p-2">
          {orphans.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
              <span>
                <strong className="block font-mono text-[0.78rem] text-white">{n.title}</strong>
                <span className="font-mono text-[0.65rem] text-white/32">
                  {authorName(n)}{n.year ? `, ${n.year}` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setOrphanModal(false); setOrphanConfirm(false) }}
            className="flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleCleanOrphans}
            className={[
              'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all',
              orphanConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.12)] text-[rgba(255,115,115,0.9)] hover:bg-[rgba(255,70,70,0.2)]'
                : 'border-[rgba(255,200,0,0.28)] bg-[rgba(255,200,0,0.06)] text-[rgba(255,210,80,0.75)] hover:bg-[rgba(255,200,0,0.12)]',
            ].join(' ')}
          >
            {orphanConfirm ? `Supprimer (${orphans.length})` : 'Nettoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

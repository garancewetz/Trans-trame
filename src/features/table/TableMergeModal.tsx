import { Merge } from 'lucide-react'
import { bookAuthorDisplay } from '../../authorUtils'

export default function TableMergeModal({
  mergeModal,
  mergeNodes,
  nodes,
  authorsMap,
  mergeKeepId,
  setMergeKeepId,
  setMergeConfirm,
  mergeConfirm,
  handleConfirmMerge,
  setMergeModal,
}) {
  if (!mergeModal || mergeNodes.length !== 2) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <h3 className="mb-1 font-semibold text-white">Fusionner deux identités</h3>
        <p className="mb-4 text-[0.73rem] text-white/40">
          L&apos;identité non conservée sera supprimée. Ses ouvrages et liens seront
          transférés vers l&apos;identité conservée.
        </p>

        <div className="mb-4 flex flex-col gap-2">
          {mergeNodes.map((n) => {
            const authorDisplay = bookAuthorDisplay(n, authorsMap)
            const bookCount = nodes.filter(
              (x) => bookAuthorDisplay(x, authorsMap).toLowerCase() === authorDisplay.toLowerCase()
            ).length
            return (
              <label
                key={n.id}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                  mergeKeepId === n.id
                    ? 'border-[rgba(0,255,135,0.4)] bg-[rgba(0,255,135,0.06)]'
                    : 'border-white/8 bg-white/3 hover:border-white/15',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    mergeKeepId === n.id
                      ? 'border-[#00FF87] bg-[rgba(0,255,135,0.2)]'
                      : 'border-white/25',
                  ].join(' ')}
                >
                  {mergeKeepId === n.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00FF87]" />
                  )}
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  checked={mergeKeepId === n.id}
                  onChange={() => { setMergeKeepId(n.id); setMergeConfirm(false) }}
                />
                <div>
                  <strong className="block font-mono text-[0.82rem] text-white">
                    {n.title}
                  </strong>
                  <span className="font-mono text-[0.7rem] text-white/40">
                    {authorDisplay}{n.year ? `, ${n.year}` : ''}
                  </span>
                  <span className="ml-2 font-mono text-[0.65rem] text-white/28">
                    · {bookCount} ouvrage{bookCount > 1 ? 's' : ''}
                  </span>
                </div>
              </label>
            )
          })}
        </div>

        <p className="mb-4 text-[0.7rem] text-white/28">
          Conserver :{' '}
          <strong className="text-white/55">
            {mergeNodes.find((n) => n.id === mergeKeepId)
              ? bookAuthorDisplay(mergeNodes.find((n) => n.id === mergeKeepId), authorsMap)
              : '—'}
          </strong>
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMergeModal(false); setMergeConfirm(false) }}
            className="flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirmMerge}
            disabled={!mergeKeepId}
            className={[
              'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
              mergeConfirm
                ? 'border-[rgba(255,200,60,0.55)] bg-[rgba(255,200,60,0.12)] text-[rgba(255,215,100,0.9)] hover:bg-[rgba(255,200,60,0.2)]'
                : 'border-[rgba(255,200,60,0.28)] bg-[rgba(255,200,60,0.06)] text-[rgba(255,210,80,0.7)] hover:bg-[rgba(255,200,60,0.12)]',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-1.5">
              <Merge size={12} />
              {mergeConfirm ? 'Confirmer la fusion' : 'Fusionner'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

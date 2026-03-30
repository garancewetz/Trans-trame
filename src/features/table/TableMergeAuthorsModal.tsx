import { Merge } from 'lucide-react'
import Button from '../../components/ui/Button'
import { authorName } from '@/lib/authorUtils'

export default function TableMergeAuthorsModal({
  open,
  authorsToMerge,
  keepId,
  setKeepId,
  confirm,
  setConfirm,
  onConfirm,
  onClose,
  bookCountByAuthor,
}) {
  if (!open || (authorsToMerge || []).length !== 2) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <h3 className="mb-1 font-semibold text-white">Fusionner deux auteur·ices</h3>
        <p className="mb-4 text-[0.73rem] text-white/40">
          L&apos;auteur·ice non conservé·e sera supprimé·e. Ses ouvrages seront transférés vers l&apos;auteur·ice conservé·e.
        </p>

        <div className="mb-4 flex flex-col gap-2">
          {authorsToMerge.map((a) => {
            const booksCount = bookCountByAuthor?.get?.(a.id) || 0
            return (
              <label
                key={a.id}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                  keepId === a.id
                    ? 'border-[rgba(0,255,135,0.4)] bg-[rgba(0,255,135,0.06)]'
                    : 'border-white/8 bg-white/3 hover:border-white/15',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    keepId === a.id
                      ? 'border-[#00FF87] bg-[rgba(0,255,135,0.2)]'
                      : 'border-white/25',
                  ].join(' ')}
                >
                  {keepId === a.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00FF87]" />
                  )}
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  checked={keepId === a.id}
                  onChange={() => { setKeepId(a.id); setConfirm(false) }}
                />
                <div>
                  <strong className="block font-mono text-[0.82rem] text-white">
                    {authorName(a)}
                  </strong>
                  <span className="font-mono text-[0.7rem] text-white/40">
                    {a.lastName ? a.lastName.toUpperCase() : '—'}{a.firstName ? `, ${a.firstName}` : ''}
                  </span>
                  <span className="ml-2 font-mono text-[0.65rem] text-white/28">
                    · {booksCount} ouvrage{booksCount > 1 ? 's' : ''}
                  </span>
                </div>
              </label>
            )
          })}
        </div>

        <p className="mb-4 text-[0.7rem] text-white/28">
          Conserver :{' '}
          <strong className="text-white/55">
            {authorsToMerge.find((a) => a.id === keepId) ? authorName(authorsToMerge.find((a) => a.id === keepId)) : '—'}
          </strong>
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => { onClose?.(); setConfirm(false) }}
            variant="modalSecondary"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!keepId}
            className={[
              'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30',
              confirm
                ? 'border-[rgba(255,200,60,0.55)] bg-[rgba(255,200,60,0.12)] text-[rgba(255,215,100,0.9)] hover:bg-[rgba(255,200,60,0.2)]'
                : 'border-[rgba(255,200,60,0.28)] bg-[rgba(255,200,60,0.06)] text-[rgba(255,210,80,0.7)] hover:bg-[rgba(255,200,60,0.12)]',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-1.5">
              <Merge size={12} />
              {confirm ? 'Confirmer la fusion' : 'Fusionner'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}


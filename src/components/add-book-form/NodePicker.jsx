import { Search, X } from 'lucide-react'
import { axesGradient } from '../../categories'
import { authorName } from '../../authorUtils'

export default function NodePicker({
  label,
  value,
  onChange,
  placeholder,
  results,
  onPick,
  addButtonVisible,
  onRequestAddBook,
  query,
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">{label}</span>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-white/25">
          <Search size={16} />
        </div>
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3.5 text-[0.85rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-[rgba(140,220,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.08)]"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {query && (
          <button
            className="absolute right-2.5 cursor-pointer bg-transparent px-2 py-1 text-white/30 hover:text-white"
            onClick={() => onChange({ target: { value: '' } })}
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="max-h-[200px] overflow-y-auto rounded-[10px] border border-white/10 bg-white/5 p-1">
          {results.length === 0 ? (
            <div className="p-2">
              <p className="p-2 text-center text-[0.82rem] leading-relaxed text-white/40">
                Aucun ouvrage trouv&eacute; pour &laquo;&nbsp;{query}&nbsp;&raquo;
              </p>
              {addButtonVisible && typeof onRequestAddBook === 'function' && (
                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-transparent px-3 py-3 text-center text-[0.84rem] font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    onRequestAddBook()
                  }}
                  type="button"
                >
                  Ajouter un ouvrage ?
                </button>
              )}
            </div>
          ) : (
            <ul className="flex list-none flex-col">
              {results.map((n) => (
                <li key={n.id}>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg bg-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
                    type="button"
                    onClick={() => onPick(n)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: axesGradient(n.axes) }}
                    />
                    <span className="min-w-0">
                      <strong className="block text-[0.85rem] font-semibold text-white">{n.title}</strong>
                      <span className="mt-0.5 block text-[0.75rem] text-white/35">
                        {authorName(n)}, {n.year}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </label>
  )
}

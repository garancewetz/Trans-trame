import { useMemo, useState } from 'react'
import { Search, X, Merge, Trash2 } from 'lucide-react'
import { authorName } from '../../authorUtils'
import { axesGradient } from '../../categories'
import AxisSelector from './AxisSelector'
import DuplicateWarning from './DuplicateWarning'

export default function BookForm({
  mode,
  inputClass,
  onSubmit,
  title,
  setTitle,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  year,
  setYear,
  selectedAxes,
  toggleAxis,
  description,
  setDescription,
  possibleDuplicates,
  editNode,
  nodes,
  onDeleteBook,
  onMergeBooks,
}) {
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeTarget, setMergeTarget] = useState(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const mergeResults = useMemo(() => {
    const q = mergeSearch.toLowerCase().trim()
    if (!q || !editNode) return []
    return (nodes || []).filter(
      (n) =>
        n.id !== editNode.id &&
        (n.title.toLowerCase().includes(q) || authorName(n).toLowerCase().includes(q))
    )
  }, [mergeSearch, nodes, editNode])

  const handleMerge = () => {
    if (!mergeTarget || !editNode) return
    if (!mergeConfirm) {
      setMergeConfirm(true)
      return
    }
    onMergeBooks?.(editNode.id, mergeTarget.id)
    setMergeSearch('')
    setMergeTarget(null)
    setMergeConfirm(false)
  }

  const handleDelete = () => {
    if (!editNode) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    onDeleteBook?.(editNode.id)
    setDeleteConfirm(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <h3 className="border-b border-white/10 pb-2.5 text-[0.82rem] font-bold uppercase tracking-[2px] text-white/50">
        {mode === 'edit' ? 'Modifier l\u2019ouvrage' : 'Nouvel ouvrage'}
      </h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Titre
        </span>
        <input
          className={inputClass}
          placeholder="Ex : Feminist Theory"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Pr&eacute;nom
          </span>
          <input
            className={inputClass}
            placeholder="Ex : bell"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Nom
          </span>
          <input
            className={inputClass}
            placeholder="Ex : hooks"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>

      <DuplicateWarning possibleDuplicates={possibleDuplicates} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Ann&eacute;e
        </span>
        <input
          className={inputClass}
          type="number"
          placeholder="1984"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      <AxisSelector selectedAxes={selectedAxes} toggleAxis={toggleAxis} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Description
        </span>
        <textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="Courte description de l'ouvrage..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <button
        type="submit"
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-[rgba(140,220,255,0.7)] to-[rgba(80,160,255,0.9)] px-5 py-3.5 text-[0.85rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-[rgba(140,220,255,0.9)] hover:to-[rgba(80,160,255,1)] hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mode === 'edit' ? 'Enregistrer les modifications' : 'Ajouter l\u2019ouvrage'}
      </button>

      {mode === 'edit' && editNode && (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/2 p-4">
          <h4 className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/25">
            Zone dangereuse
          </h4>

          {/* Merge */}
          <div className="mb-4">
            <p className="mb-2 text-[0.75rem] text-white/40">
              Fusionner cet ouvrage dans un autre (les liens seront transférés)
            </p>

            {!mergeTarget ? (
              <div>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3 text-white/25">
                    <Search size={14} />
                  </div>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-8 text-[0.82rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-white/20 focus:bg-white/8"
                    type="text"
                    placeholder="Rechercher l'ouvrage cible…"
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                  />
                  {mergeSearch && (
                    <button
                      className="absolute right-2 cursor-pointer bg-transparent px-1 py-0.5 text-white/30 hover:text-white"
                      onClick={() => setMergeSearch('')}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {mergeSearch.trim() && (
                  <div className="mt-1.5 max-h-[180px] overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-1">
                    {mergeResults.length === 0 ? (
                      <p className="p-2 text-center text-[0.78rem] text-white/30">
                        Aucun ouvrage trouvé
                      </p>
                    ) : (
                      <ul className="flex list-none flex-col">
                        {mergeResults.map((n) => (
                          <li key={n.id}>
                            <button
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-3 py-2 text-left transition-colors hover:bg-white/10"
                              type="button"
                              onClick={() => {
                                setMergeTarget(n)
                                setMergeSearch('')
                                setMergeConfirm(false)
                              }}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ background: axesGradient(n.axes) }}
                              />
                              <span className="min-w-0">
                                <strong className="block text-[0.82rem] font-semibold text-white">
                                  {n.title}
                                </strong>
                                <span className="mt-0.5 block text-[0.72rem] text-white/35">
                                  {authorName(n)}{n.year ? `, ${n.year}` : ''}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: axesGradient(mergeTarget.axes) }}
                  />
                  <span className="min-w-0 truncate text-[0.82rem] text-white">
                    {mergeTarget.title}
                  </span>
                  <button
                    className="ml-auto shrink-0 cursor-pointer bg-transparent text-white/30 hover:text-white"
                    type="button"
                    onClick={() => {
                      setMergeTarget(null)
                      setMergeConfirm(false)
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  className={[
                    'shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-[0.75rem] font-semibold transition-all',
                    mergeConfirm
                      ? 'border-[rgba(255,171,64,0.6)] bg-[rgba(255,171,64,0.15)] text-[rgba(255,200,100,0.95)] hover:bg-[rgba(255,171,64,0.25)]'
                      : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                  onClick={handleMerge}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Merge size={12} />
                    {mergeConfirm ? 'Confirmer' : 'Fusionner'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div>
            <button
              type="button"
              className={[
                'cursor-pointer rounded-lg border px-3 py-2 text-[0.75rem] font-semibold transition-all',
                deleteConfirm
                  ? 'border-[rgba(255,80,80,0.6)] bg-[rgba(255,80,80,0.15)] text-[rgba(255,140,140,0.95)] hover:bg-[rgba(255,80,80,0.25)]'
                  : 'border-white/10 bg-transparent text-white/30 hover:border-[rgba(255,80,80,0.3)] hover:text-[rgba(255,140,140,0.7)]',
              ].join(' ')}
              onClick={handleDelete}
              onBlur={() => setDeleteConfirm(false)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Trash2 size={12} />
                {deleteConfirm ? 'Confirmer la suppression' : 'Supprimer l\u2019ouvrage'}
              </span>
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

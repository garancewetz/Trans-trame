import { useMemo, useState } from 'react'
import type { Book } from '@/domain/types'
import { Controller } from 'react-hook-form'
import { Search, X, Merge, Trash2, Pin } from 'lucide-react'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import { axesGradient } from '@/lib/categories'
import Button from '../../components/ui/Button'
import TextInput from '../../components/ui/TextInput'
import Textarea from '../../components/ui/Textarea'
import { AuthorPicker } from '../table/TableSubcomponents'
import AxisSelector from './AxisSelector'
import DuplicateWarning from './DuplicateWarning'

export default function BookForm({
  mode,
  inputClass,
  onSubmit,
  bookForm,
  toggleAxis,
  possibleDuplicates,
  editNode,
  nodes,
  onDeleteBook,
  onMergeBooks,
  recentQueue,
  authorsMap,
  authors,
  onAddAuthor,
}) {
  const { register, control, watch } = bookForm
  const selectedAxes = watch('axes') || []

  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeTarget, setMergeTarget] = useState<Book | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const mergeResults = useMemo(() => {
    const q = mergeSearch.toLowerCase().trim()
    if (!q || !editNode) return []
    return (nodes || []).filter(
      (n) =>
        n.id !== editNode.id &&
        (n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q))
    )
  }, [mergeSearch, nodes, editNode, authorsMap])

  const handleMerge = () => {
    if (!mergeTarget || !editNode) return
    if (!mergeConfirm) { setMergeConfirm(true); return }
    onMergeBooks?.(editNode.id, mergeTarget.id)
    setMergeSearch('')
    setMergeTarget(null)
    setMergeConfirm(false)
  }

  const handleDelete = () => {
    if (!editNode) return
    if (!deleteConfirm) { setDeleteConfirm(true); return }
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
        <TextInput
          variant="default"
          className={inputClass}
          placeholder="Ex : Feminist Theory"
          {...register('title', { required: true })}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Auteur·ices
        </span>
        <Controller
          name="authorIds"
          control={control}
          rules={{
            validate: (v) => (Array.isArray(v) && v.length > 0) || 'Au moins un auteur·ice',
          }}
          render={({ field, fieldState }) => (
            <>
              <AuthorPicker
                authors={authors || []}
                selectedAuthorIds={field.value || []}
                onChange={field.onChange}
                onAddAuthor={onAddAuthor}
              />
              {fieldState.error?.message && (
                <span className="text-[0.68rem] text-[rgba(255,140,140,0.85)]">{fieldState.error.message}</span>
              )}
            </>
          )}
        />
      </div>

      {mode === 'book' && (
        <Controller
          name="stickyAuthor"
          control={control}
          render={({ field: { value, onChange } }) => (
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <Button
                type="button"
                onClick={() => onChange(!value)}
                className={[
                  'relative h-5 w-9 shrink-0 rounded-full border transition-all duration-200',
                  value
                    ? 'border-[rgba(0,255,135,0.6)] bg-[rgba(0,255,135,0.25)]'
                    : 'border-white/15 bg-white/5',
                ].join(' ')}
                aria-checked={value}
                role="switch"
              >
                <span
                  className={[
                    'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-200',
                    value ? 'left-[18px] bg-[#00FF87]' : 'left-0.5 bg-white/30',
                  ].join(' ')}
                />
              </Button>
              <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-white/50 transition-colors">
                <Pin size={11} className={value ? 'text-[#00FF87]' : 'text-white/30'} />
                Garder les auteur·ices pour la suite
              </span>
            </label>
          )}
        />
      )}

      <DuplicateWarning possibleDuplicates={possibleDuplicates} authorsMap={authorsMap} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Ann&eacute;e
        </span>
        <TextInput
          variant="default"
          className={inputClass}
          type="number"
          placeholder="1984"
          {...register('year')}
        />
      </label>

      <AxisSelector selectedAxes={selectedAxes} toggleAxis={toggleAxis} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Description
        </span>
        <Textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="Courte description de l'ouvrage..."
          {...register('description')}
        />
      </label>

      <Button
        type="submit"
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-[rgba(140,220,255,0.7)] to-[rgba(80,160,255,0.9)] px-5 py-3.5 text-[0.85rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-[rgba(140,220,255,0.9)] hover:to-[rgba(80,160,255,1)] hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mode === 'edit' ? 'Enregistrer les modifications' : 'Ajouter l\u2019ouvrage'}
      </Button>

      {mode === 'book' && recentQueue && recentQueue.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-white/25">
            Ajout&eacute;s cette session
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recentQueue.map((item, i) => (
              <span
                key={i}
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.72rem] text-white/55"
                title={`${item.title} — ${bookAuthorDisplay({ authorIds: item.authorIds }, authorsMap)}, ${item.year}`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00FF87] opacity-70" />
                <span className="truncate">{item.title}</span>
                {item.year ? (
                  <span className="shrink-0 tabular-nums text-white/30">{item.year}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === 'edit' && editNode && (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/2 p-4">
          <h4 className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white/25">
            Zone dangereuse
          </h4>

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
                  <TextInput
                    variant="default"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-8 text-[0.82rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-white/20 focus:bg-white/8"
                    type="text"
                    placeholder="Rechercher l'ouvrage cible…"
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                  />
                  {mergeSearch && (
                    <Button
                      className="absolute right-2 cursor-pointer bg-transparent px-1 py-0.5 text-white/30 hover:text-white"
                      onClick={() => setMergeSearch('')}
                      type="button"
                    >
                      <X size={14} />
                    </Button>
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
                            <Button
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
                                  {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                                </span>
                              </span>
                            </Button>
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
                  <Button
                    className="ml-auto shrink-0 cursor-pointer bg-transparent text-white/30 hover:text-white"
                    type="button"
                    onClick={() => { setMergeTarget(null); setMergeConfirm(false) }}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <Button
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
                </Button>
              </div>
            )}
          </div>

          <div>
            <Button
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
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

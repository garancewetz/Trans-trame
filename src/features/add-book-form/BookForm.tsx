import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Author, Book } from '@/domain/types'
import type { AuthorNode } from '@/lib/authorUtils'
import { Controller } from 'react-hook-form'
import { X, Merge, Trash2, Pin } from 'lucide-react'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import { axesGradient } from '@/lib/categories'
import Button from '../../components/ui/Button'
import TextInput from '../../components/ui/TextInput'
import Textarea from '../../components/ui/Textarea'
import FormField from '../../components/ui/FormField'
import Pill from '../../components/ui/Pill'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { AuthorPicker } from '../table/TableSubcomponents'
import AxisSelector from './AxisSelector'
import DuplicateWarning from './DuplicateWarning'

type BookFormValues = {
  title: string
  authorIds: string[]
  year?: number | null
  axes: string[]
  description?: string
  stickyAuthor?: boolean
}

type Props = {
  mode: 'book' | 'edit'
  inputClass?: string
  onSubmit: (e: FormEvent) => void
  bookForm: UseFormReturn<BookFormValues>
  toggleAxis: (axisId: string) => void
  possibleDuplicates: Book[]
  editNode: Book | null
  nodes: Book[]
  onDeleteBook?: (id: string) => void
  onMergeBooks?: (fromId: string, toId: string) => void
  recentQueue: Book[]
  authorsMap: Map<string, AuthorNode>
  authors: Author[]
  onAddAuthor?: (author: Author) => void
}

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
}: Props) {
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

      <FormField label="Titre">
        <TextInput
          variant="default"
          className={inputClass}
          placeholder="Ex : Feminist Theory"
          {...register('title', { required: true })}
        />
      </FormField>

      <FormField label="Auteur·ices" as="div">
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
      </FormField>

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

      <FormField label="Année">
        <TextInput
          variant="default"
          className={inputClass}
          type="number"
          placeholder="1984"
          {...register('year')}
        />
      </FormField>

      <AxisSelector selectedAxes={selectedAxes} toggleAxis={toggleAxis} />

      <FormField label="Description">
        <Textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="Courte description de l'ouvrage..."
          {...register('description')}
        />
      </FormField>

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
              <Pill
                key={i}
                title={`${item.title} — ${bookAuthorDisplay({ authorIds: item.authorIds }, authorsMap)}, ${item.year}`}
                suffix={item.year || null}
              >
                {item.title}
              </Pill>
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
              <SearchableSelect<Book>
                query={mergeSearch}
                onQueryChange={setMergeSearch}
                results={mergeResults}
                getKey={(n) => n.id}
                onSelect={(n) => { setMergeTarget(n); setMergeSearch(''); setMergeConfirm(false) }}
                placeholder="Rechercher l'ouvrage cible…"
                emptyMessage="Aucun ouvrage trouvé"
                renderItem={(n) => (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
                    <span className="min-w-0">
                      <strong className="block text-[0.82rem] font-semibold text-white">{n.title}</strong>
                      <span className="mt-0.5 block text-[0.72rem] text-white/35">
                        {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                      </span>
                    </span>
                  </>
                )}
              />
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
                    variant="icon"
                    className="ml-auto shrink-0"
                    type="button"
                    onClick={() => { setMergeTarget(null); setMergeConfirm(false) }}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  outlineWeight="strong"
                  tone="merge"
                  active={mergeConfirm}
                  icon={<Merge size={12} />}
                  className="shrink-0"
                  onClick={handleMerge}
                >
                  {mergeConfirm ? 'Confirmer' : 'Fusionner'}
                </Button>
              </div>
            )}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              outlineWeight="strong"
              tone="danger"
              active={deleteConfirm}
              icon={<Trash2 size={12} />}
              onClick={handleDelete}
              onBlur={() => setDeleteConfirm(false)}
            >
              {deleteConfirm ? 'Confirmer la suppression' : 'Supprimer l\u2019ouvrage'}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

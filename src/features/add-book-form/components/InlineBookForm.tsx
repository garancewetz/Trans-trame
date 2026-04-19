import { useMemo, useState } from 'react'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { FormField } from '@/common/components/ui/FormField'
import { AuthorPicker } from '../../table/components/AuthorPicker'
import { AxisSelector } from './AxisSelector'
import { DuplicateWarning } from './DuplicateWarning'

type Props = {
  initialTitle: string
  nodes: Book[]
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  onAddAuthor?: (author: Author) => void
  onSubmit: (book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'>) => void
  onCancel: () => void
}

export function InlineBookForm({
  initialTitle,
  nodes,
  authors,
  authorsMap,
  onAddAuthor,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [authorIds, setAuthorIds] = useState<string[]>([])
  const [year, setYear] = useState('')
  const [axes, setAxes] = useState<string[]>([])

  const toggleAxis = (axis: string) =>
    setAxes((prev) => (prev.includes(axis) ? prev.filter((a) => a !== axis) : [...prev, axis]))

  const canSubmit = title.trim().length > 0 && authorIds.length > 0

  const possibleDuplicates = useMemo(() => {
    const t = title.toLowerCase().trim()
    if (!t) return []
    const selectedIds = new Set(authorIds)
    return nodes.filter((n) => {
      const nt = (n.title || '').toLowerCase()
      const nIds = new Set(n.authorIds || [])
      const overlap = [...selectedIds].some((id) => nIds.has(id))
      if (nt === t) return true
      if (t.length >= 4 && (nt.includes(t) || t.includes(nt))) return true
      if (overlap && t.length >= 3 && (nt.includes(t.slice(0, Math.min(t.length, 12))) || t.includes(nt.slice(0, Math.min(nt.length, 12))))) return true
      return false
    })
  }, [title, authorIds, nodes])

  const handleSubmit = () => {
    if (!canSubmit) return
    const book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'> = {
      id: crypto.randomUUID(),
      type: 'book',
      title: title.trim(),
      authorIds,
      year: parseInt(year, 10) || null,
      axes,
    }
    onSubmit(book)
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-cyan/20 bg-cyan/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] font-bold uppercase tracking-[1.5px] text-cyan/70">
          Nouvel ressource
        </span>
        <Button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-white/30 transition-colors hover:text-white/60"
        >
          <X size={14} />
        </Button>
      </div>

      <FormField label="Titre">
        <TextInput
          variant="default"
          className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[0.88rem] text-white outline-none placeholder:text-white/35 focus:border-cyan/40 focus:bg-white/10"
          placeholder="Titre de la ressource"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </FormField>

      <DuplicateWarning possibleDuplicates={possibleDuplicates} authorsMap={authorsMap} />

      <FormField label="Auteur·ices" as="div">
        <AuthorPicker
          authors={authors || []}
          selectedAuthorIds={authorIds}
          onChange={setAuthorIds}
          onAddAuthor={onAddAuthor}
        />
      </FormField>

      <FormField label="Année">
        <TextInput
          variant="default"
          className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[0.88rem] text-white outline-none placeholder:text-white/35 focus:border-cyan/40 focus:bg-white/10"
          type="number"
          placeholder="1984"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </FormField>

      <AxisSelector selectedAxes={axes} toggleAxis={toggleAxis} />

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="flex-1 cursor-pointer rounded-[8px] bg-linear-to-br from-cyan/70 to-blue/90 px-4 py-2.5 text-ui font-semibold text-white transition-all hover:-translate-y-px hover:from-cyan/90 hover:to-blue/100 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Créer et sélectionner
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-[8px] border border-white/10 bg-white/5 px-4 py-2.5 text-ui text-white/50 transition-all hover:bg-white/10 hover:text-white/70"
        >
          Annuler
        </Button>
      </div>
    </div>
  )
}

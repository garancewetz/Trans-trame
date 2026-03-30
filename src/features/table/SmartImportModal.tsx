import { useState, type FormEvent } from 'react'
import { ChevronLeft, X, Zap } from 'lucide-react'
import type { Author, Book, Link } from '@/domain/types'
import type { AuthorNode } from '@/lib/authorUtils'
import Button from '../../components/ui/Button'

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return (
    v != null &&
    (typeof v === 'object' || typeof v === 'function') &&
    'then' in v &&
    typeof (v as PromiseLike<unknown>).then === 'function'
  )
}
import { parseSmartInput, type ParsedBook } from './parseSmartInput'
import SmartImportInputPhase from './SmartImportInputPhase'
import SmartImportPreviewPhase from './SmartImportPreviewPhase'

/** Normalise une chaîne pour la comparaison auteur */
function normStr(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

type AuthorNameParts = { firstName?: string; lastName?: string }

/**
 * Pour chaque auteur dans la liste, cherche un auteur existant (match prénom+nom normalisé).
 * Si absent, crée un nouveau nœud auteur via onAddAuthor et retourne son id.
 * Retourne un tableau d'ids auteurs résolus.
 */
function resolveOrCreateAuthors(
  authorList: AuthorNameParts[],
  existingAuthors: Author[],
  onAddAuthor: (a: Author) => void
): string[] {
  if (!authorList?.length) return []
  const resolved: string[] = []
  authorList.forEach(({ firstName, lastName }) => {
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    if (!fn && !ln) return
    const existing = existingAuthors.find(
      (a) => normStr(a.firstName) === normStr(fn) && normStr(a.lastName) === normStr(ln)
    )
    if (existing) {
      resolved.push(existing.id)
    } else {
      const newId = crypto.randomUUID()
      onAddAuthor({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      existingAuthors.push({ id: newId, type: 'author', firstName: fn, lastName: ln, axes: [] })
      resolved.push(newId)
    }
  })
  return resolved
}

type SmartImportModalProps = {
  open: boolean
  onClose: () => void
  existingNodes: Book[]
  existingAuthors?: Author[]
  authorsMap: Map<string, AuthorNode>
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onAddAuthor?: (author: Author) => void
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
  onUpdateBook?: (book: Book) => void
  onQueued?: (titles: string[]) => void
  onImportComplete?: (ids: string[]) => void
}

export default function SmartImportModal({
  open,
  onClose,
  existingNodes,
  existingAuthors = [],
  authorsMap,
  onAddBook,
  onAddAuthor,
  onAddLink,
  onUpdateBook,
  onQueued,
  onImportComplete,
}: SmartImportModalProps) {
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedBook[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [injected, setInjected] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [masterNode, setMasterNode] = useState<Book | null>(null)
  const [masterContext, setMasterContext] = useState('')
  const [linkDirection, setLinkDirection] = useState('master-cites-imported')
  const [editingCell, setEditingCell] = useState<null | { id: string; field: string }>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingAuthor, setEditingAuthor] = useState<
    null | { id: string; authorIndex: number | null; firstName: string; lastName: string }
  >(null)
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())

  if (!open) return null

  const resetAll = () => {
    setPhase('input')
    setRawText('')
    setParsed([])
    setChecked(new Set())
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setInjected(false)
    setInserting(false)
    setLinkDirection('master-cites-imported')
  }

  const handleAnalyze = () => {
    const results = parseSmartInput(rawText, existingNodes)
    setParsed(results)
    setChecked(new Set(results.filter((r) => !r.isDuplicate).map((r) => r.id)))
    setEditingCell(null)
    setEditingAuthor(null)
    setMergedIds(new Set())
    setPhase('preview')
    setInjected(false)
  }

  const handleMerge = (item: ParsedBook) => {
    if (!item.existingNode || !onUpdateBook) return
    const existing = item.existingNode
    if (!existing.id) return
    const updates = { ...existing }
    if (!existing.firstName && item.firstName) updates.firstName = item.firstName
    if (!existing.lastName && item.lastName) updates.lastName = item.lastName
    if ((!existing.year || existing.year === new Date().getFullYear()) && item.year && !item.yearMissing) {
      updates.year = item.year
    }
    onUpdateBook(updates as Book)
    if (masterNode) {
      const exId = existing.id
      const source = linkDirection === 'imported-cites-master' ? exId : masterNode.id
      const target = linkDirection === 'imported-cites-master' ? masterNode.id : exId
      onAddLink?.({
        source,
        target,
        citation_text: masterContext.trim(),
        edition: item.edition || '',
        page: '',
        context: '',
      })
    }
    setMergedIds((prev) => new Set([...prev, item.id]))
    setChecked((prev) => { const next = new Set(prev); next.delete(item.id); return next })
  }

  const toggleItem = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const commitCellEdit = () => {
    if (!editingCell) return
    const { id, field } = editingCell
    let val = editingValue.trim()
    if (field === 'year') {
      const p = parseInt(val)
      val = isNaN(p) ? val : String(p)
    }
    setParsed((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: val }
        if (field === 'year') updated.yearMissing = false
        return updated
      })
    )
    setEditingCell(null)
  }

  const commitAuthorEdit = () => {
    if (!editingAuthor) return
    const { id, authorIndex, firstName, lastName } = editingAuthor
    const fn = (firstName || '').trim()
    const ln = (lastName || '').trim()
    setParsed((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (authorIndex != null && item.authors?.length > authorIndex) {
          let updatedAuthors
          if (!fn && !ln) {
            // Retirer l'auteur vide (sauf s'il n'en reste qu'un)
            updatedAuthors = item.authors.filter((_, i) => i !== authorIndex)
            if (updatedAuthors.length === 0) updatedAuthors = [{ firstName: '', lastName: '' }]
          } else {
            updatedAuthors = item.authors.map((a, i) =>
              i === authorIndex ? { firstName: fn, lastName: ln } : a
            )
          }
          const first = updatedAuthors[0] || {}
          return { ...item, authors: updatedAuthors, firstName: first.firstName || '', lastName: first.lastName || '' }
        }
        return { ...item, firstName: fn, lastName: ln }
      })
    )
    setEditingAuthor(null)
  }

  const handleUpdateAxes = (itemId: string, newAxes: ParsedBook['axes']) => {
    setParsed((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, axes: newAxes } : item))
    )
  }

  const handleAddCoAuthor = (itemId: string) => {
    const item = parsed.find((i) => i.id === itemId)
    if (!item) return
    const currentAuthors = item.authors?.length > 0
      ? item.authors
      : [{ firstName: item.firstName || '', lastName: item.lastName || '' }]
    const newIndex = currentAuthors.length
    setParsed((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        return { ...it, authors: [...currentAuthors, { firstName: '', lastName: '' }] }
      })
    )
    setEditingAuthor({ id: itemId, authorIndex: newIndex, firstName: '', lastName: '' })
  }

  const handleInject = async () => {
    setInserting(true)
    const toAdd = parsed.filter((r) => checked.has(r.id))
    const newIds: string[] = []
    const localAuthors = [...existingAuthors]
    const insertPromises: Promise<unknown>[] = []
    toAdd.forEach((r) => {
      // Résoudre ou créer les auteurs de ce livre
      const authorIds = onAddAuthor
        ? resolveOrCreateAuthors(r.authors || [], localAuthors, onAddAuthor)
        : []
      const pending = onAddBook?.({
        id: r.id,
        title: r.title,
        firstName: r.firstName,
        lastName: r.lastName,
        authorIds,
        year: r.year,
        axes: r.axes,
        description: '',
      })
      if (isThenable(pending)) insertPromises.push(Promise.resolve(pending))
      newIds.push(r.id)
    })
    // Attendre que tous les livres soient persistés en DB avant de créer les liens
    if (insertPromises.length > 0) await Promise.all(insertPromises)
    if (masterNode) {
      toAdd.forEach((r) => {
        const source = linkDirection === 'imported-cites-master' ? r.id : masterNode.id
        const target = linkDirection === 'imported-cites-master' ? masterNode.id : r.id
        onAddLink?.({
          source,
          target,
          citation_text: masterContext.trim(),
          edition: r.edition || '',
          page: '',
          context: '',
        })
      })
    }
    onQueued?.(toAdd.map((r) => r.title))
    onImportComplete?.(newIds)
    setInjected(true)
    setTimeout(() => { resetAll(); onClose() }, 1100)
  }

  const handleClose = () => { resetAll(); onClose() }
  const goBack = () => { setPhase('input'); setEditingCell(null); setEditingAuthor(null) }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'input' && rawText.trim()) handleAnalyze()
    else if (phase === 'preview' && checked.size > 0 && !injected && !inserting) handleInject()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <form
        onSubmit={handleSubmit}
        className={[
          'w-full rounded-2xl border border-white/10 bg-[rgba(6,5,20,0.98)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] transition-all duration-200',
          phase === 'preview' ? 'max-w-5xl' : 'max-w-4xl',
        ].join(' ')}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {phase === 'preview' && (
              <Button
                type="button"
                onClick={goBack}
                variant="buttonIcon"
                className="mr-0.5"
              >
                <ChevronLeft size={16} />
              </Button>
            )}
            <Zap size={14} className="text-[rgba(140,220,255,0.7)]" />
            <h3 className="font-semibold text-white">Import Magique</h3>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="buttonIcon"
          >
            <X size={15} />
          </Button>
        </div>

        {phase === 'input' && (
          <SmartImportInputPhase
            rawText={rawText}
            setRawText={setRawText}
            masterNode={masterNode}
            setMasterNode={setMasterNode}
            masterContext={masterContext}
            setMasterContext={setMasterContext}
            linkDirection={linkDirection}
            setLinkDirection={setLinkDirection}
            existingNodes={existingNodes}
            authorsMap={authorsMap}
          />
        )}

        {phase === 'preview' && (
          <SmartImportPreviewPhase
            parsed={parsed}
            checked={checked}
            mergedIds={mergedIds}
            editingCell={editingCell}
            editingValue={editingValue}
            setEditingValue={setEditingValue}
            editingAuthor={editingAuthor}
            setEditingAuthor={setEditingAuthor}
            toggleItem={toggleItem}
            commitCellEdit={commitCellEdit}
            setEditingCell={setEditingCell}
            commitAuthorEdit={commitAuthorEdit}
            handleMerge={handleMerge}
            onAddCoAuthor={handleAddCoAuthor}
            onUpdateAxes={handleUpdateAxes}
            masterNode={masterNode}
            linkDirection={linkDirection}
            selectedCount={checked.size}
            injected={injected}
            inserting={inserting}
            handleClose={handleClose}
          />
        )}
      </form>
    </div>
  )
}

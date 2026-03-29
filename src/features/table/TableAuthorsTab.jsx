import { useMemo, useRef, useState } from 'react'
import { BookPlus, Check, Plus, Sparkles, Trash2 } from 'lucide-react'
import { authorName } from '../../authorUtils'
import { INPUT, TD } from './tableConstants'

export default function TableAuthorsTab({
  authors,
  books,
  search = '',
  onAddAuthor,
  onUpdateAuthor,
  onDeleteAuthor,
  onMigrateData,
  onAddBookForAuthor,
}) {
  const [editingCell, setEditingCell] = useState(null)   // { authorId, field }
  const [editingValue, setEditingValue] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState(null)

  const [inputFirstName, setInputFirstName] = useState('')
  const [inputLastName, setInputLastName] = useState('')
  const firstNameRef = useRef(null)

  const legacyCount = books.filter((b) => !b.authorIds?.length && (b.firstName || b.lastName)).length

  const handleMigrate = async () => {
    if (!onMigrateData) return
    setMigrating(true)
    setMigrateResult(null)
    const result = await onMigrateData()
    setMigrating(false)
    setMigrateResult(result)
  }

  const bookCountByAuthor = useMemo(() => {
    const map = new Map()
    books.forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => {
        map.set(aid, (map.get(aid) || 0) + 1)
      })
    })
    return map
  }, [books])

  const filteredAuthors = useMemo(() => {
    const q = search.toLowerCase().trim()
    const sorted = [...authors].sort((a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', 'fr', { sensitivity: 'base' })
    )
    if (!q) return sorted
    return sorted.filter(
      (a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.firstName.toLowerCase().includes(q)
    )
  }, [authors, search])

  const allSelected = filteredAuthors.length > 0 && filteredAuthors.every((a) => selectedIds.has(a.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredAuthors.map((a) => a.id)))
  }

  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleBulkDelete = () => {
    if (!bulkConfirm) { setBulkConfirm(true); return }
    selectedIds.forEach((id) => onDeleteAuthor(id))
    setSelectedIds(new Set())
    setBulkConfirm(false)
  }

  const handleAddAuthor = () => {
    if (!inputLastName.trim()) return
    onAddAuthor({
      id: `auth_${crypto.randomUUID().slice(0, 8)}`,
      type: 'author',
      firstName: inputFirstName.trim(),
      lastName: inputLastName.trim(),
      axes: [],
    })
    setInputFirstName('')
    setInputLastName('')
    setTimeout(() => firstNameRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (!editingCell) return
    const { authorId, field } = editingCell
    const author = authors.find((a) => a.id === authorId)
    if (!author) { setEditingCell(null); return }
    const val = editingValue.trim()
    if (val !== (author[field] || '')) {
      onUpdateAuthor({ ...author, [field]: val })
    }
    setEditingCell(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* Bandeau de migration */}
      {legacyCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[rgba(140,220,255,0.12)] bg-[rgba(140,220,255,0.04)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={13} className="shrink-0 text-[rgba(140,220,255,0.65)]" />
            <p className="text-[0.72rem] text-white/55">
              <span className="font-semibold text-white/80">{legacyCount} ouvrage{legacyCount > 1 ? 's' : ''}</span>
              {' '}utilisent encore l'ancien format (auteur intégré au livre).
              Lance la migration pour créer les entités auteurs correspondantes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleMigrate}
            disabled={migrating}
            className="shrink-0 cursor-pointer rounded-lg border border-[rgba(140,220,255,0.3)] bg-[rgba(140,220,255,0.08)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(140,220,255,0.8)] transition-all hover:bg-[rgba(140,220,255,0.15)] disabled:cursor-wait disabled:opacity-40"
          >
            {migrating ? 'Migration…' : 'Migrer les données'}
          </button>
        </div>
      )}

      {/* Résultat de la migration */}
      {migrateResult && (
        <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(0,255,135,0.12)] bg-[rgba(0,255,135,0.04)] px-5 py-2.5">
          <Check size={12} className="shrink-0 text-[#00FF87]" />
          <p className="text-[0.72rem] text-[rgba(0,255,135,0.8)]">
            Migration terminée — {migrateResult.newAuthors} auteur{migrateResult.newAuthors > 1 ? 's' : ''} créé{migrateResult.newAuthors > 1 ? 's' : ''},
            {' '}{migrateResult.updatedBooks} ouvrage{migrateResult.updatedBooks > 1 ? 's' : ''} mis à jour.
          </p>
        </div>
      )}

      {/* Barre de sélection */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/[0.015] px-5 py-2">
          <span className="font-mono text-[0.72rem] text-white/45">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            onBlur={() => setBulkConfirm(false)}
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
              bulkConfirm
                ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
                : 'border-[rgba(255,70,70,0.22)] text-[rgba(255,90,90,0.55)] hover:bg-[rgba(255,70,70,0.07)]',
            ].join(' ')}
          >
            <Trash2 size={11} />
            {bulkConfirm ? `Confirmer (${selectedIds.size})` : `Supprimer (${selectedIds.size})`}
          </button>
          <button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setBulkConfirm(false) }}
            className="cursor-pointer text-[0.7rem] text-white/25 hover:text-white/60"
          >
            Annuler
          </button>
        </div>
      )}

      {authors.length === 0 && legacyCount === 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-[0.75rem] text-white/22">Aucun auteur·ice</p>
        </div>
      )}

      {filteredAuthors.length === 0 && authors.length > 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="font-mono text-[0.75rem] text-white/22">Aucun résultat pour « {search} »</p>
        </div>
      )}

      {filteredAuthors.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-[rgba(4,6,20,0.98)]">
              <tr className="border-b border-white/6">
                <th className="w-9 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={[
                      'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                      allSelected ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                        : someSelected ? 'border-[rgba(0,255,135,0.38)] bg-[rgba(0,255,135,0.07)] text-[rgba(0,255,135,0.55)]'
                        : 'border-white/14 text-transparent hover:border-white/28',
                    ].join(' ')}
                  >
                    <Check size={9} />
                  </button>
                </th>
                <th className="min-w-[140px] px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
                  Nom
                </th>
                <th className="min-w-[140px] px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
                  Prénom
                </th>
                <th className="w-20 px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
                  Ouvrages
                </th>
                <th className="w-24 px-3 py-2.5" />
              </tr>

              {/* Ligne d'ajout */}
              <tr className="border-b border-[rgba(140,220,255,0.1)] bg-[rgba(140,220,255,0.02)]">
                <td className="px-3 py-1.5 text-center">
                  <Plus size={11} className="text-[rgba(140,220,255,0.35)]" />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={INPUT}
                    placeholder="Nom *"
                    value={inputLastName}
                    onChange={(e) => setInputLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    ref={firstNameRef}
                    className={INPUT}
                    placeholder="Prénom"
                    value={inputFirstName}
                    onChange={(e) => setInputFirstName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                  />
                </td>
                <td />
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={handleAddAuthor}
                    disabled={!inputLastName.trim()}
                    className="shrink-0 cursor-pointer rounded-md border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] px-2 py-1 text-[0.65rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    + Ajouter
                  </button>
                </td>
              </tr>
            </thead>

            <tbody>
              {filteredAuthors.map((author, i) => {
                const isSelected = selectedIds.has(author.id)
                const isEditFirst = editingCell?.authorId === author.id && editingCell?.field === 'firstName'
                const isEditLast = editingCell?.authorId === author.id && editingCell?.field === 'lastName'
                const bookCount = bookCountByAuthor.get(author.id) || 0

                return (
                  <tr
                    key={author.id}
                    className={[
                      'group border-b border-white/4 transition-colors',
                      isSelected ? 'bg-[rgba(0,255,135,0.025)]' : i % 2 === 0 ? 'bg-white/[0.003]' : '',
                      'hover:bg-white/2.5',
                    ].join(' ')}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleRow(author.id)}
                        className={[
                          'flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border transition-all',
                          isSelected
                            ? 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                            : 'border-white/14 text-transparent hover:border-white/28',
                        ].join(' ')}
                      >
                        <Check size={9} />
                      </button>
                    </td>

                    {/* Nom */}
                    <td className={TD}>
                      {isEditLast ? (
                        <input
                          autoFocus
                          className={INPUT}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingCell(null)
                          }}
                        />
                      ) : (
                        <span
                          className="block min-h-[1.2em] cursor-text px-0.5 hover:text-white"
                          onClick={() => {
                            setEditingCell({ authorId: author.id, field: 'lastName' })
                            setEditingValue(author.lastName || '')
                          }}
                        >
                          {author.lastName || <span className="text-white/18">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Prénom */}
                    <td className={TD}>
                      {isEditFirst ? (
                        <input
                          autoFocus
                          className={INPUT}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingCell(null)
                          }}
                        />
                      ) : (
                        <span
                          className="block min-h-[1.2em] cursor-text px-0.5 text-white/55 hover:text-white"
                          onClick={() => {
                            setEditingCell({ authorId: author.id, field: 'firstName' })
                            setEditingValue(author.firstName || '')
                          }}
                        >
                          {author.firstName || <span className="text-white/18">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Compte ouvrages */}
                    <td className="px-3 py-2">
                      <span className="font-mono text-[0.75rem] tabular-nums text-white/35">
                        {bookCount || <span className="text-white/18">—</span>}
                      </span>
                    </td>

                    {/* Ajouter un ouvrage */}
                    <td className="px-3 py-2 text-right">
                      {onAddBookForAuthor && (
                        <button
                          type="button"
                          title={`Ajouter un ouvrage pour ${authorName(author)}`}
                          onClick={() => onAddBookForAuthor(author)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/8 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white/22 opacity-0 transition-all group-hover:opacity-100 hover:border-[rgba(140,220,255,0.35)] hover:text-[rgba(140,220,255,0.7)]"
                        >
                          <BookPlus size={10} /> Ouvrage
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

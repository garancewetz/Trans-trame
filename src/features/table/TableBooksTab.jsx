import { Check, Link2, Plus } from 'lucide-react'
import { authorName } from '../../authorUtils'
import { INPUT, TD } from './tableConstants'
import { AxisDots, AuthorPicker, TH } from './TableSubcomponents'

export default function TableBooksTab({
  sortedNodes,
  search,
  nodes,
  allSelected,
  someSelected,
  toggleAll,
  toggleRow,
  selectedIds,
  sortCol,
  sortDir,
  handleNodeSort,
  titleInputRef,
  inputTitle,
  setInputTitle,
  inputFirstName,
  setInputFirstName,
  inputLastName,
  setInputLastName,
  inputYear,
  setInputYear,
  inputAxes,
  setInputAxes,
  stickyAuthor,
  setStickyAuthor,
  handleAddBookRow,
  editingCell,
  editingValue,
  setEditingValue,
  commitNodeEdit,
  setEditingCell,
  editingAuthor,
  setEditingAuthor,
  commitAuthorEdit,
  linkCountByNode,
  onUpdateBook,
  onLastEdited,
  setTab,
  setLinkSourceNode,
  setLinkCheckedIds,
}) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-[rgba(4,6,20,0.98)]">
          <tr className="border-b border-white/6">
            <th className="w-9 px-3 py-2.5">
              <button
                onClick={toggleAll}
                type="button"
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
            <TH col="title" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort} className="min-w-[200px]">
              Titre
            </TH>
            <TH col="lastName" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort}>
              Auteur·ice
            </TH>
            <TH col="year" activeCol={sortCol} dir={sortDir} onSort={handleNodeSort} className="w-20">
              Année
            </TH>
            <th className="w-40 px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Axes
            </th>
            <th className="w-20 px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/32">
              Liens
            </th>
          </tr>

          <tr className="border-b border-[rgba(140,220,255,0.1)] bg-[rgba(140,220,255,0.02)]">
            <td className="px-3 py-1.5 text-center">
              <Plus size={11} className="text-[rgba(140,220,255,0.35)]" />
            </td>
            <td className="px-2 py-1.5">
              <input
                ref={titleInputRef}
                className={INPUT}
                placeholder="Titre *"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookRow()}
              />
            </td>
            <td className="px-2 py-1.5">
              <AuthorPicker
                nodes={nodes}
                firstName={inputFirstName}
                setFirstName={setInputFirstName}
                lastName={inputLastName}
                setLastName={setInputLastName}
              />
            </td>
            <td className="px-2 py-1.5">
              <input
                className={INPUT}
                type="number"
                placeholder="1984"
                value={inputYear}
                onChange={(e) => setInputYear(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookRow()}
              />
            </td>
            <td className="px-3 py-1.5">
              <div className="flex items-center gap-2.5">
                <AxisDots axes={inputAxes} onChange={setInputAxes} />
                <button
                  type="button"
                  title={stickyAuthor ? 'Auteur·ice conservé·e' : 'Garder auteur·ice après ajout'}
                  onClick={() => setStickyAuthor((v) => !v)}
                  className={[
                    'shrink-0 cursor-pointer rounded-md border px-1.5 py-0.5 text-[0.6rem] font-semibold transition-all',
                    stickyAuthor
                      ? 'border-[rgba(0,255,135,0.4)] text-[rgba(0,255,135,0.7)]'
                      : 'border-white/10 text-white/22 hover:text-white/50',
                  ].join(' ')}
                >
                  📌
                </button>
                <button
                  type="button"
                  onClick={handleAddBookRow}
                  disabled={!inputTitle.trim() || !inputLastName.trim()}
                  className="shrink-0 cursor-pointer rounded-md border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] px-2 py-1 text-[0.65rem] font-semibold text-[rgba(140,220,255,0.75)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  + Ajouter
                </button>
              </div>
            </td>
            <td />
          </tr>
        </thead>

        <tbody>
          {sortedNodes.map((node, i) => {
            const isSelected = selectedIds.has(node.id)
            const isEditTitle = editingCell?.nodeId === node.id && editingCell?.field === 'title'
            const isEditYear = editingCell?.nodeId === node.id && editingCell?.field === 'year'
            const isEditAuthor = editingAuthor?.nodeId === node.id
            return (
              <tr
                key={node.id}
                className={[
                  'group border-b border-white/[0.04] transition-colors',
                  isSelected ? 'bg-[rgba(0,255,135,0.025)]' : i % 2 === 0 ? 'bg-white/[0.003]' : '',
                  'hover:bg-white/[0.025]',
                ].join(' ')}
              >
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleRow(node.id)}
                    type="button"
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
                <td className={TD}>
                  {isEditTitle ? (
                    <input autoFocus className={INPUT} value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
                      onBlur={commitNodeEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                    />
                  ) : (
                    <span className="cursor-text px-0.5 hover:text-white"
                      onClick={() => { setEditingCell({ nodeId: node.id, field: 'title' }); setEditingValue(node.title) }}>
                      {node.title}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {isEditAuthor ? (
                    <div
                      className="flex gap-1"
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) commitAuthorEdit() }}
                    >
                      <input
                        autoFocus
                        className={INPUT}
                        placeholder="Prénom"
                        value={editingAuthor.firstName}
                        onChange={(e) => setEditingAuthor((prev) => ({ ...prev, firstName: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitAuthorEdit(); if (e.key === 'Escape') setEditingAuthor(null) }}
                      />
                      <input
                        className={INPUT}
                        placeholder="Nom"
                        value={editingAuthor.lastName}
                        onChange={(e) => setEditingAuthor((prev) => ({ ...prev, lastName: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitAuthorEdit(); if (e.key === 'Escape') setEditingAuthor(null) }}
                      />
                    </div>
                  ) : (
                    <span
                      className="block min-h-[1.2em] w-full cursor-text px-0.5 text-white/42 hover:text-white"
                      onClick={() => setEditingAuthor({ nodeId: node.id, firstName: node.firstName || '', lastName: node.lastName || '' })}
                    >
                      {authorName(node) || <span className="text-white/18">—</span>}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {isEditYear ? (
                    <input autoFocus className={INPUT} type="number" value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)} onFocus={(e) => e.target.select()}
                      onBlur={commitNodeEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitNodeEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                    />
                  ) : (
                    <span className="cursor-text tabular-nums px-0.5 hover:text-white"
                      onClick={() => { setEditingCell({ nodeId: node.id, field: 'year' }); setEditingValue(String(node.year || '')) }}>
                      {node.year || <span className="text-white/18">—</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <AxisDots
                    axes={node.axes || []}
                    onChange={(newAxes) => { onUpdateBook({ ...node, axes: newAxes }); onLastEdited?.(node.id) }}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    title="Voir / ajouter des liens pour cet ouvrage"
                    onClick={() => {
                      setTab('links')
                      setLinkSourceNode(node)
                      setLinkCheckedIds(new Set())
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[0.7rem] text-white/45 transition-all hover:border-[rgba(140,220,255,0.35)] hover:bg-[rgba(140,220,255,0.07)] hover:text-[rgba(140,220,255,0.8)]"
                  >
                    {linkCountByNode.get(node.id) ?? 0}
                    <Link2 size={10} className="shrink-0" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sortedNodes.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-[0.75rem] text-white/22">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun ouvrage'}
          </p>
        </div>
      )}
    </div>
  )
}

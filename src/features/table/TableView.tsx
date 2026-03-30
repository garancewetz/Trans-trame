import { useEffect, useMemo, useRef, useState } from 'react'
import { bookAuthorDisplay, buildAuthorsMap } from '../../authorUtils'
import { resolveLinks } from './resolveLinks'
import TableTopbar from './TableTopbar'
import TableBooksTab from './TableBooksTab'
import TableLinksTab from './TableLinksTab'
import TableAuthorsTab from './TableAuthorsTab'
import TableFooter from './TableFooter'
import TableMergeModal from './TableMergeModal'
import TableOrphanModal from './TableOrphanModal'
import TableDedupeModal from './TableDedupeModal'
import SmartImportModal from './SmartImportModal'

export default function TableView({
  nodes,
  links,
  authors,
  onAddBook,
  onAddLink,
  onUpdateBook,
  onDeleteBook,
  onUpdateLink,
  onDeleteLink,
  onMergeBooks,
  onAddAuthor,
  onUpdateAuthor,
  onDeleteAuthor,
  onMigrateData,
  onClose,
  onLastEdited,
  initialTab = 'books',
  initialLinkSourceId = null,
  onImportComplete,
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    queueMicrotask(() => setVisible(true))
  }, [])

  const [tab, setTab] = useState(initialTab)

  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('lastName')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editingCell, setEditingCell] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [addedQueue, setAddedQueue] = useState([])

  const [inputTitle, setInputTitle] = useState('')
  const [inputAuthorIds, setInputAuthorIds] = useState([])
  const [inputYear, setInputYear] = useState('')
  const [inputAxes, setInputAxes] = useState([])
  const [stickyAuthor, setStickyAuthor] = useState(false)
  const titleInputRef = useRef(null)

  const [mergeModal, setMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)

  const [authorSearch, setAuthorSearch] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkSourceNode, setLinkSourceNode] = useState(
    () => (initialLinkSourceId ? nodes.find((n) => n.id === initialLinkSourceId) ?? null : null)
  )
  const [checklistSearch, setChecklistSearch] = useState('')
  const [linkCheckedIds, setLinkCheckedIds] = useState(new Set())
  const [editingLink, setEditingLink] = useState(null)
  const [editingLinkValue, setEditingLinkValue] = useState('')
  const [deletingLinkId, setDeletingLinkId] = useState(null)

  const [orphanModal, setOrphanModal] = useState(false)
  const [orphanConfirm, setOrphanConfirm] = useState(false)

  const [dedupeModal, setDedupeModal] = useState(false)
  const [dedupeConfirm, setDedupeConfirm] = useState(false)

  const [smartImportModal, setSmartImportModal] = useState(false)

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const linkCountByNode = useMemo(() => {
    const counts = new Map()
    links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      counts.set(srcId, (counts.get(srcId) || 0) + 1)
      counts.set(tgtId, (counts.get(tgtId) || 0) + 1)
    })
    return counts
  }, [links])

  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return nodes
    return nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q) ||
        String(n.year || '').includes(q)
    )
  }, [nodes, search, authorsMap])

  const sortedNodes = useMemo(
    () =>
      [...filteredNodes].sort((a, b) => {
        let va, vb
        switch (sortCol) {
          case 'title': va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break
          case 'lastName': va = bookAuthorDisplay(a, authorsMap).toLowerCase(); vb = bookAuthorDisplay(b, authorsMap).toLowerCase(); break
          case 'year': va = a.year || 0; vb = b.year || 0; break
          default: va = ''; vb = ''
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      }),
    [filteredNodes, sortCol, sortDir, authorsMap]
  )

  const allSelected = sortedNodes.length > 0 && sortedNodes.every((n) => selectedIds.has(n.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const mergeNodes = useMemo(() => {
    if (selectedIds.size !== 2) return []
    return nodes.filter((n) => selectedIds.has(n.id))
  }, [nodes, selectedIds])

  const resolvedLinks = useMemo(() => resolveLinks(links, nodes), [links, nodes])

  const existingTargetIds = useMemo(() => {
    if (!linkSourceNode) return new Set()
    const srcId = linkSourceNode.id
    const set = new Set()
    links.forEach((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      if (s === srcId) set.add(t)
    })
    return set
  }, [links, linkSourceNode])

  const checklistNodes = useMemo(() => {
    if (!linkSourceNode) return []
    const q = checklistSearch.toLowerCase().trim()
    return nodes
      .filter((n) => n.id !== linkSourceNode.id)
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q)
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [nodes, linkSourceNode, checklistSearch, authorsMap])

  const newLinksCount = useMemo(
    () => [...linkCheckedIds].filter((id) => !existingTargetIds.has(id)).length,
    [linkCheckedIds, existingTargetIds]
  )

  const filteredLinks = useMemo(() => {
    const q = linkSearch.toLowerCase().trim()
    if (!q) return resolvedLinks
    return resolvedLinks.filter(
      (l) =>
        (l.sourceNode?.title || '').toLowerCase().includes(q) ||
        (l.targetNode?.title || '').toLowerCase().includes(q) ||
        bookAuthorDisplay(l.sourceNode || {}, authorsMap).toLowerCase().includes(q) ||
        ((l.citation_text || l.context || '')).toLowerCase().includes(q)
    )
  }, [resolvedLinks, linkSearch])

  const groupedLinks = useMemo(() => {
    const groups = new Map()
    filteredLinks.forEach((link) => {
      if (!groups.has(link._srcId)) {
        groups.set(link._srcId, { sourceNode: link.sourceNode, links: [] })
      }
      groups.get(link._srcId).links.push(link)
    })
    return Array.from(groups.values()).sort((a, b) =>
      (a.sourceNode?.title || '').localeCompare(b.sourceNode?.title || '')
    )
  }, [filteredLinks])

  const orphans = useMemo(() => {
    const linked = new Set()
    links.forEach((l) => {
      linked.add(typeof l.source === 'object' ? l.source.id : l.source)
      linked.add(typeof l.target === 'object' ? l.target.id : l.target)
    })
    return nodes.filter((n) => !linked.has(n.id))
  }, [nodes, links])

  const duplicateGroups = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
    const map = new Map()
    nodes.forEach((n) => {
      const key = `${norm(n.title)}|||${norm(bookAuthorDisplay(n, authorsMap))}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(n)
    })
    return Array.from(map.values()).filter((g) => g.length > 1)
  }, [nodes, authorsMap])

  const handleNodeSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedNodes.map((n) => n.id)))
  }

  const revealBookLine = (bookId) => {
    if (!bookId) return
    setTab('books')
    setSelectedIds(new Set([bookId]))
    // Le DOM du tab "books" n'est pas encore monté : attendre un tour de rendu.
    setTimeout(() => {
      const el = document.querySelector(`[data-book-row-id="${bookId}"]`)
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }, 50)
  }

  const commitNodeEdit = () => {
    if (!editingCell) return
    const { nodeId, field } = editingCell
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) { setEditingCell(null); return }
    let val = editingValue.trim()
    if (field === 'year') {
      const p = parseInt(val)
      val = isNaN(p) ? node.year : p
    }
    if (String(val) !== String(node[field] ?? '')) {
      onUpdateBook({ ...node, [field]: val })
      onLastEdited?.(nodeId)
    }
    setEditingCell(null)
  }

  const handleBulkDelete = () => {
    if (!bulkDeleteConfirm) { setBulkDeleteConfirm(true); return }
    selectedIds.forEach((id) => onDeleteBook(id))
    setSelectedIds(new Set())
    setBulkDeleteConfirm(false)
  }

  const handleAddBookRow = () => {
    if (!inputTitle.trim()) return
    onAddBook({
      id: crypto.randomUUID(),
      title: inputTitle.trim(),
      authorIds: inputAuthorIds,
      year: parseInt(inputYear) || null,
      axes: inputAxes,
      description: '',
    })
    setAddedQueue((prev) => [inputTitle.trim(), ...prev].slice(0, 5))
    setInputTitle('')
    setInputYear('')
    setInputAxes([])
    if (!stickyAuthor) setInputAuthorIds([])
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleConfirmMerge = () => {
    if (!mergeKeepId || mergeNodes.length !== 2) return
    if (!mergeConfirm) { setMergeConfirm(true); return }
    const fromNode = mergeNodes.find((n) => n.id !== mergeKeepId)
    if (fromNode) {
      onMergeBooks(fromNode.id, mergeKeepId)
    }
    setMergeModal(false)
    setMergeKeepId(null)
    setMergeConfirm(false)
    setSelectedIds(new Set())
  }

  const toggleChecklist = (id) => {
    if (existingTargetIds.has(id)) return
    setLinkCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTisser = () => {
    if (!linkSourceNode || newLinksCount === 0) return
    linkCheckedIds.forEach((id) => {
      if (existingTargetIds.has(id) || id === linkSourceNode.id) return
      onAddLink({ source: linkSourceNode.id, target: id, citation_text: '', edition: '', page: '', context: '' })
    })
    setLinkCheckedIds(new Set())
  }

  const commitLinkEdit = () => {
    if (!editingLink) return
    onUpdateLink(editingLink.id, { [editingLink.field]: editingLinkValue.trim() })
    setEditingLink(null)
  }

  const handleCleanOrphans = () => {
    if (!orphanConfirm) { setOrphanConfirm(true); return }
    orphans.forEach((n) => onDeleteBook(n.id))
    setOrphanModal(false)
    setOrphanConfirm(false)
  }

  const handleCleanDupes = () => {
    if (!dedupeConfirm) { setDedupeConfirm(true); return }
    const richness = (n) => [n.firstName, n.lastName, n.year, n.description].filter(Boolean).length
    duplicateGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => richness(b) - richness(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => onMergeBooks(from.id, keep.id))
    })
    setDedupeModal(false)
    setDedupeConfirm(false)
  }

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col bg-[rgba(4,6,20,0.99)] backdrop-blur-xl',
        'transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      ].join(' ')}
    >
      <TableTopbar
        onClose={onClose}
        tab={tab}
        setTab={setTab}
        nodes={nodes}
        links={links}
        authors={authors}
        search={search}
        setSearch={setSearch}
        linkSearch={linkSearch}
        setLinkSearch={setLinkSearch}
        authorSearch={authorSearch}
        setAuthorSearch={setAuthorSearch}
        selectedIds={selectedIds}
        orphans={orphans}
        setOrphanModal={setOrphanModal}
        setOrphanConfirm={setOrphanConfirm}
        duplicateGroups={duplicateGroups}
        setDedupeModal={setDedupeModal}
        setDedupeConfirm={setDedupeConfirm}
        onSmartImport={() => setSmartImportModal(true)}
      />

      {tab === 'books' && (
        <TableBooksTab
          sortedNodes={sortedNodes}
          search={search}
          nodes={nodes}
          authors={authors}
          allSelected={allSelected}
          someSelected={someSelected}
          toggleAll={toggleAll}
          toggleRow={toggleRow}
          selectedIds={selectedIds}
          sortCol={sortCol}
          sortDir={sortDir}
          handleNodeSort={handleNodeSort}
          titleInputRef={titleInputRef}
          inputTitle={inputTitle}
          setInputTitle={setInputTitle}
          inputAuthorIds={inputAuthorIds}
          setInputAuthorIds={setInputAuthorIds}
          onAddAuthor={onAddAuthor}
          inputYear={inputYear}
          setInputYear={setInputYear}
          inputAxes={inputAxes}
          setInputAxes={setInputAxes}
          stickyAuthor={stickyAuthor}
          setStickyAuthor={setStickyAuthor}
          handleAddBookRow={handleAddBookRow}
          editingCell={editingCell}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          commitNodeEdit={commitNodeEdit}
          setEditingCell={setEditingCell}
          linkCountByNode={linkCountByNode}
          onUpdateBook={onUpdateBook}
          onLastEdited={onLastEdited}
          handleBulkDelete={handleBulkDelete}
          bulkDeleteConfirm={bulkDeleteConfirm}
          setBulkDeleteConfirm={setBulkDeleteConfirm}
          clearSelection={() => setSelectedIds(new Set())}
          mergeNodes={mergeNodes}
          setMergeKeepId={setMergeKeepId}
          setMergeConfirm={setMergeConfirm}
          setMergeModal={setMergeModal}
          setTab={setTab}
          setLinkSourceNode={setLinkSourceNode}
          setLinkCheckedIds={setLinkCheckedIds}
        />
      )}

      {tab === 'authors' && (
        <TableAuthorsTab
          authors={authors}
          books={nodes}
          search={authorSearch}
          onAddAuthor={onAddAuthor}
          onUpdateAuthor={onUpdateAuthor}
          onDeleteAuthor={onDeleteAuthor}
          onMigrateData={onMigrateData}
          onAddBookForAuthor={(author) => {
            setInputAuthorIds([author.id])
            setStickyAuthor(true)
            setTab('books')
            setTimeout(() => titleInputRef.current?.focus(), 50)
          }}
        />
      )}

      {tab === 'links' && (
        <TableLinksTab
          nodes={nodes}
          authorsMap={authorsMap}
          linkSourceNode={linkSourceNode}
          setLinkSourceNode={setLinkSourceNode}
          setLinkCheckedIds={setLinkCheckedIds}
          checklistSearch={checklistSearch}
          setChecklistSearch={setChecklistSearch}
          checklistNodes={checklistNodes}
          existingTargetIds={existingTargetIds}
          linkCheckedIds={linkCheckedIds}
          toggleChecklist={toggleChecklist}
          newLinksCount={newLinksCount}
          handleTisser={handleTisser}
          groupedLinks={groupedLinks}
          linkSearch={linkSearch}
          editingLink={editingLink}
          editingLinkValue={editingLinkValue}
          setEditingLinkValue={setEditingLinkValue}
          setEditingLink={setEditingLink}
          commitLinkEdit={commitLinkEdit}
          deletingLinkId={deletingLinkId}
          setDeletingLinkId={setDeletingLinkId}
          onDeleteLink={onDeleteLink}
          onRevealBookLine={revealBookLine}
        />
      )}

      <TableFooter tab={tab} addedQueue={addedQueue} />

      <TableMergeModal
        mergeModal={mergeModal}
        mergeNodes={mergeNodes}
        nodes={nodes}
        authorsMap={authorsMap}
        mergeKeepId={mergeKeepId}
        setMergeKeepId={setMergeKeepId}
        setMergeConfirm={setMergeConfirm}
        mergeConfirm={mergeConfirm}
        handleConfirmMerge={handleConfirmMerge}
        setMergeModal={setMergeModal}
      />

      <TableOrphanModal
        orphanModal={orphanModal}
        orphans={orphans}
        authorsMap={authorsMap}
        handleCleanOrphans={handleCleanOrphans}
        orphanConfirm={orphanConfirm}
        setOrphanModal={setOrphanModal}
        setOrphanConfirm={setOrphanConfirm}
      />

      <TableDedupeModal
        dedupeModal={dedupeModal}
        duplicateGroups={duplicateGroups}
        handleCleanDupes={handleCleanDupes}
        dedupeConfirm={dedupeConfirm}
        setDedupeModal={setDedupeModal}
        setDedupeConfirm={setDedupeConfirm}
      />

      <SmartImportModal
        open={smartImportModal}
        onClose={() => setSmartImportModal(false)}
        existingNodes={nodes}
        existingAuthors={authors}
        authorsMap={authorsMap}
        onAddBook={onAddBook}
        onAddAuthor={onAddAuthor}
        onAddLink={onAddLink}
        onUpdateBook={onUpdateBook}
        onQueued={(titles) => setAddedQueue((prev) => [...titles, ...prev].slice(0, 5))}
        onImportComplete={onImportComplete}
      />
    </div>
  )
}

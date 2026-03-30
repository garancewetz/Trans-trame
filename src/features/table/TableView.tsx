import { useEffect, useMemo, useState } from 'react'
import { bookAuthorDisplay, buildAuthorsMap } from '@/lib/authorUtils'
import { resolveLinks } from './resolveLinks'
import TableTopbar from './TableTopbar'
import TableBooksTab from './tabs/BooksTab'
import TableAuthorsTab from './tabs/AuthorsTab'
import TableLinksTab from './tabs/LinksTab'
import TableFooter from './TableFooter'
import TableOrphanModal from './TableOrphanModal'
import TableDedupeModal from './TableDedupeModal'
import TableAuthorDedupeModal from './TableAuthorDedupeModal'
import SmartImportModal from './SmartImportModal'
import type { Author, AuthorId, Book, BookId, Link } from '@/domain/types'

function maybeNodeId(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const anyV = v as { id?: unknown }
    if (typeof anyV.id === 'string') return anyV.id
  }
  return null
}

export type TableViewProps = {
  nodes: Book[]
  links: Link[]
  authors: Author[]
  onAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title'>) => void | PromiseLike<unknown>
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => unknown
  onUpdateBook?: (book: Book) => unknown
  onDeleteBook?: (bookId: BookId) => unknown
  onUpdateLink?: (linkId: string, updatedFields: Partial<Link>) => unknown
  onDeleteLink?: (linkId: string) => unknown
  onMergeBooks?: (fromNodeId: BookId, intoNodeId: BookId) => unknown
  onAddAuthor?: (author: Author) => unknown
  onUpdateAuthor?: (author: Author) => unknown
  onDeleteAuthor?: (authorId: AuthorId) => unknown
  onMigrateData?: () => Promise<{ newAuthors: number; updatedBooks: number } | null> | { newAuthors: number; updatedBooks: number } | null
  onClose?: () => void
  onLastEdited?: (bookId: BookId) => void
  initialTab?: 'books' | 'authors' | 'links'
  initialLinkSourceId?: BookId | null
  onImportComplete?: (nodeIds: BookId[]) => void
}

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
}: TableViewProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    queueMicrotask(() => setVisible(true))
  }, [])

  const [tab, setTab] = useState<TableViewProps['initialTab']>(initialTab)
  const [focusAuthorId, setFocusAuthorId] = useState<AuthorId | null>(null)
  const [focusBookId, setFocusBookId] = useState<BookId | null>(null)
  const [booksPrefill, setBooksPrefill] = useState<null | { nonce: string; authorId: AuthorId }>(null)

  const [search, setSearch] = useState('')
  const [addedQueue, setAddedQueue] = useState<string[]>([])

  const [authorSearch, setAuthorSearch] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkSourceNode, setLinkSourceNode] = useState<Book | null>(
    () => (initialLinkSourceId ? nodes.find((n) => n.id === initialLinkSourceId) ?? null : null),
  )

  const focusAuthorInAuthorsTab = (authorId: AuthorId) => {
    if (!authorId) return
    setAuthorSearch('')
    setFocusAuthorId(authorId)
    setTab('authors')
  }
  const [checklistSearch, setChecklistSearch] = useState('')
  const [linkCheckedIds, setLinkCheckedIds] = useState<Set<BookId>>(new Set())
  const [editingLink, setEditingLink] = useState<null | { id: string; field: string }>(null)
  const [editingLinkValue, setEditingLinkValue] = useState('')
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)

  const [orphanModal, setOrphanModal] = useState(false)
  const [orphanConfirm, setOrphanConfirm] = useState(false)

  const [dedupeModal, setDedupeModal] = useState(false)
  const [dedupeConfirm, setDedupeConfirm] = useState(false)

  const [authorDedupeModal, setAuthorDedupeModal] = useState(false)
  const [authorDedupeConfirm, setAuthorDedupeConfirm] = useState(false)

  const [smartImportModal, setSmartImportModal] = useState(false)

  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])

  const resolvedLinks = useMemo(() => resolveLinks(links, nodes), [links, nodes])

  const existingTargetIds = useMemo(() => {
    if (!linkSourceNode) return new Set<BookId>()
    const srcId = linkSourceNode.id
    const set = new Set<BookId>()
    links.forEach((l) => {
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (s === srcId && t) set.add(t)
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
  }, [resolvedLinks, linkSearch, authorsMap])

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
      const s = maybeNodeId(l.source)
      const t = maybeNodeId(l.target)
      if (s) linked.add(s)
      if (t) linked.add(t)
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

  const authorDuplicateGroups = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
    const map = new Map()
    ;(authors || []).forEach((a) => {
      const key = `${norm(a.lastName)}|||${norm(a.firstName)}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    })
    return Array.from(map.values()).filter((g) => g.length > 1)
  }, [authors])

  const mergeAuthors = (fromAuthorId: AuthorId, keepAuthorId: AuthorId) => {
    if (!fromAuthorId || !keepAuthorId || fromAuthorId === keepAuthorId) return
    ;(nodes || []).forEach((b) => {
      const ids = b.authorIds || []
      if (!ids.includes(fromAuthorId)) return
      const next = Array.from(new Set(ids.map((id) => (id === fromAuthorId ? keepAuthorId : id))))
      onUpdateBook?.({ ...b, authorIds: next })
    })
    onDeleteAuthor?.(fromAuthorId)
  }

  const revealBookLine = (bookId) => {
    if (!bookId) return
    setTab('books')
    setFocusBookId(bookId)
    // Le DOM du tab "books" n'est pas encore monté : attendre un tour de rendu.
    setTimeout(() => {
      const el = document.querySelector(`[data-book-row-id="${bookId}"]`)
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }, 50)
  }
  
  const openLinksForBook = (node) => {
    if (!node) return
    setTab('links')
    setLinkSourceNode(node)
    setLinkCheckedIds(new Set<BookId>())
    setChecklistSearch('')
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
      onAddLink?.({
        source: linkSourceNode.id,
        target: id,
        citation_text: '',
        edition: '',
        page: '',
        context: '',
      })
    })
    setLinkCheckedIds(new Set<BookId>())
  }

  const commitLinkEdit = () => {
    if (!editingLink) return
    const linkId = editingLink.id
    if (editingLink.field !== '_expand') {
      onUpdateLink?.(linkId, { [editingLink.field]: editingLinkValue.trim() })
    }
    // Revenir au panneau étendu après l'édition d'un champ
    setEditingLink({ id: linkId, field: '_expand' })
  }

  const handleCleanOrphans = () => {
    if (!orphanConfirm) { setOrphanConfirm(true); return }
    orphans.forEach((n) => onDeleteBook?.(n.id))
    setOrphanModal(false)
    setOrphanConfirm(false)
  }

  const handleCleanDupes = () => {
    if (!dedupeConfirm) { setDedupeConfirm(true); return }
    const richness = (n) => [n.firstName, n.lastName, n.year, n.description].filter(Boolean).length
    duplicateGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => richness(b) - richness(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => onMergeBooks?.(from.id, keep.id))
    })
    setDedupeModal(false)
    setDedupeConfirm(false)
  }

  const handleMergeAuthorDupes = () => {
    if (!authorDedupeConfirm) { setAuthorDedupeConfirm(true); return }
    const score = (a) => {
      const filled = [a.firstName, a.lastName].filter(Boolean).length
      let booksCount = 0
      ;(nodes || []).forEach((b) => {
        if ((b.authorIds || []).includes(a.id)) booksCount += 1
      })
      return filled * 10 + booksCount
    }
    authorDuplicateGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => score(b) - score(a))
      const keep = sorted[0]
      sorted.slice(1).forEach((from) => mergeAuthors(from.id, keep.id))
    })
    setAuthorDedupeModal(false)
    setAuthorDedupeConfirm(false)
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
        selectedIds={new Set()}
        orphans={orphans}
        setOrphanModal={setOrphanModal}
        setOrphanConfirm={setOrphanConfirm}
        duplicateGroups={duplicateGroups}
        authorDuplicateGroups={authorDuplicateGroups}
        setDedupeModal={setDedupeModal}
        setDedupeConfirm={setDedupeConfirm}
        setAuthorDedupeModal={setAuthorDedupeModal}
        setAuthorDedupeConfirm={setAuthorDedupeConfirm}
        onSmartImport={() => setSmartImportModal(true)}
      />

      {tab === 'books' && (
        <TableBooksTab
          key={booksPrefill?.nonce || 'books'}
          nodes={nodes}
          links={links}
          search={search}
          authors={authors}
          onAddAuthor={onAddAuthor}
          onAddBook={onAddBook}
          onUpdateBook={onUpdateBook}
          onDeleteBook={onDeleteBook}
          onLastEdited={onLastEdited}
          onMergeBooks={onMergeBooks}
          onBookAdded={(title) => setAddedQueue((prev) => [title, ...prev].slice(0, 5))}
          onOpenLinksForBook={openLinksForBook}
          onFocusAuthorInAuthorsTab={focusAuthorInAuthorsTab}
          initialAuthorIds={booksPrefill?.authorId ? [booksPrefill.authorId] : []}
          autoFocusTitle={Boolean(booksPrefill?.authorId)}
          focusBookId={focusBookId}
        />
      )}

      {tab === 'authors' && (
        <TableAuthorsTab
          authors={authors}
          books={nodes}
          search={authorSearch}
          onAddAuthor={(a) => onAddAuthor?.(a)}
          onUpdateAuthor={(a) => onUpdateAuthor?.(a)}
          onDeleteAuthor={(id) => onDeleteAuthor?.(id)}
          onMigrateData={onMigrateData}
          onMergeAuthors={mergeAuthors}
          onAddBookForAuthor={(author) => {
            // Préremplit le champ d'ajout + la recherche topbar.
            const authorLabel = bookAuthorDisplay({ authorIds: [author.id] }, authorsMap)
            setSearch(authorLabel)
            setBooksPrefill({ nonce: crypto.randomUUID(), authorId: author.id })
            setTab('books')
          }}
          focusAuthorId={focusAuthorId}
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
          onDeleteLink={(id) => onDeleteLink?.(id)}
          onRevealBookLine={revealBookLine}
        />
      )}

      <TableFooter tab={tab} addedQueue={addedQueue} />

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

      <TableAuthorDedupeModal
        open={authorDedupeModal}
        duplicateGroups={authorDuplicateGroups}
        handleMergeDupes={handleMergeAuthorDupes}
        confirm={authorDedupeConfirm}
        setOpen={setAuthorDedupeModal}
        setConfirm={setAuthorDedupeConfirm}
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

import clsx from 'clsx'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'
import { useTableUi } from '@/core/TableUiContext'
import { TableTopbar } from './TableTopbar'
import { TableFilterBar } from './TableFilterBar'
import { BooksTab as TableBooksTab } from './tabs/BooksTab'
import { AuthorsTab as TableAuthorsTab } from './tabs/AuthorsTab'
import { LinksTab as TableLinksTab } from './tabs/LinksTab'
import { HistoryTab as TableHistoryTab } from './tabs/HistoryTab'
import { TableOrphanModal } from './TableOrphanModal'
import { TableDedupeModal } from './TableDedupeModal'
import { TableAuthorDedupeModal } from './TableAuthorDedupeModal'
import { AuthorOrphanReconcileModal } from './AuthorOrphanReconcileModal'
import { AIOrphanReconcileModal } from './AIOrphanReconcileModal'
import { SmartImportModal } from './SmartImportModal'

import type { TableViewProps } from '../tableViewTypes'
import type { Book } from '@/types/domain'
import { useTableViewController } from '../hooks/useTableViewController'

function tableInitialTabFromState(tab: string): NonNullable<TableViewProps['initialTab']> {
  if (tab === 'authors' || tab === 'links' || tab === 'history') return tab
  return 'books'
}

export function TableView() {
  const { books, links, authors } = useAppData()
  const {
    handleAddBook,
    handleAddLink,
    handleUpdateBook,
    handleDeleteBook,
    handleDeleteLink,
    handleUpdateLink,
    handleMergeBooks,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleMigrateData,
  } = useAppMutations()

  const {
    selectedNode,
    selectNode,
    setSelectedNode,
    setSelectedLink,
    setLinkContextNode,
    setPanelTab,
  } = useSelection()

  const {
    setTableMode,
    tableInitialTab,
    setTableInitialTab,
    tableLinkSourceId,
    setTableLinkSourceId,
    tableFocusBookId,
    lastEditedNodeId,
    setLastEditedNodeId,
    setFlashNodeIds,
  } = useTableUi()

  const c = useTableViewController({
    nodes: books,
    links,
    authors,
    onAddLink: handleAddLink,
    onUpdateBook: handleUpdateBook,
    onDeleteBook: handleDeleteBook,
    onUpdateLink: handleUpdateLink,
    onMergeBooks: handleMergeBooks,
    onDeleteAuthor: handleDeleteAuthor,
    initialTab: tableInitialTabFromState(tableInitialTab),
    initialLinkSourceId: tableLinkSourceId,
    initialFocusBookId: tableFocusBookId,
  })

  const onClose = () => {
    setTableMode(false)
    setTableInitialTab('books')
    setTableLinkSourceId(null)
    if (lastEditedNodeId) {
      const node = books.find((n) => n.id === lastEditedNodeId)
      if (node) {
        setSelectedNode(node)
        setPanelTab('details')
      }
      setLastEditedNodeId(null)
    }
  }

  const onLastEdited = (nodeId: string) => setLastEditedNodeId(nodeId)

  const onImportComplete = (nodeIds: string[]) => {
    const ids = new Set(nodeIds)
    setFlashNodeIds(ids)
    setTimeout(() => setFlashNodeIds(null), 4000)
  }

  const openBookInSidePanel = (bookId: string) => {
    const node = books.find((n) => n.id === bookId)
    if (!node) return
    setSelectedLink(null)
    setLinkContextNode(null)
    selectNode(node)
    setTableMode(false)
  }

  const onUpdateBookWithTracking = (n: Book) => {
    handleUpdateBook(n)
    setLastEditedNodeId(n.id)
  }

  const onDeleteBookWithCleanup = (nodeId: string) => {
    handleDeleteBook(nodeId)
    if (selectedNode?.id === nodeId) setSelectedNode(null)
  }

  const onMergeBooksWithCleanup = (fromNodeId: string, intoNodeId: string) => {
    const merged = handleMergeBooks(fromNodeId, intoNodeId)
    if (!merged) return
    const intoNode = books.find((n) => n.id === intoNodeId)
    setSelectedNode(intoNode || null)
    setPanelTab('details')
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-bg-overlay/99 backdrop-blur-xl',
        'transition-all duration-200',
        c.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      )}
    >
      <TableTopbar
        onClose={onClose}
        tab={c.tab}
        setTab={c.setTab}
        nodes={books}
        links={links}
        authors={authors}
        setSearch={c.setSearch}
        setLinkSearch={c.setLinkSearch}
        setAuthorSearch={c.setAuthorSearch}
        onSmartImport={() => c.setSmartImportModal(true)}
      />

      {c.tab !== 'history' && (
        <TableFilterBar
          tab={c.tab}
          search={c.search}
          setSearch={c.setSearch}
          authorSearch={c.authorSearch}
          setAuthorSearch={c.setAuthorSearch}
          linkSearch={c.linkSearch}
          setLinkSearch={c.setLinkSearch}
          nodes={books}
          authors={authors}
          links={links}
          authorsMap={c.authorsMap}
        />
      )}

      {c.tab === 'books' && (
        <TableBooksTab
          key={c.booksPrefill?.nonce || 'books'}
          nodes={books}
          links={links}
          search={c.search}
          authors={authors}
          onAddAuthor={handleAddAuthor}
          onAddBook={handleAddBook}
          onUpdateBook={onUpdateBookWithTracking}
          onDeleteBook={onDeleteBookWithCleanup}
          onLastEdited={onLastEdited}
          onMergeBooks={onMergeBooksWithCleanup}
          onOpenLinksForBook={c.openLinksForBook}
          onFocusAuthorInAuthorsTab={c.focusAuthorInAuthorsTab}
          onOpenWorkDetail={openBookInSidePanel}
          initialAuthorIds={c.booksPrefill?.authorId ? [c.booksPrefill.authorId] : []}
          autoFocusTitle={Boolean(c.booksPrefill?.authorId)}
          duplicateGroups={c.duplicateGroups}
          onOpenDedupeModal={() => { c.setDedupeModal(true); c.setDedupeConfirm(false) }}
          orphans={c.orphans}
          onOpenOrphanModal={() => { c.setOrphanModal(true); c.setOrphanConfirm(false) }}
          onOpenAIOrphanReconcile={() => c.setAiOrphanReconcileModal(true)}
          showAIReconcile={c.orphanedAuthors.length > 0 || c.booksWithoutAuthors.length > 0}
          todoCount={c.todoCount}
          focusBookId={c.initialFocusBookId}
        />
      )}

      {c.tab === 'authors' && (
        <TableAuthorsTab
          authors={authors}
          books={books}
          search={c.authorSearch}
          onAddAuthor={(a) => handleAddAuthor?.(a)}
          onUpdateAuthor={(a) => handleUpdateAuthor?.(a)}
          onDeleteAuthor={(id) => handleDeleteAuthor?.(id)}
          onMigrateData={handleMigrateData}
          onMergeAuthors={c.mergeAuthors}
          onAddBookForAuthor={(author) => {
            const authorLabel = bookAuthorDisplay({ authorIds: [author.id] }, c.authorsMap)
            c.setSearch(authorLabel)
            c.setBooksPrefill({ nonce: crypto.randomUUID(), authorId: author.id })
            c.setTab('books')
          }}
          focusAuthorId={c.focusAuthorId}
          authorDuplicateGroups={c.authorDuplicateGroups}
          onOpenAuthorDedupeModal={() => { c.setAuthorDedupeModal(true); c.setAuthorDedupeConfirm(false) }}
          orphanedAuthorCount={c.orphanedAuthors.length}
          onOpenAuthorReconcileModal={() => c.setAuthorReconcileModal(true)}
          onOpenAIOrphanReconcile={() => c.setAiOrphanReconcileModal(true)}
        />
      )}

      {c.tab === 'history' && <TableHistoryTab />}

      {c.tab === 'links' && (
        <TableLinksTab
          nodes={books}
          authorsMap={c.authorsMap}
          linkSourceNode={c.linkSourceNode}
          setLinkSourceNode={c.setLinkSourceNode}
          linkDirection={c.linkDirection}
          setLinkDirection={c.setLinkDirection}
          setLinkCheckedIds={c.setLinkCheckedIds}
          checklistSearch={c.checklistSearch}
          setChecklistSearch={c.setChecklistSearch}
          checklistNodes={c.checklistNodes}
          existingTargetIds={c.existingTargetIds}
          linkCheckedIds={c.linkCheckedIds}
          toggleChecklist={c.toggleChecklist}
          newLinksCount={c.newLinksCount}
          handleTisser={c.handleTisser}
          groupedLinks={c.groupedLinks}
          linkSearch={c.linkSearch}
          editingLink={c.editingLink}
          editingLinkValue={c.editingLinkValue}
          setEditingLinkValue={c.setEditingLinkValue}
          setEditingLink={c.setEditingLink}
          commitLinkEdit={c.commitLinkEdit}
          deletingLinkId={c.deletingLinkId}
          setDeletingLinkId={c.setDeletingLinkId}
          onDeleteLink={(id) => handleDeleteLink?.(id)}
          onOpenWorkDetail={openBookInSidePanel}
          authors={authors}
          onAddAuthor={(a) => handleAddAuthor?.(a)}
          onAddBook={handleAddBook}
          onSmartImportFrom={c.openSmartImportForBook}
        />
      )}

      <TableOrphanModal
        orphanModal={c.orphanModal}
        orphans={c.orphans}
        allNodes={books}
        authorsMap={c.authorsMap}
        handleCleanOrphans={c.handleCleanOrphans}
        orphanConfirm={c.orphanConfirm}
        setOrphanModal={c.setOrphanModal}
        setOrphanConfirm={c.setOrphanConfirm}
        onAddLink={handleAddLink}
      />

      <TableDedupeModal
        dedupeModal={c.dedupeModal}
        duplicateGroups={c.duplicateGroups}
        authors={authors}
        handleCleanDupes={c.handleCleanDupes}
        dedupeConfirm={c.dedupeConfirm}
        setDedupeModal={c.setDedupeModal}
        setDedupeConfirm={c.setDedupeConfirm}
      />

      <TableAuthorDedupeModal
        open={c.authorDedupeModal}
        duplicateGroups={c.authorDuplicateGroups}
        handleMergeDupes={c.handleMergeAuthorDupes}
        nodes={books}
        confirm={c.authorDedupeConfirm}
        setOpen={c.setAuthorDedupeModal}
        setConfirm={c.setAuthorDedupeConfirm}
      />

      <AuthorOrphanReconcileModal
        open={c.authorReconcileModal}
        orphanedAuthors={c.orphanedAuthors}
        books={books}
        authorsMap={c.authorsMap}
        onLinkAuthorToBook={c.linkAuthorToBook}
        onClose={() => c.setAuthorReconcileModal(false)}
      />

      <AIOrphanReconcileModal
        open={c.aiOrphanReconcileModal}
        orphanBooks={c.orphans}
        booksWithoutAuthors={c.booksWithoutAuthors}
        orphanedAuthors={c.orphanedAuthors}
        allBooks={books}
        links={links}
        authorsMap={c.authorsMap}
        onUpdateBook={handleUpdateBook}
        onAddLink={handleAddLink}
        onClose={() => c.setAiOrphanReconcileModal(false)}
      />

      <SmartImportModal
        open={c.smartImportModal}
        onClose={c.closeSmartImport}
        existingNodes={books}
        existingAuthors={authors}
        authorsMap={c.authorsMap}
        onAddBook={handleAddBook}
        onAddAuthor={handleAddAuthor}
        onAddLink={handleAddLink}
        onUpdateBook={handleUpdateBook}
        onImportComplete={onImportComplete}
        initialMasterNode={c.smartImportPrefilledBook}
      />

    </div>
  )
}

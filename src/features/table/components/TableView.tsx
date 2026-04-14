import clsx from 'clsx'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'
import { useTableUi } from '@/core/TableUiContext'
import { TableTopbar } from './TableTopbar'
import { TableFilterBar } from './TableFilterBar'
import { BooksTab as TableBooksTab } from './tabs/BooksTab'
import { AuthorsTab as TableAuthorsTab } from './tabs/AuthorsTab'
import { LinksTab as TableLinksTab } from './tabs/links/LinksTab'
import { HistoryTab as TableHistoryTab } from './tabs/HistoryTab'
import { TableViewModals } from './TableViewModals'

import type { TableViewProps } from '../tableViewTypes'
import { useTableViewController } from '../hooks/useTableViewController'
import { useTableViewCallbacks } from '../hooks/useTableViewCallbacks'

function tableInitialTabFromState(tab: string): NonNullable<TableViewProps['initialTab']> {
  if (tab === 'authors' || tab === 'links' || tab === 'history') return tab
  return 'books'
}

export function TableView() {
  const { books, links, authors } = useAppData()
  const mutations = useAppMutations()
  const selection = useSelection()
  const tableUi = useTableUi()

  const c = useTableViewController({
    nodes: books,
    links,
    authors,
    onAddLink: mutations.handleAddLink,
    onUpdateBook: mutations.handleUpdateBook,
    onDeleteBook: mutations.handleDeleteBook,
    onUpdateLink: mutations.handleUpdateLink,
    onMergeBooks: mutations.handleMergeBooks,
    onDeleteAuthor: mutations.handleDeleteAuthor,
    initialTab: tableInitialTabFromState(tableUi.tableInitialTab),
    initialLinkSourceId: tableUi.tableLinkSourceId,
    initialFocusBookId: tableUi.tableFocusBookId,
  })

  const cb = useTableViewCallbacks({
    books,
    mutations,
    selection,
    tableUi,
    controller: c,
  })

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-bg-overlay/99 backdrop-blur-xl',
        'transition-all duration-200',
        c.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      )}
    >
      <TableTopbar
        onClose={cb.onClose}
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
          onAddAuthor={mutations.handleAddAuthor}
          onAddBook={mutations.handleAddBook}
          onUpdateBook={cb.onUpdateBookWithTracking}
          onDeleteBook={cb.onDeleteBookWithCleanup}
          onLastEdited={cb.onLastEdited}
          onMergeBooks={cb.onMergeBooksWithCleanup}
          onOpenLinksForBook={c.openLinksForBook}
          onFocusAuthorInAuthorsTab={c.focusAuthorInAuthorsTab}
          onOpenWorkDetail={cb.openBookInSidePanel}
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
          onAddAuthor={(a) => mutations.handleAddAuthor?.(a)}
          onUpdateAuthor={(a) => mutations.handleUpdateAuthor?.(a)}
          onDeleteAuthor={(id) => mutations.handleDeleteAuthor?.(id)}
          onMigrateData={mutations.handleMigrateData}
          onMergeAuthors={c.mergeAuthors}
          onAddBookForAuthor={cb.onAddBookForAuthor}
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
          onDeleteLink={(id) => mutations.handleDeleteLink?.(id)}
          onOpenWorkDetail={cb.openBookInSidePanel}
          authors={authors}
          onAddAuthor={(a) => mutations.handleAddAuthor?.(a)}
          onAddBook={mutations.handleAddBook}
          onSmartImportFrom={c.openSmartImportForBook}
        />
      )}

      <TableViewModals
        books={books}
        links={links}
        authors={authors}
        authorsMap={c.authorsMap}
        mutations={mutations}
        onImportComplete={cb.onImportComplete}
        c={c}
      />
    </div>
  )
}

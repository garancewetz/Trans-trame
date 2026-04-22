import { useSearchParams } from 'react-router-dom'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import { useSelection } from '@/core/SelectionContext'
import { useTableUi } from '@/core/TableUiContext'
import { ADMIN_QUERY_KEYS } from '@/common/utils/adminUrl'
import { TableTopbar } from './TableTopbar'
import { TableFilterBar } from './TableFilterBar'
import { BooksTab as TableBooksTab } from './tabs/BooksTab'
import { AuthorsTab as TableAuthorsTab } from './tabs/AuthorsTab'
import { LinksTab as TableLinksTab } from './tabs/links/LinksTab'
import { AdminDrawer } from './AdminDrawer'
import { TableViewModals } from './TableViewModals'

import { useTableViewController } from '../hooks/useTableViewController'
import { useTableViewCallbacks } from '../hooks/useTableViewCallbacks'
import { useAdminUrlState } from '../hooks/useAdminUrlState'

export function TableView() {
  const { books, links, authors, authorNotDuplicatePairs } = useAppData()
  const mutations = useAppMutations()
  const selection = useSelection()
  const tableUi = useTableUi()
  const [searchParams] = useSearchParams()

  const { tab, setTab, drawerTool, setDrawerTool } = useAdminUrlState()

  const c = useTableViewController({
    nodes: books,
    links,
    authors,
    authorNotDuplicatePairs,
    onAddLink: mutations.handleAddLink,
    onAddLinks: mutations.handleAddLinks,
    onUpdateBook: mutations.handleUpdateBook,
    onDeleteBook: mutations.handleDeleteBook,
    onUpdateLink: mutations.handleUpdateLink,
    onAddCitation: mutations.handleAddCitation,
    onUpdateCitation: mutations.handleUpdateCitation,
    onMergeBooks: mutations.handleMergeBooks,
    onDeleteAuthor: mutations.handleDeleteAuthor,
    onMarkAuthorsNotDuplicate: mutations.markAuthorsNotDuplicate,
    tab,
    setTab,
    initialLinkSourceId: searchParams.get(ADMIN_QUERY_KEYS.from),
    initialFocusBookId: searchParams.get(ADMIN_QUERY_KEYS.focus),
  })

  const cb = useTableViewCallbacks({
    books,
    mutations,
    selection,
    tableUi,
    controller: c,
  })

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-bg-overlay/99">
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
        drawerTool={drawerTool}
        setDrawerTool={setDrawerTool}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
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
        </div>

        {drawerTool && (
          <AdminDrawer
            tool={drawerTool}
            onClose={() => setDrawerTool(null)}
            books={books}
            links={links}
            authors={authors}
            authorsMap={c.authorsMap}
            onUpdateBook={cb.onUpdateBookWithTracking}
            onUpdateAuthor={(a) => mutations.handleUpdateAuthor?.(a)}
            onOpenWorkDetail={cb.openBookInSidePanel}
            onFocusAuthorInAuthorsTab={c.focusAuthorInAuthorsTab}
            onOpenAIOrphanReconcile={() => c.setAiOrphanReconcileModal(true)}
          />
        )}
      </div>

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

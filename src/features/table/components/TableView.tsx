import clsx from 'clsx'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { TableTopbar } from './TableTopbar'
import { TableFilterBar } from './TableFilterBar'
import { BooksTab as TableBooksTab } from './tabs/BooksTab'
import { AuthorsTab as TableAuthorsTab } from './tabs/AuthorsTab'
import { LinksTab as TableLinksTab } from './tabs/LinksTab'
import { TableOrphanModal } from './TableOrphanModal'
import { TableDedupeModal } from './TableDedupeModal'
import { TableAuthorDedupeModal } from './TableAuthorDedupeModal'
import { SmartImportModal } from './SmartImportModal'
import type { TableViewProps } from '../tableViewTypes'
import { useTableViewController } from '../hooks/useTableViewController'

export type { TableViewProps } from '../tableViewTypes'

export function TableView(props: TableViewProps) {
  const {
    nodes,
    links,
    authors,
    onAddBook,
    onAddLink,
    onUpdateBook,
    onDeleteBook,
    onDeleteLink,
    onMergeBooks,
    onAddAuthor,
    onUpdateAuthor,
    onDeleteAuthor,
    onMigrateData,
    onClose,
    onLastEdited,
    onImportComplete,
    onFocusBookOnMap,
    onOpenWorkDetail,
  } = props

  const c = useTableViewController(props)

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
        nodes={nodes}
        links={links}
        authors={authors}
        setSearch={c.setSearch}
        setLinkSearch={c.setLinkSearch}
        setAuthorSearch={c.setAuthorSearch}
        onSmartImport={() => c.setSmartImportModal(true)}
      />

      <TableFilterBar
        tab={c.tab}
        search={c.search}
        setSearch={c.setSearch}
        authorSearch={c.authorSearch}
        setAuthorSearch={c.setAuthorSearch}
        linkSearch={c.linkSearch}
        setLinkSearch={c.setLinkSearch}
      />

      {c.tab === 'books' && (
        <TableBooksTab
          key={c.booksPrefill?.nonce || 'books'}
          nodes={nodes}
          links={links}
          search={c.search}
          authors={authors}
          onAddAuthor={onAddAuthor}
          onAddBook={onAddBook}
          onUpdateBook={onUpdateBook}
          onDeleteBook={onDeleteBook}
          onLastEdited={onLastEdited}
          onMergeBooks={onMergeBooks}
          onOpenLinksForBook={c.openLinksForBook}
          onFocusAuthorInAuthorsTab={c.focusAuthorInAuthorsTab}
          onOpenWorkDetail={onOpenWorkDetail}
          initialAuthorIds={c.booksPrefill?.authorId ? [c.booksPrefill.authorId] : []}
          autoFocusTitle={Boolean(c.booksPrefill?.authorId)}
          duplicateGroups={c.duplicateGroups}
          onOpenDedupeModal={() => { c.setDedupeModal(true); c.setDedupeConfirm(false) }}
          orphans={c.orphans}
          onOpenOrphanModal={() => { c.setOrphanModal(true); c.setOrphanConfirm(false) }}
          focusBookId={c.initialFocusBookId}
        />
      )}

      {c.tab === 'authors' && (
        <TableAuthorsTab
          authors={authors}
          books={nodes}
          search={c.authorSearch}
          onAddAuthor={(a) => onAddAuthor?.(a)}
          onUpdateAuthor={(a) => onUpdateAuthor?.(a)}
          onDeleteAuthor={(id) => onDeleteAuthor?.(id)}
          onMigrateData={onMigrateData}
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
        />
      )}

      {c.tab === 'links' && (
        <TableLinksTab
          nodes={nodes}
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
          onDeleteLink={(id) => onDeleteLink?.(id)}
          onFocusBookOnMap={onFocusBookOnMap}
          onOpenWorkDetail={onOpenWorkDetail}
          authors={authors}
          onAddAuthor={(a) => onAddAuthor?.(a)}
          onAddBook={onAddBook}
          onSmartImportFrom={c.openSmartImportForBook}
        />
      )}

      <TableOrphanModal
        orphanModal={c.orphanModal}
        orphans={c.orphans}
        authorsMap={c.authorsMap}
        handleCleanOrphans={c.handleCleanOrphans}
        orphanConfirm={c.orphanConfirm}
        setOrphanModal={c.setOrphanModal}
        setOrphanConfirm={c.setOrphanConfirm}
      />

      <TableDedupeModal
        dedupeModal={c.dedupeModal}
        duplicateGroups={c.duplicateGroups}
        handleCleanDupes={c.handleCleanDupes}
        dedupeConfirm={c.dedupeConfirm}
        setDedupeModal={c.setDedupeModal}
        setDedupeConfirm={c.setDedupeConfirm}
      />

      <TableAuthorDedupeModal
        open={c.authorDedupeModal}
        duplicateGroups={c.authorDuplicateGroups}
        handleMergeDupes={c.handleMergeAuthorDupes}
        confirm={c.authorDedupeConfirm}
        setOpen={c.setAuthorDedupeModal}
        setConfirm={c.setAuthorDedupeConfirm}
      />

      <SmartImportModal
        open={c.smartImportModal}
        onClose={c.closeSmartImport}
        existingNodes={nodes}
        existingAuthors={authors}
        authorsMap={c.authorsMap}
        onAddBook={onAddBook}
        onAddAuthor={onAddAuthor}
        onAddLink={onAddLink}
        onUpdateBook={onUpdateBook}
        onImportComplete={onImportComplete}
        initialMasterNode={c.smartImportPrefilledBook}
      />
    </div>
  )
}

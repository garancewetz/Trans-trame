import type { Book, Link, Author } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { useTableViewController } from '../hooks/useTableViewController'
import type { useAppMutations } from '@/core/AppDataContext'
import { TableOrphanModal } from './TableOrphanModal'
import { TableDedupeModal } from './TableDedupeModal'
import { TableAuthorDedupeModal } from './TableAuthorDedupeModal'
import { AuthorOrphanReconcileModal } from './AuthorOrphanReconcileModal'
import { AIOrphanReconcileModal } from './AIOrphanReconcileModal'
import { SmartImportModal } from './SmartImportModal'

type TableViewModalsProps = {
  books: Book[]
  links: Link[]
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  mutations: ReturnType<typeof useAppMutations>
  onImportComplete: (nodeIds: string[]) => void
  c: ReturnType<typeof useTableViewController>
}

export function TableViewModals({
  books,
  links,
  authors,
  authorsMap,
  mutations,
  onImportComplete,
  c,
}: TableViewModalsProps) {
  return (
    <>
      <TableOrphanModal
        orphanModal={c.orphanModal}
        orphans={c.orphans}
        allNodes={books}
        authorsMap={authorsMap}
        handleCleanOrphans={c.handleCleanOrphans}
        orphanConfirm={c.orphanConfirm}
        setOrphanModal={c.setOrphanModal}
        setOrphanConfirm={c.setOrphanConfirm}
        onAddLinks={mutations.handleAddLinks}
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
        onMarkGroupNotDuplicate={c.handleMarkGroupNotDuplicate}
      />

      <AuthorOrphanReconcileModal
        open={c.authorReconcileModal}
        orphanedAuthors={c.orphanedAuthors}
        books={books}
        authorsMap={authorsMap}
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
        authorsMap={authorsMap}
        onUpdateBook={mutations.handleUpdateBook}
        onAddLink={mutations.handleAddLink}
        onAddLinks={mutations.handleAddLinks}
        onClose={() => c.setAiOrphanReconcileModal(false)}
      />

      <SmartImportModal
        open={c.smartImportModal}
        onClose={c.closeSmartImport}
        existingNodes={books}
        existingAuthors={authors}
        authorsMap={authorsMap}
        onAddBook={mutations.handleAddBook}
        onAddAuthor={mutations.handleAddAuthor}
        onAddLink={mutations.handleAddLink}
        onAddLinks={mutations.handleAddLinks}
        onUpdateBook={mutations.handleUpdateBook}
        onImportComplete={onImportComplete}
        initialMasterNode={c.smartImportPrefilledBook}
      />
    </>
  )
}

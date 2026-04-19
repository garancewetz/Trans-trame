-- ═══════════════════════════════════════════════════════════════════════════════
-- One-shot cleanup: links that point to a soft-deleted (or missing) book.
--
-- Historical cause: deleteBookRowById used to only soft-delete the book row;
-- links touching it were filtered client-side (optimistic) but never persisted
-- to the DB. On refetch, they came back as orphans. The fix in
-- useBookMutations cascades correctly going forward, but the links already in
-- that inconsistent state need a single pass to catch up.
--
-- The UPDATE flows through the audit trigger (trg_links_audit) so each
-- soft-delete gets an activity_log entry and remains rollback-able through
-- the normal history path. created_by will be NULL (no auth.uid() in a
-- migration context) and the entries will show as "Inconnu" in the UI, which
-- is accurate — this was a system cleanup, not a user action.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE links
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND (
    NOT EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = links.source_id
        AND b.deleted_at IS NULL
    )
    OR NOT EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = links.target_id
        AND b.deleted_at IS NULL
    )
  );

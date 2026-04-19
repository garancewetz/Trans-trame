-- ═══════════════════════════════════════════════════════════════════════════════
-- One-shot cleanup: collapse phantom-empty duplicate links on the same
-- (source_id, target_id) couple.
--
-- Historical cause: two insertion paths could both create a link on the same
-- (source, target) couple — (a) smart bibliography import with a real
-- citation_text/page/edition, and (b) orphan reconciliation with Gemini, which
-- always proposes empty citation metadata. The client-side dedup in
-- useLinkMutations.buildAndDedup compares (source, target, citation_text,
-- page, edition) — so a reconciliation-created empty row was NOT seen as a
-- duplicate of the import-created row, and repeated apply passes silently
-- stacked phantom empties. The reconcile-layer guard now in
-- useReconcileState.applySelected skips on endpoint match alone and fixes
-- this going forward, but the rows already in that state need a one-shot
-- pass to catch up.
--
-- What we delete:
--   1. Any row whose (citation_text, page, edition, context) are ALL blank,
--      if another non-deleted row exists on the same (source, target) couple
--      with at least one of those fields filled. The richer sibling is
--      authoritative, the empty one is junk.
--   2. In couples where ALL rows are blank and there are 2+ of them, we keep
--      the oldest (by created_at, id as tiebreak) and soft-delete the rest.
--
-- What we DO NOT touch:
--   - Couples with multiple rows that all carry distinct metadata (e.g.
--     "cite p.12" and "cite p.89" of the same book) — legitimate multi-
--     citation, preserved as-is.
--   - Single empty rows (no duplicate to collapse).
--   - Already soft-deleted rows.
--
-- The UPDATE flows through the audit trigger (trg_links_audit) so each
-- soft-delete gets an activity_log entry. created_by will be NULL (no
-- auth.uid() in a migration context) and entries will show as "Inconnu" in
-- the UI, which is accurate — this was a system cleanup, not a user action.
-- ═══════════════════════════════════════════════════════════════════════════════

WITH scored AS (
  SELECT
    id,
    source_id,
    target_id,
    created_at,
    (CASE WHEN NULLIF(TRIM(COALESCE(citation_text, '')), '') IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN NULLIF(TRIM(COALESCE(page, '')), '') IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN NULLIF(TRIM(COALESCE(edition, '')), '') IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN NULLIF(TRIM(COALESCE(context, '')), '') IS NOT NULL THEN 1 ELSE 0 END
    ) AS richness
  FROM links
  WHERE deleted_at IS NULL
),
-- Phantom empties sitting next to a richer sibling on the same couple.
phantom_empties AS (
  SELECT s.id
  FROM scored s
  WHERE s.richness = 0
    AND EXISTS (
      SELECT 1 FROM scored s2
      WHERE s2.source_id = s.source_id
        AND s2.target_id = s.target_id
        AND s2.richness > 0
    )
),
-- Couples where ALL rows are empty and there are 2+: keep oldest, drop the rest.
all_empty_dups AS (
  SELECT id FROM (
    SELECT
      s.id,
      ROW_NUMBER() OVER (
        PARTITION BY s.source_id, s.target_id
        ORDER BY s.created_at ASC, s.id ASC
      ) AS rn
    FROM scored s
    WHERE s.richness = 0
      AND NOT EXISTS (
        SELECT 1 FROM scored s2
        WHERE s2.source_id = s.source_id
          AND s2.target_id = s.target_id
          AND s2.richness > 0
      )
  ) t
  WHERE rn > 1
)
UPDATE links
SET deleted_at = NOW()
WHERE id IN (
  SELECT id FROM phantom_empties
  UNION
  SELECT id FROM all_empty_dups
);

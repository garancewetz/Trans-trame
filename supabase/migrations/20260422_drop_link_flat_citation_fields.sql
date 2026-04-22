-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop the flat citation fields on `links` (citation_text, edition, page,
-- context). They were kept after 20260418_link_citations_subtable as a
-- rollback safety net while the app code migrated to reading from the
-- `link_citations` subtable. That migration is now complete — every read
-- and write path in the app goes through link_citations.
--
-- Safety net before dropping:
--   The 20260418 migration seeded link_citations from flat fields, but any
--   write to a flat field between then and now (via commitLinkEdit → the old
--   updateLinkRowById({citation_text:…}) path) would NOT have been mirrored
--   into link_citations. Those writes were invisible to the UI anyway (the
--   dbLinkToLink hydration re-sourced from citations[0] on every refetch),
--   but the flat column still held the value. Here we catch any such orphan
--   data before dropping.
--
-- This migration is idempotent: each step is guarded so a re-run after
-- partial failure is safe.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Backfill any orphan citation data from flat fields ──────────────────
--
-- A link contributes a citation row iff:
--   - at least one of its four citation fields is non-blank, AND
--   - it has no live citation child already (adding one would duplicate).
-- We include soft-deleted links too (deleted_at copied through) so a later
-- restore still carries its citation along.

DO $$
DECLARE
  have_citation_text BOOLEAN;
  have_edition       BOOLEAN;
  have_page          BOOLEAN;
  have_context       BOOLEAN;
BEGIN
  SELECT
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'citation_text'),
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'edition'),
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'page'),
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'context')
  INTO have_citation_text, have_edition, have_page, have_context;

  -- If the columns are already gone, skip the backfill entirely (re-run case).
  IF have_citation_text OR have_edition OR have_page OR have_context THEN
    -- We know at least one of the four exists; COALESCE handles any that don't.
    EXECUTE $sql$
      INSERT INTO link_citations (link_id, citation_text, edition, page, context, created_at, created_by, deleted_at)
      SELECT
        l.id,
        COALESCE(l.citation_text, ''),
        COALESCE(l.edition, ''),
        COALESCE(l.page, ''),
        COALESCE(l.context, ''),
        l.created_at,
        l.created_by,
        l.deleted_at
      FROM links l
      WHERE (
           COALESCE(NULLIF(TRIM(l.citation_text), ''), '') <> ''
        OR COALESCE(NULLIF(TRIM(l.edition), ''), '')       <> ''
        OR COALESCE(NULLIF(TRIM(l.page), ''), '')          <> ''
        OR COALESCE(NULLIF(TRIM(l.context), ''), '')       <> ''
      )
      AND NOT EXISTS (
        SELECT 1 FROM link_citations lc
        WHERE lc.link_id = l.id AND lc.deleted_at IS NULL
      );
    $sql$;
  END IF;
END $$;

-- ── 2. Drop the flat columns ───────────────────────────────────────────────

ALTER TABLE links DROP COLUMN IF EXISTS citation_text;
ALTER TABLE links DROP COLUMN IF EXISTS edition;
ALTER TABLE links DROP COLUMN IF EXISTS page;
ALTER TABLE links DROP COLUMN IF EXISTS context;

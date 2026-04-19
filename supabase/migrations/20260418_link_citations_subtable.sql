-- ═══════════════════════════════════════════════════════════════════════════════
-- Decision: one bibliographic edge = one `links` row per (source, target)
-- couple. Multiple citations (different pages, editions, contexts) are children
-- of that single edge, stored in a new `link_citations` subtable. This mirrors
-- the domain model the user articulated: "une bibliographie ne peut avoir
-- qu'une seule œuvre, et si c'est d'autres pages ou d'autres éditions, on peut
-- le rajouter, mais c'est un seul lien."
--
-- What this migration does:
--   1. Creates `link_citations` with the same audit/contribution/RLS pattern
--      as `links` (independent soft-delete, created_by/updated_by, activity
--      log trigger).
--   2. Copies every non-blank citation field from existing `links` rows into
--      `link_citations`. A link whose four citation fields are ALL blank
--      gets zero citation rows — the edge stands on its own.
--   3. Collapses duplicate (source, target) couples: for each couple with
--      multiple non-deleted `links` rows, keeps the OLDEST as canonical,
--      re-parents every citation from siblings to the canonical, and
--      soft-deletes the siblings. Legitimate multi-citation data is
--      preserved because all siblings' citations move to the surviving link.
--   4. Replaces the non-unique `(source_id, target_id)` index with a
--      UNIQUE partial index — from now on, the DB enforces "one link per
--      couple" for every non-deleted row.
--
-- What this migration does NOT do (deliberately):
--   - Drop the flat citation fields on `links` (citation_text, page, edition,
--     context). They stay populated with a copy of the "first" citation as
--     a rollback safety net until the app code switches reads to
--     `link_citations`. A follow-up migration drops them.
--   - Change the orphan-reconciliation guard. It already skips on endpoint
--     match (see useReconcileState.applySelected) — the UNIQUE constraint
--     now enforces this at the DB level too, making the guard a
--     belt-and-suspenders correctness check.
--
-- Rollback story: the flat fields on `links` are still there; drop the unique
-- index and the `link_citations` table to return to the previous state
-- without data loss.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Create link_citations table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS link_citations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id       UUID        NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  citation_text TEXT        NOT NULL DEFAULT '',
  edition       TEXT        NOT NULL DEFAULT '',
  page          TEXT        NOT NULL DEFAULT '',
  context       TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID        REFERENCES auth.users(id),
  updated_by    UUID        REFERENCES auth.users(id),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

-- ── 2. Triggers: contribution stamping + audit log (mirror links) ───────────

DROP TRIGGER IF EXISTS trg_link_citations_contribution ON link_citations;
CREATE TRIGGER trg_link_citations_contribution
  BEFORE INSERT OR UPDATE ON link_citations
  FOR EACH ROW EXECUTE FUNCTION set_contribution_fields();

DROP TRIGGER IF EXISTS trg_link_citations_audit ON link_citations;
CREATE TRIGGER trg_link_citations_audit
  AFTER INSERT OR UPDATE ON link_citations
  FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ── 3. RLS (mirror links: public read when alive, whitelisted writes) ───────

ALTER TABLE link_citations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_citations_select" ON link_citations;
CREATE POLICY "link_citations_select" ON link_citations
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "link_citations_insert" ON link_citations;
CREATE POLICY "link_citations_insert" ON link_citations
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "link_citations_update" ON link_citations;
CREATE POLICY "link_citations_update" ON link_citations
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "link_citations_delete" ON link_citations;
CREATE POLICY "link_citations_delete" ON link_citations
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── 4. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_link_citations_link_id    ON link_citations(link_id);
CREATE INDEX IF NOT EXISTS idx_link_citations_created_by ON link_citations(created_by);

-- ── 5. Data migration: copy citations from existing links ──────────────────
--
-- A link contributes a citation row iff at least one of its four citation
-- fields is non-blank. created_by is carried over so the activity-log story
-- stays consistent (the person who wrote the citation keeps authorship).
-- We include soft-deleted links too — their citations come along with them
-- (link_citations.deleted_at mirrors links.deleted_at so queries joining
-- both tables stay correct after rollback).

INSERT INTO link_citations (link_id, citation_text, edition, page, context, created_at, created_by, deleted_at)
SELECT
  l.id,
  l.citation_text,
  l.edition,
  l.page,
  l.context,
  l.created_at,
  l.created_by,
  l.deleted_at
FROM links l
WHERE COALESCE(NULLIF(TRIM(l.citation_text), ''), '') <> ''
   OR COALESCE(NULLIF(TRIM(l.edition), ''), '')       <> ''
   OR COALESCE(NULLIF(TRIM(l.page), ''), '')          <> ''
   OR COALESCE(NULLIF(TRIM(l.context), ''), '')       <> '';

-- ── 6. Collapse duplicate couples ──────────────────────────────────────────
--
-- After the earlier phantom-empty cleanup (20260418_dedup_phantom_empty_links)
-- most noise is gone, but couples with multiple legitimate non-empty rows
-- still exist. We merge them here: oldest non-deleted link on each couple
-- wins, siblings' citations move to it, siblings soft-deleted.

WITH ranked AS (
  SELECT
    id,
    source_id,
    target_id,
    ROW_NUMBER() OVER (
      PARTITION BY source_id, target_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY source_id, target_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM links
  WHERE deleted_at IS NULL
),
siblings AS (
  SELECT id AS sibling_id, canonical_id
  FROM ranked
  WHERE rn > 1
)
UPDATE link_citations lc
SET link_id = s.canonical_id
FROM siblings s
WHERE lc.link_id = s.sibling_id;

-- Soft-delete sibling links. We recompute `ranked` here rather than reusing
-- the CTE above because the UPDATE above may have committed to the planner's
-- view of things — safer to take a fresh snapshot.
UPDATE links
SET deleted_at = NOW()
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY source_id, target_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM links
    WHERE deleted_at IS NULL
  ) t
  WHERE t.rn > 1
);

-- ── 7. Swap the non-unique index for a UNIQUE partial ──────────────────────
--
-- From this point on, INSERTs on an existing (source, target) couple will
-- fail with a unique-violation, so the app must UPSERT-or-INSERT-citation
-- instead of blindly inserting a new link. The client code is updated in
-- a separate commit.

DROP INDEX IF EXISTS idx_links_source_target;

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_source_target_unique
  ON links (source_id, target_id)
  WHERE deleted_at IS NULL;

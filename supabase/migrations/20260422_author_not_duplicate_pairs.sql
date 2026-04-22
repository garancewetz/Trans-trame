-- ═══════════════════════════════════════════════════════════════════════════════
-- Persist author pairs the user has declared "NOT duplicates".
--
-- Why: the fuzzy dedupe detector in useTableViewDuplicateDerived returns false
-- positives on homonyms (Barbara FRIED vs Barbara CREED — same first name,
-- Levenshtein(FRIED, CREED) = 2). Without a persistent record, the same pair
-- keeps resurfacing at every modal open.
--
-- Design:
--   - One row per rejected pair, with canonical order (author_a_id < author_b_id)
--     so (A,B) and (B,A) can't both exist.
--   - ON DELETE CASCADE on both FKs: if either author is deleted, the row is
--     gone — the pair can't refer to anyone anymore.
--   - Dedicated tiny trigger for created_by stamping. set_contribution_fields
--     from 20260410 also touches updated_by, which this table doesn't have,
--     so reusing it would fail on INSERT.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: authors.id is TEXT in this DB (legacy — predates the UUID convention
-- used by newer tables). FK columns must match that type, while created_by
-- stays UUID because auth.users(id) is UUID.
CREATE TABLE IF NOT EXISTS author_not_duplicate_pairs (
  author_a_id TEXT        NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  author_b_id TEXT        NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id),
  PRIMARY KEY (author_a_id, author_b_id),
  CONSTRAINT author_not_dup_pair_canonical CHECK (author_a_id < author_b_id)
);

CREATE INDEX IF NOT EXISTS idx_author_not_dup_pairs_b ON author_not_duplicate_pairs(author_b_id);

-- ── Trigger: stamp created_by only (no updated_by on this table) ───────────

CREATE OR REPLACE FUNCTION set_author_not_dup_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_not_dup_pairs_created_by ON author_not_duplicate_pairs;
CREATE TRIGGER trg_author_not_dup_pairs_created_by
  BEFORE INSERT ON author_not_duplicate_pairs
  FOR EACH ROW EXECUTE FUNCTION set_author_not_dup_created_by();

-- ── RLS (mirror authors: public read, whitelisted writes) ──────────────────

ALTER TABLE author_not_duplicate_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "author_not_duplicate_pairs_select" ON author_not_duplicate_pairs;
CREATE POLICY "author_not_duplicate_pairs_select" ON author_not_duplicate_pairs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "author_not_duplicate_pairs_insert" ON author_not_duplicate_pairs;
CREATE POLICY "author_not_duplicate_pairs_insert" ON author_not_duplicate_pairs
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "author_not_duplicate_pairs_delete" ON author_not_duplicate_pairs;
CREATE POLICY "author_not_duplicate_pairs_delete" ON author_not_duplicate_pairs
  FOR DELETE TO authenticated
  USING (is_whitelisted());

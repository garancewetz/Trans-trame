-- ── Soft Delete + Audit Log ──────────────────────────────────────────────────
-- 1. Adds deleted_at to books, authors, links for soft delete
-- 2. Updates RLS policies to filter soft-deleted rows
-- 3. Creates activity_log table for full audit trail
-- 4. Creates audit triggers that log every INSERT/UPDATE on entities

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SOFT DELETE COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE books   ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE authors ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE links   ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. UPDATE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── books ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "books_select" ON books;
CREATE POLICY "books_select" ON books
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "books_update" ON books;
CREATE POLICY "books_update" ON books
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "books_delete" ON books;
CREATE POLICY "books_delete" ON books
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── authors ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "authors_select" ON authors;
CREATE POLICY "authors_select" ON authors
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "authors_update" ON authors;
CREATE POLICY "authors_update" ON authors
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "authors_delete" ON authors;
CREATE POLICY "authors_delete" ON authors
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── links ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "links_select" ON links;
CREATE POLICY "links_select" ON links
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "links_update" ON links;
CREATE POLICY "links_update" ON links
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "links_delete" ON links;
CREATE POLICY "links_delete" ON links
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ACTIVITY LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  operation   TEXT NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity     ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_by ON activity_log(created_by);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated
  USING (is_whitelisted());

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER trigger writes.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. AUDIT TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _op         TEXT;
  _old        JSONB := NULL;
  _new        JSONB := NULL;
  _old_data   JSONB;
  _new_data   JSONB;
  _meta_keys  TEXT[] := ARRAY['created_at', 'created_by', 'updated_by', 'deleted_at'];
  _k          TEXT;
  _changed    BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _op  := 'INSERT';
    _new := to_jsonb(NEW);

  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);

    -- Detect soft-delete vs restore vs regular update
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
      _op := 'DELETE';
    ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
      _op := 'RESTORE';
    ELSE
      _op := 'UPDATE';

      -- Skip logging if only meta fields changed (e.g. updated_by from contribution trigger)
      _old_data := _old;
      _new_data := _new;
      FOREACH _k IN ARRAY _meta_keys LOOP
        _old_data := _old_data - _k;
        _new_data := _new_data - _k;
      END LOOP;

      IF _old_data = _new_data THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  INSERT INTO activity_log (entity_type, entity_id, operation, old_values, new_values, created_by)
  VALUES (TG_TABLE_NAME, NEW.id::TEXT, _op, _old, _new, auth.uid());

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. ATTACH AUDIT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_books_audit
  AFTER INSERT OR UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trg_authors_audit
  AFTER INSERT OR UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trg_links_audit
  AFTER INSERT OR UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION log_activity();

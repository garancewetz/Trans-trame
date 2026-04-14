-- ── Contribution tracking ────────────────────────────────────────────────────
-- Adds created_by / updated_by (UUID → auth.users) to books, authors, links.
-- Existing rows are backfilled to garance.wetzel@gmail.com's user id.
-- Triggers auto-populate the columns on INSERT / UPDATE — zero front-end change.

-- ── 1. Add columns (idempotent) ─────────────────────────────────────────────

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE authors
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ── 2. Backfill existing rows with garance.wetzel@gmail.com ─────────────────

DO $$
DECLARE
  _uid UUID;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'garance.wetzel@gmail.com' LIMIT 1;

  IF _uid IS NOT NULL THEN
    UPDATE books   SET created_by = _uid, updated_by = _uid WHERE created_by IS NULL;
    UPDATE authors SET created_by = _uid, updated_by = _uid WHERE created_by IS NULL;
    UPDATE links   SET created_by = _uid, updated_by = _uid WHERE created_by IS NULL;
  END IF;
END $$;

-- ── 3. Trigger function: stamp created_by on INSERT, updated_by on UPDATE ───

CREATE OR REPLACE FUNCTION set_contribution_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- never overwrite the original creator
    NEW.created_by := OLD.created_by;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- ── 4. Attach triggers ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_books_contribution ON books;
CREATE TRIGGER trg_books_contribution
  BEFORE INSERT OR UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_contribution_fields();

DROP TRIGGER IF EXISTS trg_authors_contribution ON authors;
CREATE TRIGGER trg_authors_contribution
  BEFORE INSERT OR UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION set_contribution_fields();

DROP TRIGGER IF EXISTS trg_links_contribution ON links;
CREATE TRIGGER trg_links_contribution
  BEFORE INSERT OR UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION set_contribution_fields();

-- ── 5. Indexes for "show me everything user X contributed" queries ───────────

CREATE INDEX IF NOT EXISTS idx_books_created_by   ON books(created_by);
CREATE INDEX IF NOT EXISTS idx_authors_created_by ON authors(created_by);
CREATE INDEX IF NOT EXISTS idx_links_created_by   ON links(created_by);

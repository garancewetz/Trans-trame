-- ═══════════════════════════════════════════════════════════════════════════════
-- Schema integrity hardening (PR 2 of the "tighten the DB" cleanup):
--
--   1. CHECK on `resources.status` and `authors.status` — align DB with the
--      TS union type (`'warning' | null`). Today all values are NULL, so no
--      data conflicts. Catches typos the moment they hit the API.
--
--   2. CHECK on `links.provenance` — reserve an explicit allow-list:
--      'manual', 'scanner', 'opencitations', 'crossref'. All live data is
--      'manual'; the others are reserved for the parse-references edge fn
--      and the planned OpenCitations/Crossref pipelines.
--
--   3. Audit fields on `resource_authors` junction: `created_at` (stamps
--      all existing rows to NOW() — the true authorship dates are lost but
--      future rows are tracked) and `created_by` via trigger. No `updated_by`
--      because setResourceAuthors does diff-based INSERT/DELETE, never UPDATE.
--
--   4. `resources.import_source_id`: TEXT (no constraint) → UUID FK to
--      `resources(id)` ON DELETE SET NULL. All 289 non-null values are
--      UUID-shaped strings pointing to live resources, so the cast and FK
--      addition succeed without data fixup.
--
--      Semantics: hard-deleting a master resource nulls the provenance
--      marker on its imported children rather than cascading a bulk delete.
--      In practice the app only soft-deletes (deleted_at = NOW()), so this
--      ON DELETE clause is a safety net for manual admin work via Studio.
--
-- Idempotent: every step guarded so a partial re-run is safe.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. CHECK: resources.status + authors.status ────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'resources_status_check' AND table_name = 'resources'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_status_check
      CHECK (status IS NULL OR status IN ('warning'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'authors_status_check' AND table_name = 'authors'
  ) THEN
    ALTER TABLE authors
      ADD CONSTRAINT authors_status_check
      CHECK (status IS NULL OR status IN ('warning'));
  END IF;
END $$;

-- ── 2. CHECK: links.provenance ─────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'links_provenance_check' AND table_name = 'links'
  ) THEN
    ALTER TABLE links
      ADD CONSTRAINT links_provenance_check
      CHECK (provenance IN ('manual', 'scanner', 'opencitations', 'crossref'));
  END IF;
END $$;

-- ── 3. Audit fields on resource_authors ────────────────────────────────────
--
-- PostgreSQL auto-populates NOT NULL DEFAULT columns on existing rows with
-- the default value, so every current association gets created_at = NOW()
-- (which is technically wrong — the real creation time is lost — but it
-- establishes a valid baseline for future editing).

ALTER TABLE resource_authors
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE resource_authors
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Dedicated tiny trigger: stamps created_by from auth.uid() on INSERT only.
-- Cannot reuse set_contribution_fields (from 20260410) — that function
-- touches updated_by, which this table doesn't have.

CREATE OR REPLACE FUNCTION set_resource_authors_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resource_authors_created_by ON resource_authors;
CREATE TRIGGER trg_resource_authors_created_by
  BEFORE INSERT ON resource_authors
  FOR EACH ROW EXECUTE FUNCTION set_resource_authors_created_by();

-- ── 4. import_source_id → UUID FK ──────────────────────────────────────────
--
-- Step a: align column type with resources.id. The column was declared TEXT
-- in 20260415 because the UUID convention wasn't formalized yet. Every live
-- value is a UUID string pointing to an existing resource.

DO $$
DECLARE
  source_type TEXT;
  target_type TEXT;
BEGIN
  SELECT data_type INTO source_type
  FROM information_schema.columns
  WHERE table_name = 'resources' AND column_name = 'import_source_id';

  SELECT data_type INTO target_type
  FROM information_schema.columns
  WHERE table_name = 'resources' AND column_name = 'id';

  IF source_type IS DISTINCT FROM target_type THEN
    IF target_type = 'uuid' THEN
      ALTER TABLE resources
        ALTER COLUMN import_source_id TYPE UUID USING import_source_id::UUID;
    ELSIF target_type = 'text' THEN
      ALTER TABLE resources
        ALTER COLUMN import_source_id TYPE TEXT USING import_source_id::TEXT;
    END IF;
  END IF;
END $$;

-- Step b: add the FK. Named explicitly so future migrations can reference it.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'resources_import_source_id_fkey' AND table_name = 'resources'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_import_source_id_fkey
      FOREIGN KEY (import_source_id) REFERENCES resources(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step c: index the FK column. Also accelerates the "siblings of this
-- import" queries used by the orphan-reconciliation and batch-info UIs.

CREATE INDEX IF NOT EXISTS idx_resources_import_source_id
  ON resources(import_source_id)
  WHERE import_source_id IS NOT NULL;

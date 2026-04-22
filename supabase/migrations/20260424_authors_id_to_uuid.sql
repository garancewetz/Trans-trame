-- ═══════════════════════════════════════════════════════════════════════════════
-- Author ID type migration: TEXT → UUID (the last of the "tighten the DB"
-- cleanup PRs). Aligns `authors.id` with the UUID convention used by every
-- other entity table (resources, links, link_citations, activity_log).
--
-- ─── Pre-flight audit (2026-04-22, 1013 authors) ──────────────────────────
--
--   1001 pure UUID          → direct cast
--      4 `auth_<UUID>`      → strip the 5-char `auth_` prefix, UUID preserved
--      8 `auth_<8hex>`      → fresh UUID generated (no other choice)
--
--   26 + 4 = 30 `resource_authors` rows need their `author_id` remapped.
--   0 rows in `author_not_duplicate_pairs` reference any of the 12.
--   0 rows in `activity_log` reference any of the 12.
--
-- ─── Safety model ─────────────────────────────────────────────────────────
--
--   • Everything runs in one transaction (implicit in supabase migrations).
--     Any ASSERT failure rolls back the whole thing.
--   • Pre-mutation snapshots go into permanent backup tables. If something
--     surfaces days later, we still have the pre-migration state on-disk
--     (drop the backups in a follow-up migration once the dust settles).
--   • Triggers disabled during the bulk UPDATE to prevent the contribution
--     trigger from clobbering `updated_by` on the 12 affected authors. The
--     trigger sets `NEW.updated_by := auth.uid()` unconditionally on UPDATE;
--     running as superuser that would be NULL.
--   • ASSERTs at every step: row counts must match before/after, no FK
--     orphans, no duplicate new IDs, no remnant non-UUID IDs.
--   • Idempotent: a second run on an already-migrated DB is a no-op.
--
-- ─── Open-eyed non-goals ──────────────────────────────────────────────────
--
--   • The 8 short-ID authors (Gay, Dussy, Preciado, Latour, Laqueur, King,
--     Sauer, Barmak) will receive fresh UUIDs. Any external artifact
--     (screenshots, exports, Linear tickets) that names those IDs becomes
--     stale. No user-facing URL references them — verified before migration.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bypass user triggers for the duration of this transaction. Needed so the
-- set_contribution_fields trigger doesn't overwrite updated_by on the
-- remapped authors (its UPDATE branch is unconditional).
SET LOCAL session_replication_role = 'replica';

-- ── 1. Permanent backup snapshots ──────────────────────────────────────────
-- Separate timestamped tables that stay until a follow-up cleanup migration
-- drops them. Gives us an on-disk rollback path that doesn't depend on the
-- Supabase dashboard snapshot.
--
-- RLS: each backup gets ENABLE ROW LEVEL SECURITY with NO policies. That
-- means PostgREST (anon + authenticated keys) sees zero rows, while the
-- service role and direct DB access (migrations, dashboard SQL editor) still
-- read/write freely. This matches the sensitivity of the source `authors`
-- table — without it, these backups would be a silent RLS bypass.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'authors_backup_20260424') THEN
    CREATE TABLE authors_backup_20260424 AS SELECT * FROM authors;
    ALTER TABLE authors_backup_20260424 ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '[uuid-migration] authors backup: % rows',
      (SELECT COUNT(*) FROM authors_backup_20260424);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'resource_authors_backup_20260424') THEN
    CREATE TABLE resource_authors_backup_20260424 AS SELECT * FROM resource_authors;
    ALTER TABLE resource_authors_backup_20260424 ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '[uuid-migration] resource_authors backup: % rows',
      (SELECT COUNT(*) FROM resource_authors_backup_20260424);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'author_not_duplicate_pairs_backup_20260424') THEN
    CREATE TABLE author_not_duplicate_pairs_backup_20260424 AS
      SELECT * FROM author_not_duplicate_pairs;
    ALTER TABLE author_not_duplicate_pairs_backup_20260424 ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '[uuid-migration] author_not_duplicate_pairs backup: % rows',
      (SELECT COUNT(*) FROM author_not_duplicate_pairs_backup_20260424);
  END IF;
END $$;

-- ── 2. Build remap table ───────────────────────────────────────────────────
--
-- Permanent table (not TEMP) so the mapping stays auditable after the
-- migration completes — e.g. "what was the old ID of this author?" 6 months
-- from now. RLS enabled with no policies so it's hidden from the anon key.
--
-- INSERT is only fed if the table is freshly created. On re-run the table
-- already has its 12 rows; we don't re-seed (new_ids must be stable).
--
-- Cast id::TEXT explicitly so the regex operator works whether the column is
-- still TEXT (fresh DB) or already UUID (re-run scenario, remap empty).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'author_id_remap_20260424') THEN
    CREATE TABLE author_id_remap_20260424 (
      old_id TEXT PRIMARY KEY,
      new_id UUID NOT NULL
    );
    ALTER TABLE author_id_remap_20260424 ENABLE ROW LEVEL SECURITY;

    INSERT INTO author_id_remap_20260424 (old_id, new_id)
    SELECT
      id::TEXT,
      CASE
        -- auth_<UUID> : preserve the embedded UUID (strip the 5-char prefix).
        WHEN id::TEXT ~* '^auth_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (SUBSTRING(id::TEXT FROM 6))::UUID
        -- Everything else non-UUID-shaped → fresh UUID.
        ELSE gen_random_uuid()
      END
    FROM authors
    WHERE id::TEXT !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;
END $$;

-- Sanity: we expected 12 rows on the 2026-04-22 snapshot; hard-cap at 100 to
-- catch a runaway (e.g. if an early test hydrated the DB with junk IDs after
-- the audit was done).
DO $$
DECLARE
  remap_count INT;
BEGIN
  SELECT COUNT(*) INTO remap_count FROM author_id_remap_20260424;
  RAISE NOTICE '[uuid-migration] remap table built: % rows to reassign', remap_count;
  IF remap_count > 100 THEN
    RAISE EXCEPTION 'remap count % exceeds safety cap of 100. Aborting.', remap_count;
  END IF;
END $$;

-- No duplicate new IDs (gen_random_uuid collisions are astronomically
-- unlikely, but we're asserting because it's effectively free).
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT new_id, COUNT(*) c FROM author_id_remap_20260424 GROUP BY new_id HAVING COUNT(*) > 1
  ) t;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'duplicate new_ids in remap table (% clashes). Aborting.', dup_count;
  END IF;
END $$;

-- No collision between new_id and an existing pure-UUID author id.
DO $$
DECLARE
  clash_count INT;
BEGIN
  SELECT COUNT(*) INTO clash_count
  FROM author_id_remap_20260424 r
  JOIN authors a ON a.id::TEXT = r.new_id::TEXT
  WHERE a.id::TEXT NOT IN (SELECT old_id FROM author_id_remap_20260424);
  IF clash_count > 0 THEN
    RAISE EXCEPTION 'new_id would collide with existing author (% clashes). Aborting.', clash_count;
  END IF;
END $$;

-- ── 3. Drop FK constraints referencing authors(id) ─────────────────────────
--
-- Needed because PostgreSQL rejects UPDATE on a PK column that's referenced
-- by FKs without ON UPDATE CASCADE. We rebuild the FKs with identical
-- semantics (CASCADE on DELETE) at step 6.

ALTER TABLE resource_authors
  DROP CONSTRAINT IF EXISTS resource_authors_author_id_fkey;

ALTER TABLE author_not_duplicate_pairs
  DROP CONSTRAINT IF EXISTS author_not_duplicate_pairs_author_a_id_fkey;

ALTER TABLE author_not_duplicate_pairs
  DROP CONSTRAINT IF EXISTS author_not_duplicate_pairs_author_b_id_fkey;

-- ── 4. Remap IDs in-place (still TEXT at this point) ───────────────────────

UPDATE authors a
SET id = r.new_id::TEXT
FROM author_id_remap_20260424 r
WHERE a.id::TEXT = r.old_id;

UPDATE resource_authors ra
SET author_id = r.new_id::TEXT
FROM author_id_remap_20260424 r
WHERE ra.author_id::TEXT = r.old_id;

UPDATE author_not_duplicate_pairs p
SET author_a_id = r.new_id::TEXT
FROM author_id_remap_20260424 r
WHERE p.author_a_id::TEXT = r.old_id;

UPDATE author_not_duplicate_pairs p
SET author_b_id = r.new_id::TEXT
FROM author_id_remap_20260424 r
WHERE p.author_b_id::TEXT = r.old_id;

-- Canonical-order invariant on author_not_duplicate_pairs: author_a_id <
-- author_b_id. Lexicographic TEXT and native UUID comparison agree on hex
-- strings, so this stays valid through the cast — but a remap could have
-- swapped which side is smaller. Re-canonicalise any pair that's now out of
-- order by flipping the two columns. (0 rows affected today; guard anyway.)

UPDATE author_not_duplicate_pairs p
SET author_a_id = p.author_b_id, author_b_id = p.author_a_id
WHERE p.author_a_id > p.author_b_id;

-- ── 5. ASSERT: counts preserved, no orphan FK references ───────────────────

DO $$
DECLARE
  pre_authors INT;
  pre_ra      INT;
  pre_pairs   INT;
  now_authors INT;
  now_ra      INT;
  now_pairs   INT;
  orphans     INT;
BEGIN
  SELECT COUNT(*) INTO pre_authors FROM authors_backup_20260424;
  SELECT COUNT(*) INTO pre_ra      FROM resource_authors_backup_20260424;
  SELECT COUNT(*) INTO pre_pairs   FROM author_not_duplicate_pairs_backup_20260424;

  SELECT COUNT(*) INTO now_authors FROM authors;
  SELECT COUNT(*) INTO now_ra      FROM resource_authors;
  SELECT COUNT(*) INTO now_pairs   FROM author_not_duplicate_pairs;

  IF now_authors <> pre_authors THEN
    RAISE EXCEPTION 'authors count changed (% → %). Aborting.', pre_authors, now_authors;
  END IF;
  IF now_ra <> pre_ra THEN
    RAISE EXCEPTION 'resource_authors count changed (% → %). Aborting.', pre_ra, now_ra;
  END IF;
  IF now_pairs <> pre_pairs THEN
    RAISE EXCEPTION 'author_not_duplicate_pairs count changed (% → %). Aborting.', pre_pairs, now_pairs;
  END IF;

  -- Orphan check: every resource_authors.author_id must exist in authors.id.
  SELECT COUNT(*) INTO orphans
  FROM resource_authors ra
  LEFT JOIN authors a ON a.id::TEXT = ra.author_id::TEXT
  WHERE a.id IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'resource_authors has % orphan author_id. Aborting.', orphans;
  END IF;

  SELECT COUNT(*) INTO orphans
  FROM author_not_duplicate_pairs p
  LEFT JOIN authors a ON a.id::TEXT = p.author_a_id::TEXT
  WHERE a.id IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'author_not_duplicate_pairs has % orphan author_a_id. Aborting.', orphans;
  END IF;

  SELECT COUNT(*) INTO orphans
  FROM author_not_duplicate_pairs p
  LEFT JOIN authors a ON a.id::TEXT = p.author_b_id::TEXT
  WHERE a.id IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'author_not_duplicate_pairs has % orphan author_b_id. Aborting.', orphans;
  END IF;

  RAISE NOTICE '[uuid-migration] post-remap counts OK: authors=%, resource_authors=%, pairs=%',
    now_authors, now_ra, now_pairs;
END $$;

-- ── 6. Cast columns to UUID ────────────────────────────────────────────────

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'authors' AND column_name = 'id';
  IF col_type = 'text' THEN
    ALTER TABLE authors ALTER COLUMN id TYPE UUID USING id::UUID;
    RAISE NOTICE '[uuid-migration] authors.id TEXT → UUID';
  END IF;
END $$;

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'resource_authors' AND column_name = 'author_id';
  IF col_type = 'text' THEN
    ALTER TABLE resource_authors ALTER COLUMN author_id TYPE UUID USING author_id::UUID;
    RAISE NOTICE '[uuid-migration] resource_authors.author_id TEXT → UUID';
  END IF;
END $$;

-- For author_not_duplicate_pairs, the CHECK (author_a_id < author_b_id)
-- constraint (named author_not_dup_pair_canonical from migration 20260422)
-- is re-validated by PostgreSQL on every ALTER COLUMN. If we cast a_id
-- first, Postgres tries `UUID < TEXT` while b_id is still TEXT, and fails
-- with "operator does not exist". Workaround: drop the CHECK, cast both
-- columns, re-add the CHECK. UUID < UUID uses native byte comparison which
-- agrees with lexicographic TEXT comparison on hex strings, so the
-- canonical-order invariant still holds after the cast.

ALTER TABLE author_not_duplicate_pairs
  DROP CONSTRAINT IF EXISTS author_not_dup_pair_canonical;

DO $$
DECLARE
  col_a TEXT;
  col_b TEXT;
BEGIN
  SELECT data_type INTO col_a
  FROM information_schema.columns
  WHERE table_name = 'author_not_duplicate_pairs' AND column_name = 'author_a_id';
  SELECT data_type INTO col_b
  FROM information_schema.columns
  WHERE table_name = 'author_not_duplicate_pairs' AND column_name = 'author_b_id';
  IF col_a = 'text' THEN
    ALTER TABLE author_not_duplicate_pairs ALTER COLUMN author_a_id TYPE UUID USING author_a_id::UUID;
  END IF;
  IF col_b = 'text' THEN
    ALTER TABLE author_not_duplicate_pairs ALTER COLUMN author_b_id TYPE UUID USING author_b_id::UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'author_not_dup_pair_canonical'
      AND table_name = 'author_not_duplicate_pairs'
  ) THEN
    ALTER TABLE author_not_duplicate_pairs
      ADD CONSTRAINT author_not_dup_pair_canonical
      CHECK (author_a_id < author_b_id);
  END IF;
END $$;

-- ── 7. Re-ADD FK constraints ───────────────────────────────────────────────
--
-- Hardcoded ON DELETE CASCADE: this matches `author_not_duplicate_pairs`'s
-- explicit declaration (migration 20260422) and is the right behavior for
-- junction tables (deleting an author removes their resource associations
-- and any dedupe-pair memberships).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'resource_authors_author_id_fkey'
      AND table_name = 'resource_authors'
  ) THEN
    ALTER TABLE resource_authors
      ADD CONSTRAINT resource_authors_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'author_not_duplicate_pairs_author_a_id_fkey'
      AND table_name = 'author_not_duplicate_pairs'
  ) THEN
    ALTER TABLE author_not_duplicate_pairs
      ADD CONSTRAINT author_not_duplicate_pairs_author_a_id_fkey
      FOREIGN KEY (author_a_id) REFERENCES authors(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'author_not_duplicate_pairs_author_b_id_fkey'
      AND table_name = 'author_not_duplicate_pairs'
  ) THEN
    ALTER TABLE author_not_duplicate_pairs
      ADD CONSTRAINT author_not_duplicate_pairs_author_b_id_fkey
      FOREIGN KEY (author_b_id) REFERENCES authors(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 8. Final ASSERT: zero non-UUID IDs remain ──────────────────────────────
-- After cast to UUID this is literally impossible (Postgres would have
-- rejected the cast), but asserting makes it explicit. If the column is
-- still TEXT on re-run this would also catch leftover garbage.

DO $$
DECLARE
  leftover INT;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM authors WHERE id::TEXT !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'''
  INTO leftover;
  IF leftover > 0 THEN
    RAISE EXCEPTION 'FINAL CHECK FAILED: % authors still have non-UUID id. Aborting.', leftover;
  END IF;
  RAISE NOTICE '[uuid-migration] DONE. authors.id is now uniformly UUID.';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- books → resources
--
-- Three things happen here:
--   1. books renamed to resources + resource_type TEXT column added (default 'book').
--      Existing rows become type 'book' transparently.
--   2. Legacy first_name / last_name columns dropped from resources. All author
--      relationships already live in book_authors (now resource_authors).
--      One book had no book_authors entry and empty first/last fields — no data
--      lost. See pre-migration query in the commit message for the audit trail.
--   3. book_authors renamed to resource_authors, column book_id → resource_id.
--
-- Rollback: reverse each ALTER in order (add back first_name/last_name as nullable,
-- rename tables back). The data is not recoverable for dropped columns, but
-- first_name/last_name were empty strings on all rows with real linked authors.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. books → resources ────────────────────────────────────────────────────

DROP INDEX IF EXISTS books_last_name_idx;

ALTER TABLE books RENAME TO resources;

ALTER TABLE resources RENAME CONSTRAINT books_pkey              TO resources_pkey;
ALTER TABLE resources RENAME CONSTRAINT books_created_by_fkey   TO resources_created_by_fkey;
ALTER TABLE resources RENAME CONSTRAINT books_updated_by_fkey   TO resources_updated_by_fkey;

ALTER INDEX IF EXISTS books_year_idx       RENAME TO resources_year_idx;
ALTER INDEX IF EXISTS idx_books_created_by RENAME TO idx_resources_created_by;

ALTER TRIGGER trg_books_audit        ON resources RENAME TO trg_resources_audit;
ALTER TRIGGER trg_books_contribution ON resources RENAME TO trg_resources_contribution;

ALTER POLICY allow_all_books ON resources RENAME TO allow_all_resources;
ALTER POLICY books_delete     ON resources RENAME TO resources_delete;
ALTER POLICY books_insert     ON resources RENAME TO resources_insert;
ALTER POLICY books_select     ON resources RENAME TO resources_select;
ALTER POLICY books_update     ON resources RENAME TO resources_update;

-- ── 2. resource_type + drop legacy author columns ───────────────────────────

ALTER TABLE resources ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'book';

ALTER TABLE resources DROP COLUMN first_name;
ALTER TABLE resources DROP COLUMN last_name;

-- ── 3. book_authors → resource_authors ──────────────────────────────────────

ALTER TABLE book_authors RENAME TO resource_authors;
ALTER TABLE resource_authors RENAME COLUMN book_id TO resource_id;

ALTER TABLE resource_authors RENAME CONSTRAINT book_authors_pkey           TO resource_authors_pkey;
ALTER TABLE resource_authors RENAME CONSTRAINT book_authors_book_id_fkey   TO resource_authors_resource_id_fkey;
ALTER TABLE resource_authors RENAME CONSTRAINT book_authors_author_id_fkey TO resource_authors_author_id_fkey;

ALTER INDEX IF EXISTS book_authors_author_id_idx  RENAME TO resource_authors_author_id_idx;
ALTER INDEX IF EXISTS idx_book_authors_author_id  RENAME TO idx_resource_authors_author_id;
ALTER INDEX IF EXISTS idx_book_authors_book_id    RENAME TO idx_resource_authors_resource_id;

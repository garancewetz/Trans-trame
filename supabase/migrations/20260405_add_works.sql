-- Remove old work_id FK and language from books (must happen before dropping works table)
ALTER TABLE books DROP COLUMN IF EXISTS work_id;
ALTER TABLE books DROP COLUMN IF EXISTS language;

-- Clean up old Work entity tables (no longer used)
DROP TABLE IF EXISTS work_authors;
DROP TABLE IF EXISTS works;

-- Add original_title to books for multilingual work grouping.
-- Books sharing the same original_title are treated as translations of one work.
ALTER TABLE books ADD COLUMN IF NOT EXISTS original_title TEXT;

-- Clean up old index
DROP INDEX IF EXISTS idx_books_work_id;

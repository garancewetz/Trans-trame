-- Track which master book (ouvrage) a book was imported for.
-- When a bibliographic import is done for a specific book, all imported items
-- get this field set so we know the import context.

ALTER TABLE books ADD COLUMN IF NOT EXISTS import_source_id TEXT DEFAULT NULL;

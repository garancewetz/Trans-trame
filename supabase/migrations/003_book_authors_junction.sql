-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003 — Table de jonction book_authors (many-to-many)
--
-- Remplace la colonne author_ids TEXT[] sur books par une vraie table
-- relationnelle avec contraintes FK et CASCADE.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Table de jonction ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_authors (
  book_id   TEXT NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

-- ── 2. Index pour lookup par auteur ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS book_authors_author_id_idx ON book_authors(author_id);

-- ── 3. Migrer les données existantes depuis author_ids ────────────────────
INSERT INTO book_authors (book_id, author_id)
SELECT b.id, unnest(b.author_ids)
FROM books b
WHERE array_length(b.author_ids, 1) > 0
ON CONFLICT DO NOTHING;

-- ── 4. Supprimer l'ancienne colonne et son index ─────────────────────────
DROP INDEX IF EXISTS books_author_ids_gin_idx;
ALTER TABLE books DROP COLUMN IF EXISTS author_ids;

-- ── 5. Row Level Security ─────────────────────────────────────────────────
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_book_authors" ON book_authors;
CREATE POLICY "allow_all_book_authors" ON book_authors
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 002 — Table authors + colonne author_ids sur books
--
-- À exécuter dans le SQL Editor de Supabase (dashboard > SQL Editor).
-- Cette migration est non-destructive : les données existantes sont conservées.
-- Après exécution, lancer migrateData() depuis l'app pour peupler author_ids.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Table authors ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
  id         TEXT        PRIMARY KEY,
  first_name TEXT        NOT NULL DEFAULT '',
  last_name  TEXT        NOT NULL DEFAULT '',
  axes       TEXT[]      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Colonne author_ids sur books (tableau d'IDs auteurs) ───────────────
ALTER TABLE books ADD COLUMN IF NOT EXISTS author_ids TEXT[] NOT NULL DEFAULT '{}';

-- ── 3. Index ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS authors_last_name_idx    ON authors(last_name);
CREATE INDEX IF NOT EXISTS books_author_ids_gin_idx ON books USING GIN(author_ids);

-- ── 4. Row Level Security ─────────────────────────────────────────────────
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authors" ON authors;
CREATE POLICY "allow_all_authors" ON authors
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

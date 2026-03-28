-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 001 — Schéma normalisé : tables books + links
--
-- À exécuter dans le SQL Editor de Supabase (dashboard > SQL Editor).
-- ATTENTION : supprime l'ancienne table graph_data et toutes ses données.
-- Exporter vos données avant si nécessaire.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Supprimer l'ancienne table dénormalisée ───────────────────────────────
DROP TABLE IF EXISTS graph_data;

-- ── 1. Table books ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  first_name  TEXT        NOT NULL DEFAULT '',
  last_name   TEXT        NOT NULL DEFAULT '',
  year        INTEGER,
  description TEXT        NOT NULL DEFAULT '',
  axes        TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Table links ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     TEXT        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  target_id     TEXT        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  citation_text TEXT        NOT NULL DEFAULT '',
  edition       TEXT        NOT NULL DEFAULT '',
  page          TEXT        NOT NULL DEFAULT '',
  context       TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Index ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS links_source_id_idx ON links(source_id);
CREATE INDEX IF NOT EXISTS links_target_id_idx ON links(target_id);
CREATE INDEX IF NOT EXISTS books_last_name_idx  ON books(last_name);
CREATE INDEX IF NOT EXISTS books_year_idx        ON books(year);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────
-- RLS activé, avec accès total pour l'utilisateur anon (à restreindre
-- quand une authentification sera mise en place).

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "allow_all_books" ON books;
DROP POLICY IF EXISTS "allow_all_links" ON links;

CREATE POLICY "allow_all_books" ON books
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_links" ON links
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Data fix one-shot : re-lie les 6 auteur·ices orphelin·es à leurs ouvrages
-- co-signés probables, et pose un status='warning' pour relecture humaine.
--
-- À exécuter UNE fois dans le SQL Editor de Supabase (rôle service_role implicite).
-- Précondition : la migration 20260415120000_add_status_field.sql a été appliquée.
--
-- Source du diagnostic : scripts/find-orphan-origins.mjs (croisement created_at +
-- œuvres co-signées canoniques).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RE-LIAISONS book_authors  (insertion idempotente)
-- ─────────────────────────────────────────────────────────────────────────────

-- KAULA H. + WHIPPLE B.  →  "The Science of Orgasm" (2006)
INSERT INTO book_authors (book_id, author_id) VALUES
  ('efc756ab-6729-469c-9ba9-d99757e7acec', '38a2422b-aef0-45f1-9731-1f20a9ffa87e'),  -- KAULA H.
  ('efc756ab-6729-469c-9ba9-d99757e7acec', 'cc619ca9-aa0b-4f3f-b097-4bdde7013502')   -- WHIPPLE B.
ON CONFLICT (book_id, author_id) DO NOTHING;

-- COLEBROOK Claire  →  "Deleuze and Feminist Theory" (2000)
INSERT INTO book_authors (book_id, author_id) VALUES
  ('fb8bd911-4085-4eb0-8bdd-c597d2f2f26e', '33833599-fc36-488e-95cb-9f3e4bd34ec1')
ON CONFLICT (book_id, author_id) DO NOTHING;

-- IZENOUR Steven + BROWN Denise Scott  →  "Learning from Las Vegas" (1972)
INSERT INTO book_authors (book_id, author_id) VALUES
  ('fd72610b-6733-4c3e-afbf-ff45c1e7972a', '211c8e6e-f6f4-4c4e-a038-5c12e0081df1'),  -- IZENOUR
  ('fd72610b-6733-4c3e-afbf-ff45c1e7972a', '5a71d75c-c143-46ff-bcbe-047617f0eabe')   -- BROWN Denise Scott
ON CONFLICT (book_id, author_id) DO NOTHING;

-- ROSE Stephen  →  "Poverty in the American Dream" (1983)
-- (≠ Steven Rose neuroscientifique, à NE PAS confondre)
INSERT INTO book_authors (book_id, author_id) VALUES
  ('5fbe861b-e788-4692-b2c0-0357f7e5149d', '13a4ccdd-c6a1-44ad-aa3f-43eaa073ab26')
ON CONFLICT (book_id, author_id) DO NOTHING;

-- ROSE Stephen  →  "The American Profile Poster" (1986)
-- + retire la liaison erronée Steven Rose (mauvaise attribution)
INSERT INTO book_authors (book_id, author_id) VALUES
  ('4dfe04b8-445c-4c6e-89b2-18932b402b06', '13a4ccdd-c6a1-44ad-aa3f-43eaa073ab26')
ON CONFLICT (book_id, author_id) DO NOTHING;

DELETE FROM book_authors
WHERE book_id   = '4dfe04b8-445c-4c6e-89b2-18932b402b06'
  AND author_id = 'cb4a5d0c-4a28-4d6f-902c-9f89b3ddb8b5';  -- Steven Rose (mauvaise attrib)

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. POSE DU WARNING  (auteur·ices re-liées + ouvrages re-liés)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE authors SET status = 'warning' WHERE id IN (
  '38a2422b-aef0-45f1-9731-1f20a9ffa87e',  -- KAULA H.
  'cc619ca9-aa0b-4f3f-b097-4bdde7013502',  -- WHIPPLE B.
  '33833599-fc36-488e-95cb-9f3e4bd34ec1',  -- COLEBROOK Claire
  '211c8e6e-f6f4-4c4e-a038-5c12e0081df1',  -- IZENOUR Steven
  '5a71d75c-c143-46ff-bcbe-047617f0eabe',  -- BROWN Denise Scott
  '13a4ccdd-c6a1-44ad-aa3f-43eaa073ab26',  -- ROSE Stephen
  'cb4a5d0c-4a28-4d6f-902c-9f89b3ddb8b5'   -- Steven Rose (à vérifier suite à correction de "American Profile Poster")
);

UPDATE books SET status = 'warning' WHERE id IN (
  'efc756ab-6729-469c-9ba9-d99757e7acec',  -- The Science of Orgasm
  'fb8bd911-4085-4eb0-8bdd-c597d2f2f26e',  -- Deleuze and Feminist Theory
  'fd72610b-6733-4c3e-afbf-ff45c1e7972a',  -- Learning from Las Vegas
  '5fbe861b-e788-4692-b2c0-0357f7e5149d',  -- Poverty in the American Dream
  '4dfe04b8-445c-4c6e-89b2-18932b402b06'   -- The American Profile Poster
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VÉRIFICATION  (à exécuter pour contrôler le résultat)
-- ─────────────────────────────────────────────────────────────────────────────

-- Vérifie que chaque orphelin·e a bien au moins 1 ouvrage maintenant
-- SELECT a.last_name, a.first_name, COUNT(ba.book_id) AS book_count
-- FROM authors a
-- LEFT JOIN book_authors ba ON ba.author_id = a.id
-- WHERE a.id IN (
--   '38a2422b-aef0-45f1-9731-1f20a9ffa87e','cc619ca9-aa0b-4f3f-b097-4bdde7013502',
--   '33833599-fc36-488e-95cb-9f3e4bd34ec1','211c8e6e-f6f4-4c4e-a038-5c12e0081df1',
--   '5a71d75c-c143-46ff-bcbe-047617f0eabe','13a4ccdd-c6a1-44ad-aa3f-43eaa073ab26'
-- )
-- GROUP BY a.id, a.last_name, a.first_name;

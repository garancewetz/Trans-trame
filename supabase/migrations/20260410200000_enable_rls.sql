-- ── Whitelist & Profiles ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Anyone can check if their email is whitelisted (needed at login)
DROP POLICY IF EXISTS "allowed_emails_select" ON allowed_emails;
CREATE POLICY "allowed_emails_select" ON allowed_emails
  FOR SELECT USING (true);

-- Only service_role can manage the whitelist (via Supabase dashboard / SQL editor)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── Helper: is the current user whitelisted? ─────────────────────────────────

CREATE OR REPLACE FUNCTION is_whitelisted()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM allowed_emails
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

-- ── books ─────────────────────────────────────────────────────────────────────

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_select" ON books;
CREATE POLICY "books_select" ON books
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "books_insert" ON books;
CREATE POLICY "books_insert" ON books
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "books_update" ON books;
CREATE POLICY "books_update" ON books
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "books_delete" ON books;
CREATE POLICY "books_delete" ON books
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── authors ───────────────────────────────────────────────────────────────────

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authors_select" ON authors;
CREATE POLICY "authors_select" ON authors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "authors_insert" ON authors;
CREATE POLICY "authors_insert" ON authors
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "authors_update" ON authors;
CREATE POLICY "authors_update" ON authors
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "authors_delete" ON authors;
CREATE POLICY "authors_delete" ON authors
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── links ─────────────────────────────────────────────────────────────────────

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "links_select" ON links;
CREATE POLICY "links_select" ON links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "links_insert" ON links;
CREATE POLICY "links_insert" ON links
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "links_update" ON links;
CREATE POLICY "links_update" ON links
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "links_delete" ON links;
CREATE POLICY "links_delete" ON links
  FOR DELETE TO authenticated
  USING (is_whitelisted());

-- ── book_authors ──────────────────────────────────────────────────────────────

ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_authors_select" ON book_authors;
CREATE POLICY "book_authors_select" ON book_authors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "book_authors_insert" ON book_authors;
CREATE POLICY "book_authors_insert" ON book_authors
  FOR INSERT TO authenticated
  WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "book_authors_update" ON book_authors;
CREATE POLICY "book_authors_update" ON book_authors
  FOR UPDATE TO authenticated
  USING (is_whitelisted()) WITH CHECK (is_whitelisted());

DROP POLICY IF EXISTS "book_authors_delete" ON book_authors;
CREATE POLICY "book_authors_delete" ON book_authors
  FOR DELETE TO authenticated
  USING (is_whitelisted());

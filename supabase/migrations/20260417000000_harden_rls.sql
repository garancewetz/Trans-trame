-- Harden RLS: remove public enumeration of allowed_emails and profiles.

-- ── allowed_emails: no public SELECT, replaced by a boolean RPC ──────────────

DROP POLICY IF EXISTS "allowed_emails_select" ON allowed_emails;

-- Boolean lookup avoids exposing the full whitelist. SECURITY DEFINER so it
-- bypasses RLS without granting table-level read to anon.
CREATE OR REPLACE FUNCTION is_email_whitelisted(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM allowed_emails
    WHERE email = lower(trim(check_email))
  );
$$;

GRANT EXECUTE ON FUNCTION is_email_whitelisted(TEXT) TO anon, authenticated;

-- ── profiles: read restricted to authenticated users ─────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

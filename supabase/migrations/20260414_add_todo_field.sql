-- Add a nullable `todo` text field to books and authors.
-- Used to flag items that need manual attention (e.g. missing author, unresolved hint).

ALTER TABLE books ADD COLUMN IF NOT EXISTS todo TEXT DEFAULT NULL;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS todo TEXT DEFAULT NULL;

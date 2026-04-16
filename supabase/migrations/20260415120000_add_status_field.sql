-- Add a nullable `status` text field to books and authors.
-- Conventions :
--   NULL       → état neutre (par défaut)
--   'warning'  → à vérifier manuellement (drapeau amber dans la table)
-- Champ libre TEXT pour rester forward-compatible (autres valeurs futures sans migration).

ALTER TABLE books   ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- Add provenance tracking to links: manual, scanner, opencitations, crossref
ALTER TABLE links ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'manual';

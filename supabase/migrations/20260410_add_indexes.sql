-- Indexes on foreign keys for performant joins and filters at scale (8k+ books)

CREATE INDEX IF NOT EXISTS idx_book_authors_book_id
  ON book_authors (book_id);

CREATE INDEX IF NOT EXISTS idx_book_authors_author_id
  ON book_authors (author_id);

CREATE INDEX IF NOT EXISTS idx_links_source_id
  ON links (source_id);

CREATE INDEX IF NOT EXISTS idx_links_target_id
  ON links (target_id);

-- Composite index for duplicate link detection (source + target)
CREATE INDEX IF NOT EXISTS idx_links_source_target
  ON links (source_id, target_id);

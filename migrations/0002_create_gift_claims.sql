CREATE TABLE IF NOT EXISTS gift_claims (
  campaign TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  receipt TEXT NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT NOT NULL,
  desc TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  quote TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

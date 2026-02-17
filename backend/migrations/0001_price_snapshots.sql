CREATE TABLE IF NOT EXISTS price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  min_price REAL NOT NULL,
  avg_price REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_item_name_captured_at
ON price_snapshots (item_name, captured_at);

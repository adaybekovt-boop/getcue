CREATE TABLE IF NOT EXISTS users (
  telegram_id   INTEGER PRIMARY KEY,
  credits       INTEGER NOT NULL DEFAULT 150,
  total_earned  INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS usage_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id   INTEGER NOT NULL,
  strategy      TEXT NOT NULL,
  credits_spent INTEGER NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS purchase_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id    TEXT,
  telegram_id   INTEGER NOT NULL,
  stars_paid    INTEGER NOT NULL,
  credits_added INTEGER NOT NULL,
  payload       TEXT NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_log_payment_id
ON purchase_log(payment_id)
WHERE payment_id IS NOT NULL;

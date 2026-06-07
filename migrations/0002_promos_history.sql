ALTER TABLE usage_log ADD COLUMN task TEXT;
ALTER TABLE usage_log ADD COLUMN prompt_text TEXT;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id   INTEGER NOT NULL,
  promo_code    TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(telegram_id, promo_code)
);

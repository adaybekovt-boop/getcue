// SQLite database (better-sqlite3, synchronous API).
// DB file path from DB_PATH or ./data/cue.db; the data/ dir is created if missing.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || "./data/cue.db";

// Ensure the parent directory exists.
const dir = path.dirname(dbPath);
fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id   INTEGER PRIMARY KEY,
    credits       INTEGER NOT NULL DEFAULT 150,
    total_earned  INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS usage_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   INTEGER NOT NULL,
    strategy      TEXT NOT NULL,
    credits_spent INTEGER NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id    TEXT,
    telegram_id   INTEGER NOT NULL,
    stars_paid    INTEGER NOT NULL,
    credits_added INTEGER NOT NULL,
    payload       TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS promo_redemptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   INTEGER NOT NULL,
    promo_code    TEXT NOT NULL,
    credits_added INTEGER NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(telegram_id, promo_code)
  );
`);

const purchaseColumns = db.prepare("PRAGMA table_info(purchase_log)").all();
if (!purchaseColumns.some((column) => column.name === "payment_id")) {
  db.exec("ALTER TABLE purchase_log ADD COLUMN payment_id TEXT");
}

// History feature: record the task text and generated prompt per usage entry.
const usageColumns = db.prepare("PRAGMA table_info(usage_log)").all();
if (!usageColumns.some((column) => column.name === "task")) {
  db.exec("ALTER TABLE usage_log ADD COLUMN task TEXT");
}
if (!usageColumns.some((column) => column.name === "prompt_text")) {
  db.exec("ALTER TABLE usage_log ADD COLUMN prompt_text TEXT");
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_log_payment_id
  ON purchase_log(payment_id)
  WHERE payment_id IS NOT NULL;
`);

console.log("Database initialized:", dbPath);

export default db;

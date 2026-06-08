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
    telegram_id          INTEGER PRIMARY KEY,
    credits              INTEGER NOT NULL DEFAULT 150,
    total_earned         INTEGER NOT NULL DEFAULT 0,
    admin_chat_unlocked  INTEGER NOT NULL DEFAULT 0,
    created_at           INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at           INTEGER NOT NULL DEFAULT (strftime('%s','now'))
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

// Persistent admin-chat unlock flag.
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((column) => column.name === "admin_chat_unlocked")) {
  db.exec("ALTER TABLE users ADD COLUMN admin_chat_unlocked INTEGER NOT NULL DEFAULT 0");
}

// Persistent admin-panel unlock flag (activated once via the panel token).
if (!userColumns.some((column) => column.name === "admin_panel_unlocked")) {
  db.exec("ALTER TABLE users ADD COLUMN admin_panel_unlocked INTEGER NOT NULL DEFAULT 0");
}

// Admin multi-chat (chats + messages). One-time switch from any earlier schema:
// if the new admin_chats table is absent, (re)create the pair fresh.
const hasAdminChats = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_chats'")
  .get();
if (!hasAdminChats) {
  db.exec(`
    DROP TABLE IF EXISTS admin_chat_messages;
    DROP TABLE IF EXISTS admin_chat_sessions;

    CREATE TABLE admin_chats (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id  INTEGER NOT NULL,
      title        TEXT NOT NULL DEFAULT 'New chat',
      model        TEXT NOT NULL,
      repo         TEXT,
      repo_context TEXT,
      created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE admin_chat_messages (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id          INTEGER NOT NULL,
      role             TEXT NOT NULL,
      content          TEXT NOT NULL DEFAULT '',
      attachments_json TEXT,
      created_at       INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX idx_admin_chats_tid ON admin_chats(telegram_id, updated_at);
    CREATE INDEX idx_admin_chat_msgs_cid ON admin_chat_messages(chat_id, id);
  `);
}

// /github support: per-chat loaded repo + its fetched code context.
const adminChatCols = db.prepare("PRAGMA table_info(admin_chats)").all();
if (!adminChatCols.some((c) => c.name === "repo")) {
  db.exec("ALTER TABLE admin_chats ADD COLUMN repo TEXT");
}
if (!adminChatCols.some((c) => c.name === "repo_context")) {
  db.exec("ALTER TABLE admin_chats ADD COLUMN repo_context TEXT");
}

// Multi-platform admin chat (Phase 3): per-chat platform + effort. The existing
// `model` column is reused (OpenRouter id when platform='openrouter'; registry
// key 'gpt'/'qwen'/'meta'/'gemini' for groq/gemini). Existing rows are OpenRouter
// chats, so default platform to 'openrouter' (NOT 'groq') so their stored model
// ids keep resolving.
if (!adminChatCols.some((c) => c.name === "platform")) {
  db.exec("ALTER TABLE admin_chats ADD COLUMN platform TEXT NOT NULL DEFAULT 'openrouter'");
}
if (!adminChatCols.some((c) => c.name === "effort")) {
  db.exec("ALTER TABLE admin_chats ADD COLUMN effort TEXT DEFAULT 'high'");
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_log_payment_id
  ON purchase_log(payment_id)
  WHERE payment_id IS NOT NULL;
`);

console.log("Database initialized:", dbPath);

export default db;

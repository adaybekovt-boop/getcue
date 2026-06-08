CREATE TABLE IF NOT EXISTS admin_chats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New chat',
  model       TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id          INTEGER NOT NULL,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT '',
  attachments_json TEXT,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_admin_chats_tid
ON admin_chats(telegram_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_admin_chat_msgs_cid
ON admin_chat_messages(chat_id, id);

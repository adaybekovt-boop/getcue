// Persistent storage for the admin multi-chat app. Each chat has its own model;
// all messages live here (the client no longer holds history). Attachments are
// stored as lightweight metadata (kind + name), never the base64 payload.
import db from "../db/database.js";

const MAX_MESSAGES = 1000;
const MAX_CHATS = 200;
const TITLE_MAX = 60;

const insertChat = db.prepare(
  "INSERT INTO admin_chats (telegram_id, title, model) VALUES (?, ?, ?)"
);
const selectChats = db.prepare(
  `SELECT c.id, c.title, c.model, c.updated_at,
          (SELECT m.content FROM admin_chat_messages m
             WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS preview,
          (SELECT COUNT(*) FROM admin_chat_messages m WHERE m.chat_id = c.id) AS count
   FROM admin_chats c
   WHERE c.telegram_id = ?
   ORDER BY c.updated_at DESC, c.id DESC
   LIMIT ?`
);
const selectChat = db.prepare(
  "SELECT id, telegram_id, title, model FROM admin_chats WHERE id = ?"
);
const touchChatStmt = db.prepare(
  "UPDATE admin_chats SET updated_at = strftime('%s','now') WHERE id = ?"
);
const renameChatStmt = db.prepare(
  "UPDATE admin_chats SET title = ?, updated_at = strftime('%s','now') WHERE id = ?"
);
const setModelStmt = db.prepare(
  "UPDATE admin_chats SET model = ?, updated_at = strftime('%s','now') WHERE id = ?"
);
const deleteChatRow = db.prepare(
  "DELETE FROM admin_chats WHERE id = ? AND telegram_id = ?"
);
const deleteChatMsgs = db.prepare(
  "DELETE FROM admin_chat_messages WHERE chat_id = ?"
);

const insertMsg = db.prepare(
  "INSERT INTO admin_chat_messages (chat_id, role, content, attachments_json) VALUES (?, ?, ?, ?)"
);
const selectMsgs = db.prepare(
  "SELECT role, content, attachments_json, created_at FROM admin_chat_messages WHERE chat_id = ? ORDER BY id ASC LIMIT ?"
);

export function createChat(telegramId, model, title = "New chat") {
  return insertChat.run(Number(telegramId), title.slice(0, TITLE_MAX), model).lastInsertRowid;
}

export function listChats(telegramId) {
  return selectChats.all(Number(telegramId), MAX_CHATS);
}

// Returns the chat row if it belongs to this user, else null.
export function getOwnedChat(telegramId, chatId) {
  const row = selectChat.get(Number(chatId));
  if (!row || row.telegram_id !== Number(telegramId)) return null;
  return row;
}

export function getMessages(chatId) {
  const rows = selectMsgs.all(Number(chatId), MAX_MESSAGES);
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    atts: r.attachments_json ? JSON.parse(r.attachments_json) : [],
    created_at: r.created_at,
  }));
}

export function addMessage(chatId, role, content, attachments) {
  const atts =
    Array.isArray(attachments) && attachments.length
      ? JSON.stringify(attachments)
      : null;
  insertMsg.run(Number(chatId), role, content || "", atts);
}

export function setChatModel(chatId, model) {
  setModelStmt.run(model, Number(chatId));
}

// Bump updated_at; set the title from the first user message if still default.
export function touchChatMaybeTitle(chatId, firstUserText) {
  const row = selectChat.get(Number(chatId));
  if (row && (row.title === "New chat" || !row.title) && firstUserText) {
    renameChatStmt.run(firstUserText.slice(0, TITLE_MAX), Number(chatId));
  } else {
    touchChatStmt.run(Number(chatId));
  }
}

export function deleteChat(telegramId, chatId) {
  deleteChatMsgs.run(Number(chatId));
  deleteChatRow.run(Number(chatId), Number(telegramId));
}

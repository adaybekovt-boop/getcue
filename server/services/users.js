// Credit-based usage store backed by SQLite (better-sqlite3, synchronous API).
import db from "../db/database.js";

// Value per Star must INCREASE with package size (drives average order value up).
export const PACKAGES = [
  { id: "pack_10", stars: 10, credits: 1500, label: "Starter", bonusPct: 0 },
  { id: "pack_25", stars: 25, credits: 4000, label: "Basic", bonusPct: 7 },
  { id: "pack_50", stars: 50, credits: 8500, label: "Standard", bonusPct: 13 },
  { id: "pack_100", stars: 100, credits: 18000, label: "Pro", bonusPct: 20 },
  { id: "pack_200", stars: 200, credits: 40000, label: "Max", bonusPct: 33 },
];

// First paid purchase grants +50% extra credits.
export const FIRST_PURCHASE_BONUS = 0.5;

export const GENERATION_COST = {
  "claude-standard": 50,
  "claude-reasoning": 100,
  "gpt-standard": 50,
  "gpt-reasoning": 100,
  gemini: 50,
  kimi: 50,
};

const DEFAULT_COST = 50;

const selectUser = db.prepare(
  "SELECT credits, total_earned FROM users WHERE telegram_id = ?"
);
const insertUser = db.prepare("INSERT INTO users (telegram_id) VALUES (?)");
const spendCredits = db.prepare(
  "UPDATE users SET credits = credits - ?, updated_at = strftime('%s','now') WHERE telegram_id = ? AND credits >= ?"
);
const logUsage = db.prepare(
  "INSERT INTO usage_log (telegram_id, strategy, credits_spent, task, prompt_text) VALUES (?, ?, ?, ?, ?)"
);
const selectHistory = db.prepare(
  "SELECT id, strategy, task, prompt_text, credits_spent, created_at FROM usage_log WHERE telegram_id = ? ORDER BY created_at DESC, id DESC LIMIT 30"
);
const grantCredits = db.prepare(
  "UPDATE users SET credits = credits + ?, total_earned = total_earned + ?, updated_at = strftime('%s','now') WHERE telegram_id = ?"
);
const logPurchase = db.prepare(
  "INSERT OR IGNORE INTO purchase_log (payment_id, telegram_id, stars_paid, credits_added, payload) VALUES (?, ?, ?, ?, ?)"
);
const selectUnlock = db.prepare(
  "SELECT admin_chat_unlocked FROM users WHERE telegram_id = ?"
);
const setUnlock = db.prepare(
  "UPDATE users SET admin_chat_unlocked = 1, updated_at = strftime('%s','now') WHERE telegram_id = ?"
);
const selectPanelUnlock = db.prepare(
  "SELECT admin_panel_unlocked FROM users WHERE telegram_id = ?"
);
const setPanelUnlock = db.prepare(
  "UPDATE users SET admin_panel_unlocked = 1, updated_at = strftime('%s','now') WHERE telegram_id = ?"
);
const selectPaidPurchase = db.prepare(
  "SELECT 1 FROM purchase_log WHERE telegram_id = ? AND stars_paid > 0 LIMIT 1"
);

const countUsers = db.prepare("SELECT COUNT(*) AS c FROM users");
const sumCredits = db.prepare(
  "SELECT COALESCE(SUM(credits), 0) AS s FROM users"
);
const countGenerations = db.prepare("SELECT COUNT(*) AS c FROM usage_log");
const countToday = db.prepare(
  "SELECT COUNT(*) AS c FROM usage_log WHERE created_at >= strftime('%s','now','start of day')"
);
const sumRevenue = db.prepare(
  "SELECT COALESCE(SUM(stars_paid), 0) AS s FROM purchase_log"
);

export function getUser(telegramId) {
  const id = Number(telegramId);
  const row = selectUser.get(id);
  if (!row) {
    insertUser.run(id);
    return { credits: 150, totalEarned: 0 };
  }
  return { credits: row.credits, totalEarned: row.total_earned };
}

export function getCredits(telegramId) {
  return getUser(telegramId).credits;
}

export function deductCredits(
  telegramId,
  strategy,
  task = null,
  promptText = null,
  costOverride = null
) {
  const id = Number(telegramId);
  const cost = costOverride ?? (GENERATION_COST[strategy] ?? DEFAULT_COST);
  return db.transaction(() => {
    getUser(id); // ensure the row exists
    const result = spendCredits.run(cost, id, cost);
    if (result.changes !== 1) {
      return { ok: false, credits: getCredits(id), required: cost };
    }
    logUsage.run(id, strategy, cost, task ?? null, promptText ?? null);
    return { ok: true, credits: getCredits(id), spent: cost };
  })();
}

// Atomic spend without usage logging (deduct-before-generate pattern).
export function spendCreditsAtomic(telegramId, cost) {
  const id = Number(telegramId);
  getUser(id);
  const result = spendCredits.run(cost, id, cost);
  if (result.changes !== 1) return { ok: false, credits: getCredits(id) };
  return { ok: true };
}

const refundCreditsStmt = db.prepare(
  "UPDATE users SET credits = credits + ?, updated_at = strftime('%s','now') WHERE telegram_id = ?"
);

// Refund a failed generation (provider error after deduction).
export function refundCredits(telegramId, cost) {
  refundCreditsStmt.run(cost, Number(telegramId));
}

// Record a usage entry without deducting (used for admins, who bypass billing
// but should still see their generations in History).
export function recordUsage(telegramId, strategy, task = null, promptText = null, creditsSpent = 0) {
  logUsage.run(Number(telegramId), strategy, creditsSpent, task ?? null, promptText ?? null);
}

// Last 30 generations for a user, newest first.
export function getHistory(telegramId) {
  return selectHistory.all(Number(telegramId));
}

// Persistent admin-chat unlock. Set once after a successful two-factor unlock.
export function setAdminChatUnlocked(telegramId) {
  const id = Number(telegramId);
  getUser(id); // ensure the row exists
  setUnlock.run(id);
}

// Stored flag only. Callers MUST also re-check ADMIN_TELEGRAM_IDS live before
// trusting this (a removed admin loses access even if the flag is still set).
export function isAdminChatUnlocked(telegramId) {
  const row = selectUnlock.get(Number(telegramId));
  return !!(row && row.admin_chat_unlocked === 1);
}

// Persistent admin-panel unlock. Set once after a successful two-factor unlock.
export function setAdminPanelUnlocked(telegramId) {
  const id = Number(telegramId);
  getUser(id); // ensure the row exists
  setPanelUnlock.run(id);
}

// Stored flag only. Callers MUST also re-check ADMIN_TELEGRAM_IDS live before
// trusting this (a removed admin loses access even if the flag is still set).
export function isAdminPanelUnlocked(telegramId) {
  const row = selectPanelUnlock.get(Number(telegramId));
  return !!(row && row.admin_panel_unlocked === 1);
}

export function hasPaidPurchase(telegramId) {
  return !!selectPaidPurchase.get(Number(telegramId));
}

export function addCredits(telegramId, starsPaid, creditsToAdd, payload, paymentId) {
  const id = Number(telegramId);
  return db.transaction(() => {
    getUser(id); // ensure the row exists
    const payloadStr =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    const purchase = logPurchase.run(
      paymentId || null,
      id,
      starsPaid,
      creditsToAdd,
      payloadStr
    );
    if (purchase.changes !== 1) {
      return { ok: true, duplicate: true, credits: getCredits(id) };
    }
    grantCredits.run(creditsToAdd, creditsToAdd, id);
    return { ok: true, duplicate: false, credits: getCredits(id) };
  })();
}

export function getStats() {
  return {
    totalUsers: countUsers.get().c,
    totalCreditsInCirculation: sumCredits.get().s,
    totalGenerations: countGenerations.get().c,
    todayGenerations: countToday.get().c,
    totalRevenue: sumRevenue.get().s,
  };
}

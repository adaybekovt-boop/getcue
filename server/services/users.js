// Credit-based usage store backed by SQLite (better-sqlite3, synchronous API).
import db from "../db/database.js";

export const PACKAGES = [
  { id: "pack_10", stars: 10, credits: 1500, label: "Starter" },
  { id: "pack_25", stars: 25, credits: 3500, label: "Basic" },
  { id: "pack_50", stars: 50, credits: 6000, label: "Standard" },
  { id: "pack_100", stars: 100, credits: 10000, label: "Pro" },
  { id: "pack_200", stars: 200, credits: 18000, label: "Max" },
];

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
  "INSERT INTO usage_log (telegram_id, strategy, credits_spent) VALUES (?, ?, ?)"
);
const grantCredits = db.prepare(
  "UPDATE users SET credits = credits + ?, total_earned = total_earned + ?, updated_at = strftime('%s','now') WHERE telegram_id = ?"
);
const logPurchase = db.prepare(
  "INSERT OR IGNORE INTO purchase_log (payment_id, telegram_id, stars_paid, credits_added, payload) VALUES (?, ?, ?, ?, ?)"
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

export function deductCredits(telegramId, strategy) {
  const id = Number(telegramId);
  const cost = GENERATION_COST[strategy] ?? DEFAULT_COST;
  return db.transaction(() => {
    getUser(id); // ensure the row exists
    const result = spendCredits.run(cost, id, cost);
    if (result.changes !== 1) {
      return { ok: false, credits: getCredits(id), required: cost };
    }
    logUsage.run(id, strategy, cost);
    return { ok: true, credits: getCredits(id), spent: cost };
  })();
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

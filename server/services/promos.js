// Promo code redemption. One-time use per (telegram_id, promo_code), enforced
// by the UNIQUE constraint on the promo_redemptions table.
import db from "../db/database.js";
import { addCredits } from "./users.js";

export const PROMO_CODES = {
  TKLOUNCHER2026: { credits: 1500, label: "TK Launcher 2026" },
};

const insertRedemption = db.prepare(
  "INSERT INTO promo_redemptions (telegram_id, promo_code, credits_added) VALUES (?, ?, ?)"
);

export function redeemPromo(telegramId, code) {
  const normalized = String(code || "").toUpperCase().trim();
  const promo = PROMO_CODES[normalized];
  if (!promo) return { error: "invalid_code" };

  // Record the redemption first — the UNIQUE constraint rejects a second use.
  try {
    insertRedemption.run(Number(telegramId), normalized, promo.credits);
  } catch (e) {
    if (e.message.includes("UNIQUE")) return { error: "already_used" };
    throw e;
  }

  // Grant the credits (0 stars paid; payload records the promo origin).
  addCredits(telegramId, 0, promo.credits, JSON.stringify({ promo: normalized }));
  return { success: true, credits: promo.credits, label: promo.label };
}

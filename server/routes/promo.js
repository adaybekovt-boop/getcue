// POST /api/promo/redeem — validateInitData -> rate limit -> redeem a promo code.
// Also handles the hidden admin-chat unlock: a correct ADMIN_CHAT_TOKEN from a
// verified admin returns { adminChat: true }. A correct token from a non-admin
// gets the SAME generic "invalid_code" as any wrong code — the feature is
// invisible to non-admins, and the token is compared in constant time.
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { matchesAdminToken, matchesAdminPanelToken } from "../services/adminAuth.js";
import { isAdmin } from "../services/admin.js";
import { setAdminChatUnlocked, setAdminPanelUnlocked } from "../services/users.js";
import { redeemPromo } from "../services/promos.js";

const MAX_CODE_LEN = 100; // tokens/codes are short; reject anything longer
const router = Router();

router.post("/redeem", validateInitData, rateLimit, (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "no_code" });
  }
  const trimmed = code.trim();
  if (trimmed.length > MAX_CODE_LEN) {
    // Treated as just another invalid code (no info leak).
    return res.status(400).json({ error: "invalid_code", message: "Invalid promo code" });
  }

  // --- Two-factor admin-chat unlock (BEFORE the promo table lookup) ---
  // Factor 1: constant-time token match. Factor 2: admin telegram id.
  if (matchesAdminToken(trimmed)) {
    if (!isAdmin(req.telegramUser.id)) {
      // Correct token, wrong person — reveal nothing useful.
      return res.status(400).json({ error: "invalid_code", message: "Invalid promo code" });
    }
    // Persist the unlock so the admin never needs to re-enter the token.
    setAdminChatUnlocked(req.telegramUser.id);
    return res.json({ adminChat: true });
  }

  // --- Two-factor admin-PANEL unlock (same rules as the chat unlock) ---
  if (matchesAdminPanelToken(trimmed)) {
    if (!isAdmin(req.telegramUser.id)) {
      // Correct token, wrong person — reveal nothing useful.
      return res.status(400).json({ error: "invalid_code", message: "Invalid promo code" });
    }
    // Persist once — the admin never needs to re-enter the token.
    setAdminPanelUnlocked(req.telegramUser.id);
    return res.json({ adminPanel: true });
  }

  // --- Normal promo redemption ---
  const result = redeemPromo(req.telegramUser.id, trimmed);

  if (result.error === "invalid_code") {
    return res.status(400).json({ error: "invalid_code", message: "Promo code not found" });
  }
  if (result.error === "already_used") {
    return res.status(409).json({ error: "already_used", message: "Already redeemed" });
  }

  return res.status(200).json({
    credits: result.credits,
    label: result.label,
    message: `+${result.credits} credits added`,
  });
});

export default router;

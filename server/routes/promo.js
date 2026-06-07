// POST /api/promo/redeem — validateInitData -> redeem a promo code.
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { redeemPromo } from "../services/promos.js";

const router = Router();

router.post("/redeem", validateInitData, (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "no_code" });
  }

  const result = redeemPromo(req.telegramUser.id, code);

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

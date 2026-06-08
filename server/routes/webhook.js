// Telegram webhook. Called by Telegram directly, so it uses Telegram's
// optional secret-token header instead of Mini App initData.
import { Router } from "express";
import { addCredits, hasPaidPurchase, FIRST_PURCHASE_BONUS } from "../services/users.js";
import {
  answerPreCheckout,
  parseInvoicePayload,
  validateSuccessfulPayment,
} from "../services/payments.js";

const router = Router();

router.post("/telegram", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] WEBHOOK_SECRET is not configured; refusing update");
    return res.status(503).json({ error: "webhook_not_configured" });
  }

  const provided = req.header("X-Telegram-Bot-Api-Secret-Token");
  if (provided !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const update = req.body || {};

  try {
    if (update.pre_checkout_query) {
      try {
        const { package: pkg } = parseInvoicePayload(
          update.pre_checkout_query.invoice_payload
        );
        if (
          update.pre_checkout_query.currency !== "XTR" ||
          Number(update.pre_checkout_query.total_amount) !== pkg.stars
        ) {
          throw new Error("amount_mismatch");
        }
        await answerPreCheckout(update.pre_checkout_query.id, true);
      } catch (err) {
        console.warn("[Payment] Rejected pre-checkout:", err.message);
        await answerPreCheckout(
          update.pre_checkout_query.id,
          false,
          "Invalid payment package"
        );
      }
      return res.json({ ok: true });
    }

    const successfulPayment = update.message && update.message.successful_payment;
    if (successfulPayment) {
      const payment = validateSuccessfulPayment(successfulPayment);
      // First-purchase bonus: +50% credits on the user's first paid package.
      let creditsToAdd = payment.creditsToAdd;
      if (payment.starsPaid > 0 && !hasPaidPurchase(payment.telegramId)) {
        creditsToAdd = Math.round(creditsToAdd * (1 + FIRST_PURCHASE_BONUS));
        console.log(
          `[Payment] First-purchase bonus applied for ${payment.telegramId}: ${payment.creditsToAdd} -> ${creditsToAdd}`
        );
      }
      const creditResult = addCredits(
        payment.telegramId,
        payment.starsPaid,
        creditsToAdd,
        payment.payload,
        payment.paymentId
      );

      if (creditResult.duplicate) {
        console.log(`[Payment] Duplicate payment ignored: ${payment.paymentId}`);
        return res.json({ ok: true });
      }

      console.log(
        `[Payment] User ${payment.telegramId} bought ${payment.creditsToAdd} credits. Balance: ${creditResult.credits}`
      );
      return res.json({ ok: true });
    }
  } catch (err) {
    console.warn("[Webhook] error:", err.message);
  }

  return res.json({ ok: true });
});

export default router;

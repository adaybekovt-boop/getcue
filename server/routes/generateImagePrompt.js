// POST /api/generate-image-prompt — validateInitData -> Gemma 4 vision.
// Cost: 100 credits (admins bypass). Stores the result in usage_log with the
// target image model as the "strategy" field so it shows in History.
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { isAdmin } from "../services/admin.js";
import { getUser, spendCreditsAtomic, refundCredits, recordUsage } from "../services/users.js";
import { IMAGE_STRATEGY_CARDS } from "../../src/config/imageStrategyCards.js";
import { generateImagePrompt } from "../services/imagePrompt.js";

const COST = 100;
const MAX_TASK_CHARS = 2000;
const MAX_IMAGE_CHARS = 7_000_000; // ~5MB image as base64; guards payload size

const router = Router();

router.post("/", validateInitData, async (req, res) => {
  const telegramId = req.telegramUser.id;
  const admin = isAdmin(telegramId);
  const { imageBase64, targetModel, task } = req.body || {};

  // 1. Validate input.
  if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
    return res.status(400).json({ error: "invalid_image" });
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return res.status(400).json({ error: "image_too_large" });
  }
  if (!targetModel || !IMAGE_STRATEGY_CARDS[targetModel]) {
    return res.status(400).json({ error: "invalid_target" });
  }
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return res.status(400).json({ error: "invalid_task" });
  }

  // 2. SECURITY: deduct atomically BEFORE generation; refund on failure.
  if (!admin) {
    const spend = spendCreditsAtomic(telegramId, COST);
    if (!spend.ok) {
      return res
        .status(402)
        .json({ error: "insufficient_credits", credits: spend.credits, required: COST });
    }
  }

  let prompt;
  try {
    // 3. Generate via Gemma 4 vision.
    prompt = await generateImagePrompt({
      imageBase64,
      targetModel,
      task: task.trim(),
    });
  } catch (err) {
    console.error("[ImagePrompt] failed:", err.message);
    if (!admin) refundCredits(telegramId, COST);
    return res.status(500).json({ error: "generation_failed" });
  }

  // 4. Log usage (credits already deducted above).
  recordUsage(telegramId, targetModel, task.trim(), prompt, admin ? 0 : COST);
  const { credits } = getUser(telegramId);

  return res.json({
    prompt,
    creditsLeft: credits,
    spent: admin ? 0 : COST,
    isAdmin: admin,
  });
});

export default router;

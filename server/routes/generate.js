// POST /api/generate — validateInitData -> handler.
// Imports the existing CLI generation core from src/ as a library (unmodified).
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { isAdmin } from "../services/admin.js";
import {
  getUser,
  hasPaidPurchase,
  spendCreditsAtomic,
  refundCredits,
  recordUsage,
  GENERATION_COST,
} from "../services/users.js";
import { strategyKeys } from "../../src/config/strategyCards.js";
import { buildPrompt, callGemini } from "../../src/generate.js";
import { fetchRepoSummary } from "../../src/github/fetchRepoSummary.js";
import { repoSummary } from "../../src/fixtures/repoSummary.js";

const MAX_TASK_CHARS = 2000;
const router = Router();

router.post("/", validateInitData, async (req, res) => {
  const telegramId = req.telegramUser.id;
  const admin = isAdmin(telegramId);

  // 4. Validate body (strategy needed to compute credit cost).
  const { strategy, task, repoUrl } = req.body || {};
  if (!strategyKeys.includes(strategy)) {
    return res.status(400).json({ error: "invalid_strategy" });
  }
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return res.status(400).json({ error: "invalid_task" });
  }
  const hasRepo = repoUrl !== undefined && repoUrl !== null && repoUrl !== "";
  if (hasRepo) {
    if (typeof repoUrl !== "string" || !repoUrl.startsWith("https://github.com/")) {
      return res.status(400).json({ error: "invalid_repoUrl" });
    }
  }

  // 3. SECURITY: deduct BEFORE generation (atomic credits >= cost), refund on
  // failure. Check-then-deduct-after allowed concurrent requests to burn
  // provider API money with funds for only one generation.
  const cost = GENERATION_COST[strategy] ?? 50;
  if (!admin) {
    const spend = spendCreditsAtomic(telegramId, cost);
    if (!spend.ok) {
      return res.status(402).json({
        error: "insufficient_credits",
        credits: spend.credits,
        required: cost,
      });
    }
  }

  let result;
  try {
    // 5. Repo context: live GitHub summary or the hardcoded fixture.
    const summary = hasRepo ? await fetchRepoSummary(repoUrl) : repoSummary;

    // 6. Build the engineered prompt with the user's task + chosen summary,
    //    then generate via the tier-aware rotating provider pool.
    const prompt = buildPrompt(strategy, { id: "user", task }, summary);
    const tier = admin ? "admin" : hasPaidPurchase(telegramId) ? "paid" : "free";
    result = await callGemini(prompt, strategy, { tier });
  } catch (err) {
    console.error("[Generate] failed:", err);
    if (!admin) refundCredits(telegramId, cost);
    return res.status(500).json({ error: "generation_failed" });
  }

  // 7. Log usage (admins are not metered, but their generations still show in
  // History). Credits were already deducted atomically above.
  recordUsage(telegramId, strategy, task, result, admin ? 0 : cost);
  const { credits } = getUser(telegramId);

  return res.json({
    result,
    credits,
    spent: admin ? 0 : cost,
    isAdmin: admin,
  });
});

export default router;

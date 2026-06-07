// POST /api/generate — validateInitData -> handler.
// Imports the existing CLI generation core from src/ as a library (unmodified).
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { isAdmin } from "../services/admin.js";
import {
  getUser,
  deductCredits,
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

  // 3. Credit check (admins bypass).
  const cost = GENERATION_COST[strategy] ?? 50;
  const { credits } = getUser(telegramId);
  if (!admin && credits < cost) {
    return res.status(402).json({
      error: "insufficient_credits",
      credits,
      required: cost,
    });
  }

  try {
    // 5. Repo context: live GitHub summary or the hardcoded fixture.
    const summary = hasRepo ? await fetchRepoSummary(repoUrl) : repoSummary;

    // 6. Build the engineered prompt with the user's task + chosen summary,
    //    then generate via the rotating-key Gemini client.
    const prompt = buildPrompt(strategy, { id: "user", task }, summary);
    const result = await callGemini(prompt, strategy);

    // 7. Deduct credits for the successful generation (admins are not metered,
    //    but their generations are still recorded so History works for them).
    let creditResult;
    if (admin) {
      recordUsage(telegramId, strategy, task, result, 0);
      creditResult = { ok: true, credits, spent: 0 };
    } else {
      creditResult = deductCredits(telegramId, strategy, task, result);
    }
    if (!creditResult.ok) {
      return res.status(402).json({
        error: "insufficient_credits",
        credits: creditResult.credits,
        required: creditResult.required,
      });
    }

    return res.json({
      result,
      credits: creditResult.credits,
      spent: creditResult.spent,
      isAdmin: admin,
    });
  } catch (err) {
    console.error("[Generate] failed:", err);
    return res.status(500).json({ error: "generation_failed" });
  }
});

export default router;

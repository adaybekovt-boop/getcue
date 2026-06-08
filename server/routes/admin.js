// Admin monitoring panel API — read-only diagnostics for the configured API
// keys and OpenRouter models. Mounted at /api/admin/panel.
//
// Auth: reuses validateInitData (the same middleware protecting every other
// authenticated route) so unauthenticated callers get 401, then gates on the
// admin allow-list so non-admin members get 403.
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { isAdmin } from "../services/admin.js";
import { isAdminPanelUnlocked } from "../services/users.js";
import { getKeyLimits, getOpenRouterModels, testModels } from "../utils/adminHelpers.js";

const router = Router();

// Admin gate applied after initData verification: must be a live admin AND have
// activated the panel once with the panel token.
router.use(validateInitData, (req, res, next) => {
  const id = req.telegramUser.id;
  if (!isAdmin(id) || !isAdminPanelUnlocked(id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
});

// 1. Stored-key usage limits / remaining quota (Gemini, SiliconFlow, …).
router.get("/key-limits", async (req, res) => {
  try {
    res.json(await getKeyLimits());
  } catch (err) {
    console.error("[AdminPanel] key-limits failed:", err);
    res.status(500).json({ error: "key_limits_failed" });
  }
});

// 2. OpenRouter model availability (enabled/disabled per configured model).
router.get("/openrouter-models", async (req, res) => {
  try {
    res.json(await getOpenRouterModels());
  } catch (err) {
    console.error("[AdminPanel] openrouter-models failed:", err);
    res.status(500).json({ error: "openrouter_models_failed" });
  }
});

// 3. Minimal generation test per configured model.
router.get("/model-tests", async (req, res) => {
  try {
    res.json(await testModels());
  } catch (err) {
    console.error("[AdminPanel] model-tests failed:", err);
    res.status(500).json({ error: "model_tests_failed" });
  }
});

export default router;

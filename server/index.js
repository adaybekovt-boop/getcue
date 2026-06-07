// Cue server — Express entry point.
// Imports the existing CLI generation core (src/) as a library; src/ is untouched.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";

import generateRouter from "./routes/generate.js";
import paymentRouter from "./routes/payment.js";
import webhookRouter from "./routes/webhook.js";
import promoRouter from "./routes/promo.js";
import { validateInitData } from "./middleware/validateInitData.js";
import {
  getUser,
  getStats,
  getHistory,
  PACKAGES,
  GENERATION_COST,
} from "./services/users.js";
import { isAdmin } from "./services/admin.js";
import { setWebhook } from "./services/payments.js";
import { getPoolStatus } from "../src/gemini/keyManager.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client/dist");

app.use(express.json());

// CORS — allow all origins (the Mini App runs inside Telegram's webview).
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-telegram-initdata");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (req, res) => {
  let keys;
  try {
    keys = getPoolStatus();
  } catch (err) {
    keys = err.message;
  }
  res.json({ ok: true, keys });
});

app.get("/api/me", validateInitData, (req, res) => {
  const telegramId = req.telegramUser.id;
  const user = getUser(telegramId);
  res.json({
    telegramUser: req.telegramUser,
    credits: user.credits,
    isAdmin: isAdmin(telegramId),
    packages: PACKAGES,
    generationCost: GENERATION_COST,
  });
});

app.get("/api/history", validateInitData, (req, res) => {
  res.json({ history: getHistory(req.telegramUser.id) });
});

app.get("/api/admin/stats", validateInitData, (req, res) => {
  if (!isAdmin(req.telegramUser.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  res.json(getStats());
});

// Convenience: register the Telegram webhook. Admin-only because it mutates bot state.
app.post("/api/admin/setup-webhook", validateInitData, async (req, res) => {
  if (!isAdmin(req.telegramUser.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const base = req.body && req.body.url;
  if (!base) {
    return res.status(400).json({ error: "missing url" });
  }
  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }
  if (parsed.protocol !== "https:") {
    return res.status(400).json({ error: "url must use https" });
  }
  try {
    const result = await setWebhook(`${parsed.origin}/api/webhook/telegram`);
    return res.json(result);
  } catch (err) {
    console.error("[Admin] setup webhook failed:", err);
    return res.status(500).json({ error: "setup_webhook_failed" });
  }
});

app.use("/api/generate", generateRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/promo", promoRouter);

app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

// Only start listening when run directly (so tests can import the app).
const isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Cue server running on port ${PORT}`);
  });
}

export default app;

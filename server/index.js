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
import imagePromptRouter from "./routes/generateImagePrompt.js";
import { validateInitData } from "./middleware/validateInitData.js";
import {
  getUser,
  getStats,
  getHistory,
  isAdminChatUnlocked,
  PACKAGES,
  GENERATION_COST,
} from "./services/users.js";
import { isAdmin } from "./services/admin.js";
import { kimiChat } from "./services/adminChat.js";
import { extractFileText } from "./services/fileExtract.js";
import { setWebhook } from "./services/payments.js";
import { getPoolStatus } from "../src/gemini/keyManager.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client/dist");

// Routes that accept large base64 bodies (images / file attachments) get higher
// limits, parsed BEFORE the global parser so the 512kb cap doesn't reject them.
app.use("/api/generate-image-prompt", express.json({ limit: "8mb" }));
app.use("/api/admin/chat", express.json({ limit: "48mb" })); // up to 3 × 10MB attachments
app.use(express.json({ limit: "512kb" }));

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
  const admin = isAdmin(telegramId);
  res.json({
    telegramUser: req.telegramUser,
    credits: user.credits,
    isAdmin: admin,
    // Live re-check: stored flag is honoured only while still an admin.
    adminChatUnlocked: admin && isAdminChatUnlocked(telegramId),
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

// Hidden admin chat — raw passthrough to Kimi K2.6. Authorized by validated
// Telegram id (admin list) + persistent unlock flag. No token in the body.
const ATT_MAX = 3;
const ATT_MAX_BASE64 = 14_000_000; // ~10MB once base64-encoded

app.post("/api/admin/chat", validateInitData, async (req, res) => {
  const admin = isAdmin(req.telegramUser.id);
  const unlocked = isAdminChatUnlocked(req.telegramUser.id);
  if (!admin || !unlocked) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { messages, attachments } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return res.status(400).json({ error: "invalid_messages" });
  }
  const hasAtt = Array.isArray(attachments) && attachments.length > 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const isLast = i === messages.length - 1;
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      return res.status(400).json({ error: "invalid_messages" });
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return res.status(400).json({ error: "invalid_messages" });
    }
    if (typeof m.content !== "string" || m.content.length > 8000) {
      return res.status(400).json({ error: "invalid_messages" });
    }
    // Empty content is allowed only on the final message when it has attachments.
    if (!m.content.length && !(isLast && hasAtt)) {
      return res.status(400).json({ error: "invalid_messages" });
    }
  }

  // Validate + build attachment content blocks for the latest user message.
  const blocks = [];
  if (attachments !== undefined) {
    if (!Array.isArray(attachments) || attachments.length > ATT_MAX) {
      return res.status(400).json({ error: "invalid_attachments" });
    }
    for (const a of attachments) {
      if (!a || typeof a !== "object" || Array.isArray(a)) {
        return res.status(400).json({ error: "invalid_attachments" });
      }
      if (a.type !== "image" && a.type !== "file") {
        return res.status(400).json({ error: "invalid_attachments" });
      }
      if (typeof a.base64 !== "string" || !a.base64) {
        return res.status(400).json({ error: "invalid_attachments" });
      }
      if (a.base64.length > ATT_MAX_BASE64) {
        return res.status(400).json({ error: "attachment_too_large" });
      }
    }
    for (const a of attachments) {
      if (a.type === "image") {
        const url = a.base64.startsWith("data:")
          ? a.base64
          : `data:${a.mime || "image/jpeg"};base64,${a.base64}`;
        blocks.push({ type: "image_url", image_url: { url } });
      } else {
        const text = await extractFileText(a.name || "file", a.mime || "", a.base64);
        blocks.push({ type: "text", text: `Attached file "${a.name || "file"}":\n\n${text}` });
      }
    }
  }

  try {
    const outgoing = messages.map((m) => ({ role: m.role, content: m.content }));
    if (blocks.length) {
      const last = outgoing[outgoing.length - 1];
      const typed = (last.content || "").trim();
      outgoing[outgoing.length - 1] = {
        role: last.role,
        content: [
          { type: "text", text: typed || "Please respond to the attached image(s) and file(s)." },
          ...blocks,
        ],
      };
    }
    const reply = await kimiChat(outgoing);
    return res.json({ reply });
  } catch (err) {
    console.error("[AdminChat] failed:", err.message);
    return res.status(502).json({ error: "chat_failed" });
  }
});

app.use("/api/generate", generateRouter);
app.use("/api/generate-image-prompt", imagePromptRouter);
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

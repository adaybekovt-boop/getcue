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
  hasPaidPurchase,
  isAdminChatUnlocked,
  PACKAGES,
  GENERATION_COST,
} from "./services/users.js";
import { isAdmin } from "./services/admin.js";
import { openRouterChat } from "./services/adminChat.js";
import { extractFileText } from "./services/fileExtract.js";
import { getModels, isAllowedModel, DEFAULT_MODEL } from "./services/openrouterModels.js";
import {
  createChat,
  listChats,
  getOwnedChat,
  getMessages,
  addMessage,
  setChatModel,
  setChatRepo,
  touchChatMaybeTitle,
  deleteChat,
} from "./services/adminChatStore.js";
import { parseCommand, PLAN_PROMPT, CRITIC_PROMPT } from "./services/adminCommands.js";
import { fetchRepoContext } from "../src/github/fetchRepoContext.js";
import { setWebhook } from "./services/payments.js";
import { getPoolStatus } from "../src/gemini/keyManager.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client/dist");

// Routes that accept large base64 bodies (images / file attachments) get higher
// limits, parsed BEFORE the global parser so the 512kb cap doesn't reject them.
app.use("/api/generate-image-prompt", express.json({ limit: "8mb" }));
app.use("/api/admin/chats", express.json({ limit: "48mb" })); // up to 3 × 10MB attachments
app.use(express.json({ limit: "512kb" }));

// CORS — allow all origins (the Mini App runs inside Telegram's webview).
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
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
    firstPurchaseBonus: !hasPaidPurchase(telegramId),
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

// ── Admin multi-chat ──────────────────────────────────────────────────────
// Authorized by validated Telegram id (admin list) + persistent unlock flag.
// Free models only; never deducts credits.
const ATT_MAX = 3;
const ATT_MAX_BASE64 = 14_000_000; // ~10MB once base64-encoded

function adminGate(req, res) {
  if (!isAdmin(req.telegramUser.id) || !isAdminChatUnlocked(req.telegramUser.id)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

function validateAttachments(attachments) {
  if (attachments === undefined) return { ok: true, list: [] };
  if (!Array.isArray(attachments) || attachments.length > ATT_MAX) {
    return { ok: false, error: "invalid_attachments" };
  }
  for (const a of attachments) {
    if (!a || typeof a !== "object" || Array.isArray(a)) return { ok: false, error: "invalid_attachments" };
    if (a.type !== "image" && a.type !== "file") return { ok: false, error: "invalid_attachments" };
    if (typeof a.base64 !== "string" || !a.base64) return { ok: false, error: "invalid_attachments" };
    if (a.base64.length > ATT_MAX_BASE64) return { ok: false, error: "attachment_too_large" };
  }
  return { ok: true, list: attachments };
}

async function buildBlocks(list) {
  const blocks = [];
  for (const a of list) {
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
  return blocks;
}

// Selectable (free) models. Admin-only, but NOT gated on the chat unlock —
// admins also use this list for the generation model override on the generate
// screen (the list is just labels, nothing sensitive).
app.get("/api/admin/models", validateInitData, (req, res) => {
  if (!isAdmin(req.telegramUser.id)) return res.status(403).json({ error: "forbidden" });
  return res.json({ models: getModels() });
});

// List the admin's chats, newest first.
app.get("/api/admin/chats", validateInitData, (req, res) => {
  if (!adminGate(req, res)) return;
  return res.json({ chats: listChats(req.telegramUser.id) });
});

// Create a new chat.
app.post("/api/admin/chats", validateInitData, (req, res) => {
  if (!adminGate(req, res)) return;
  const { model, title } = req.body || {};
  const useModel = isAllowedModel(model) ? model : DEFAULT_MODEL;
  const cleanTitle = typeof title === "string" && title.trim() ? title.trim() : "New chat";
  const id = createChat(req.telegramUser.id, useModel, cleanTitle);
  return res.json({ id, model: useModel, title: cleanTitle });
});

// Messages of one chat.
app.get("/api/admin/chats/:id/messages", validateInitData, (req, res) => {
  if (!adminGate(req, res)) return;
  const chat = getOwnedChat(req.telegramUser.id, req.params.id);
  if (!chat) return res.status(404).json({ error: "not_found" });
  return res.json({
    messages: getMessages(chat.id),
    model: chat.model,
    title: chat.title,
    repo: chat.repo || null,
  });
});

// Post a message to a chat → calls the chat's model, saves user + assistant.
app.post("/api/admin/chats/:id/messages", validateInitData, async (req, res) => {
  if (!adminGate(req, res)) return;
  const chat = getOwnedChat(req.telegramUser.id, req.params.id);
  if (!chat) return res.status(404).json({ error: "not_found" });

  const { content, attachments, model } = req.body || {};
  if (typeof content !== "string" || content.length > 8000) {
    return res.status(400).json({ error: "invalid_content" });
  }
  const att = validateAttachments(attachments);
  if (!att.ok) return res.status(400).json({ error: att.error });
  if (!content.trim() && att.list.length === 0) {
    return res.status(400).json({ error: "empty_message" });
  }

  // Optional per-chat model switch (free-only).
  let useModel = chat.model;
  if (model && model !== chat.model) {
    if (!isAllowedModel(model)) return res.status(400).json({ error: "invalid_model" });
    setChatModel(chat.id, model);
    useModel = model;
  }

  const typed = content.trim();
  const command = parseCommand(typed);

  // ── /github <repo> — load the repo's code into this chat's context. ──
  if (command && command.cmd === "github") {
    if (!command.arg) {
      return res.json({
        reply: "Usage: /github <repo url or owner/repo>",
        model: useModel,
        repo: chat.repo || null,
      });
    }
    const repoArg = command.arg.includes("github.com")
      ? command.arg
      : `https://github.com/${command.arg}`;
    let info;
    try {
      info = await fetchRepoContext(repoArg);
    } catch (err) {
      console.error("[AdminChat] /github failed:", err.message);
      const fail = `Couldn't load that repo: ${err.message}`;
      addMessage(chat.id, "user", typed, []);
      addMessage(chat.id, "assistant", fail, []);
      touchChatMaybeTitle(chat.id, typed);
      return res.json({ reply: fail, model: useModel, repo: chat.repo || null });
    }
    setChatRepo(chat.id, info.repo, info.context);
    const kb = Math.round(info.chars / 1024);
    const reply =
      `Loaded ${info.repo} — ${info.fileCount} of ${info.totalFiles} files in context (~${kb} KB).\n\n` +
      `Ask anything about the code, run /plan <task> for an implementation plan, or /critic for an honest review.`;
    addMessage(chat.id, "user", typed, []);
    addMessage(chat.id, "assistant", reply, []);
    touchChatMaybeTitle(chat.id, info.repo);
    return res.json({ reply, model: useModel, repo: info.repo });
  }

  // ── Hidden system prompt: /plan, /critic, plus any loaded-repo context. ──
  const systemParts = [];
  if (command && command.cmd === "plan") systemParts.push(PLAN_PROMPT);
  if (command && command.cmd === "critic") systemParts.push(CRITIC_PROMPT);
  if (chat.repo_context) {
    systemParts.push(
      `REPOSITORY IN CONTEXT — the user loaded this repo with /github; use it as the source of truth when answering:\n\n${chat.repo_context}`
    );
  }

  // Text actually sent to the model: strip the command word for /plan & /critic.
  let taskText = typed;
  if (command && (command.cmd === "plan" || command.cmd === "critic")) {
    taskText = command.arg;
    if (!taskText) {
      taskText =
        command.cmd === "critic"
          ? chat.repo
            ? `Review the ${chat.repo} repository loaded in context.`
            : "Review the code and project discussed in this conversation."
          : "Produce a deep implementation plan for the project/feature discussed in this conversation.";
    }
  }

  // Build context from stored history (server-side), then the new user message.
  const prior = getMessages(chat.id)
    .map((m) => ({
      role: m.role,
      content:
        m.content && m.content.trim()
          ? m.content
          : m.atts?.length
          ? `[Attached: ${m.atts.map((a) => a.name).join(", ")}]`
          : "",
    }))
    .filter((m) => m.content.length);

  const blocks = await buildBlocks(att.list);
  const userContent = blocks.length
    ? {
        role: "user",
        content: [
          { type: "text", text: taskText || "Please respond to the attached image(s) and file(s)." },
          ...blocks,
        ],
      }
    : { role: "user", content: taskText };

  const outgoing = [];
  if (systemParts.length) {
    outgoing.push({ role: "system", content: systemParts.join("\n\n---\n\n") });
  }
  outgoing.push(...prior, userContent);

  try {
    const reply = await openRouterChat(outgoing, useModel);
    const attMeta = att.list.map((a) => ({ type: a.type, name: a.name || "file" }));
    addMessage(chat.id, "user", typed, attMeta); // store typed text (with the slash command)
    addMessage(chat.id, "assistant", reply, []);
    touchChatMaybeTitle(chat.id, typed || attMeta[0]?.name || "");
    return res.json({ reply, model: useModel, repo: chat.repo || null });
  } catch (err) {
    console.error("[AdminChat] failed:", err.message);
    return res.status(502).json({ error: "chat_failed" });
  }
});

// Delete a chat.
app.delete("/api/admin/chats/:id", validateInitData, (req, res) => {
  if (!adminGate(req, res)) return;
  const chat = getOwnedChat(req.telegramUser.id, req.params.id);
  if (chat) deleteChat(req.telegramUser.id, chat.id);
  return res.json({ ok: true });
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

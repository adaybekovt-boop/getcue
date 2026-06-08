import { generatorPrompt } from "../src/config/generatorPrompt.js";
import { repoSummary } from "../src/fixtures/repoSummary.js";
import { strategyCards, strategyKeys } from "../src/config/strategyCards.js";
import { IMAGE_STRATEGY_CARDS } from "../src/config/imageStrategyCards.js";

// Value per Star must INCREASE with package size (drives average order value up).
// bonusPct is informational for the client UI (vs the 150 cr/star base rate).
const PACKAGES = [
  { id: "pack_10", stars: 10, credits: 1500, label: "Starter", bonusPct: 0 },
  { id: "pack_25", stars: 25, credits: 4000, label: "Basic", bonusPct: 7 },
  { id: "pack_50", stars: 50, credits: 8500, label: "Standard", bonusPct: 13 },
  { id: "pack_100", stars: 100, credits: 18000, label: "Pro", bonusPct: 20 },
  { id: "pack_200", stars: 200, credits: 40000, label: "Max", bonusPct: 33 },
];

// First paid purchase grants +50% extra credits (free→paid conversion lever).
const FIRST_PURCHASE_BONUS = 0.5;

const GENERATION_COST = {
  "claude-standard": 50,
  "claude-reasoning": 100,
  "gpt-standard": 50,
  "gpt-reasoning": 100,
  gemini: 50,
  kimi: 50,
};

const PROMO_CODES = {
  TKLOUNCHER2026: { credits: 1500, label: "TK Launcher 2026" },
};

const MAX_TASK_CHARS = 2000;
const MAX_CODE_CHARS = 100;
const IMAGE_PROMPT_COST = 100;
const MAX_IMAGE_CHARS = 7_000_000;
const ATT_MAX = 3;
const ATT_MAX_BASE64 = 14_000_000;
const DAY_SECONDS = 86400;
const GEMINI_MODEL = "gemini-2.5-flash";
const SILICONFLOW_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const SILICONFLOW_BASE_URL = "https://api.siliconflow.com/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://getcue.app",
  "X-Title": "Cue",
};
const GPTOSS_MODEL = "openai/gpt-oss-120b";
const KIMI_MODEL = "moonshotai/kimi-k2.6";
const GEMMA_MODEL = "google/gemma-4-31b-it:free";

// Admin-chat model registry — all routed through OpenRouter. Keep ids in sync
// with the Express-side registry and the client model sheet.
const ADMIN_CHAT_MODEL_LIST = [
  {
    id: "moonshotai/kimi-k2.6:free",
    or: "moonshotai/kimi-k2.6:free",
    label: "Kimi K2.6",
    vision: true,
    blurb: "Best all-rounder — agentic, coding & tool use. Reads images.",
    best: "Coding, multi-step tasks, working with images & files.",
    weak: "Can be slower on very long replies.",
    tags: ["Agentic", "Coding", "Vision", "Tool use"],
  },
  {
    id: "openai/gpt-oss-120b:free",
    or: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    vision: false,
    blurb: "Strong reasoning & coding. Text only.",
    best: "Hard reasoning, math, clean code.",
    weak: "No image input.",
    tags: ["Reasoning", "Coding", "Text only"],
  },
  {
    id: "openai/gpt-oss-20b:free",
    or: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    vision: false,
    blurb: "Fast & light — quick answers.",
    best: "Quick questions, drafts, fast iteration.",
    weak: "Weaker on hard / complex problems.",
    tags: ["Fast", "Lightweight", "Text only"],
  },
  {
    id: "google/gemma-4-31b-it:free",
    or: GEMMA_MODEL,
    label: "Gemma 4 31B",
    vision: true,
    blurb: "Balanced all-rounder that reads images.",
    best: "General chat and reading images/screenshots.",
    weak: "Mid-size — not the deepest reasoner.",
    tags: ["Balanced", "Vision", "General"],
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    or: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    vision: false,
    blurb: "Reliable writing & general help. Text only.",
    best: "Writing, summaries, everyday assistance.",
    weak: "No images; not a coding specialist.",
    tags: ["Writing", "General", "Text only"],
  },
  {
    id: "qwen/qwen3-coder:free",
    or: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder",
    vision: false,
    blurb: "Code specialist — repos & refactors.",
    best: "Writing & refactoring code, whole repos.",
    weak: "Weaker at casual chat; text only.",
    tags: ["Coding", "Repos", "Text only"],
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    or: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
    vision: false,
    blurb: "Fast general assistant, long context.",
    best: "Long documents and fast general answers.",
    weak: "No image input.",
    tags: ["Fast", "Long context", "General"],
  },
  {
    id: "z-ai/glm-4.5-air:free",
    or: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    vision: false,
    blurb: "Light, fast multilingual chat.",
    best: "Multilingual chat, quick replies.",
    weak: "Weaker at deep coding & reasoning.",
    tags: ["Multilingual", "Fast", "Light"],
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    or: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super",
    vision: false,
    blurb: "Strong reasoning, good speed/quality balance.",
    best: "Reasoning with a sensible speed trade-off.",
    weak: "No image input.",
    tags: ["Reasoning", "Balanced", "Text only"],
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    or: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra",
    vision: false,
    blurb: "Deep reasoning & STEM (huge model).",
    best: "Hardest reasoning, math & science.",
    weak: "Slowest of the bunch; no images.",
    tags: ["Deep reasoning", "STEM", "Slow"],
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    or: "nousresearch/hermes-3-llama-3.1-405b:free",
    label: "Hermes 3 405B",
    vision: false,
    blurb: "Massive & steerable — long-form & roleplay.",
    best: "Long-form writing, personas, steerability.",
    weak: "Large & slower; no images.",
    tags: ["Long-form", "Roleplay", "Huge"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    or: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano VL",
    vision: true,
    blurb: "Small vision model — reads images, fast.",
    best: "Quick image reading on a budget.",
    weak: "Small — limited for hard text tasks.",
    tags: ["Vision", "Small", "Fast"],
  },
];
const ADMIN_CHAT_MODELS = Object.fromEntries(
  ADMIN_CHAT_MODEL_LIST.map((model) => [model.id, model])
);
const ADMIN_CHAT_DEFAULT = ADMIN_CHAT_MODEL_LIST[0].id;
const ADMIN_CHAT_TITLE_MAX = 60;

// /plan command: deep-planning system prompt. The model must return a complete
// execution plan where every step ships a ready-to-paste prompt.
const PLAN_SYSTEM_PROMPT = `You are a senior software architect and planning engine.
The user will describe a goal. Produce a COMPLETE, deeply-reasoned execution plan:

1. Restate the goal and constraints in 2-3 lines.
2. Architecture / approach decision with a one-line justification.
3. Numbered build steps (8-20). For EVERY step include:
   - What to do and why (1-2 lines).
   - A ready-to-paste PROMPT for an AI coding assistant, in a fenced code block,
     fully self-contained (context, requirements, edge cases, acceptance criteria).
4. Risks and how each step mitigates them.
5. Verification checklist.

Be exhaustive and specific. No filler, no apologies. Use the user's language.`;
const QWEN_MODEL = "qwen-max";
const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const PROMO_HITS = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, runtime: "cloudflare-worker" });
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        const telegramUser = await requireTelegramUser(request, env);
        const user = await getUser(env.DB, telegramUser.id);
        return json({
          telegramUser,
          credits: user.credits,
          firstPurchaseBonus: !(await hasPaidPurchase(env.DB, telegramUser.id)),
          isAdmin: isAdmin(env, telegramUser.id),
          adminChatUnlocked:
            isAdmin(env, telegramUser.id) &&
            (await isAdminChatUnlocked(env.DB, telegramUser.id)),
          packages: PACKAGES,
          generationCost: GENERATION_COST,
        });
      }

      if (url.pathname === "/api/history" && request.method === "GET") {
        const telegramUser = await requireTelegramUser(request, env);
        return json({ history: await getHistory(env.DB, telegramUser.id) });
      }

      if (url.pathname === "/api/promo/redeem" && request.method === "POST") {
        const telegramUser = await requireTelegramUser(request, env);
        const limited = rateLimit(telegramUser.id);
        if (limited) {
          return json(
            { error: "rate_limited", message: "Too many attempts. Try again shortly." },
            429
          );
        }
        const body = await readJson(request);
        const code = String(body.code || "").trim();
        if (!code) return json({ error: "no_code" }, 400);
        if (code.length > MAX_CODE_CHARS) {
          return json({ error: "invalid_code", message: "Invalid promo code" }, 400);
        }
        if (await matchesAdminToken(env, code)) {
          if (!isAdmin(env, telegramUser.id)) {
            return json({ error: "invalid_code", message: "Invalid promo code" }, 400);
          }
          await setAdminChatUnlocked(env.DB, telegramUser.id);
          return json({ adminChat: true });
        }
        const result = await redeemPromo(env.DB, telegramUser.id, code);
        if (result.error === "invalid_code") {
          return json({ error: "invalid_code", message: "Promo code not found" }, 400);
        }
        if (result.error === "already_used") {
          return json({ error: "already_used", message: "Already redeemed" }, 409);
        }
        return json({
          credits: result.credits,
          label: result.label,
          message: `+${result.credits} credits added`,
        });
      }

      if (url.pathname === "/api/payment/packages" && request.method === "GET") {
        return json(PACKAGES);
      }

      if (
        url.pathname === "/api/payment/create-invoice" &&
        request.method === "POST"
      ) {
        const telegramUser = await requireTelegramUser(request, env);
        const body = await readJson(request);
        const pkg = PACKAGES.find((p) => p.id === body.packageId);
        if (!pkg) return json({ error: "invalid_package" }, 400);
        const invoiceLink = await createInvoiceLink(env, telegramUser.id, pkg);
        return json({ invoiceLink, package: pkg });
      }

      if (url.pathname === "/api/generate" && request.method === "POST") {
        return await handleGenerate(request, env);
      }

      if (url.pathname === "/api/generate-image-prompt" && request.method === "POST") {
        return await handleGenerateImagePrompt(request, env);
      }

      if (url.pathname === "/api/admin/models" && request.method === "GET") {
        return await handleAdminModels(request, env);
      }

      if (url.pathname === "/api/admin/chats" && request.method === "GET") {
        return await handleAdminChatList(request, env);
      }

      if (url.pathname === "/api/admin/chats" && request.method === "POST") {
        return await handleAdminChatCreate(request, env);
      }

      const chatMessagesMatch = url.pathname.match(/^\/api\/admin\/chats\/(\d+)\/messages$/);
      if (chatMessagesMatch && request.method === "GET") {
        return await handleAdminChatMessages(request, env, chatMessagesMatch[1]);
      }

      if (chatMessagesMatch && request.method === "POST") {
        return await handleAdminChatSend(request, env, chatMessagesMatch[1]);
      }

      const chatMatch = url.pathname.match(/^\/api\/admin\/chats\/(\d+)$/);
      if (chatMatch && request.method === "DELETE") {
        return await handleAdminChatDelete(request, env, chatMatch[1]);
      }

      // Legacy endpoint kept for old cached clients.
      if (url.pathname === "/api/admin/chat" && request.method === "POST") {
        return await handleAdminChat(request, env);
      }

      if (url.pathname === "/api/webhook/telegram" && request.method === "POST") {
        return await handleTelegramWebhook(request, env);
      }

      if (
        url.pathname === "/api/admin/stats" &&
        request.method === "GET"
      ) {
        const telegramUser = await requireTelegramUser(request, env);
        if (!isAdmin(env, telegramUser.id)) return json({ error: "forbidden" }, 403);
        return json(await getStats(env.DB));
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.publicMessage }, error.status);
      }
      console.error("[Worker] request failed:", error);
      return json({ error: "internal_error" }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleGenerate(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  const admin = isAdmin(env, telegramUser.id);
  const body = await readJson(request);
  const { strategy, task, repoUrl } = body;

  if (!strategyKeys.includes(strategy)) return json({ error: "invalid_strategy" }, 400);
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return json({ error: "invalid_task" }, 400);
  }
  if (repoUrl && !isValidGithubRepoUrl(repoUrl)) {
    return json({ error: "invalid_repoUrl" }, 400);
  }

  // Per-user rate limit: caps provider-API burn from request spam.
  if (!admin && rateLimit(telegramUser.id, "gen", 8)) {
    return json({ error: "rate_limited", message: "Too many requests. Slow down." }, 429);
  }

  // SECURITY: deduct BEFORE generation (atomic credits >= cost check), refund
  // on failure. The old check-then-deduct-after order let N concurrent
  // requests pass the balance check with funds for only one generation.
  const cost = GENERATION_COST[strategy] ?? 50;
  let spendOk = true;
  if (!admin) {
    const spend = await spendCreditsAtomic(env.DB, telegramUser.id, cost);
    spendOk = spend.ok;
    if (!spendOk) {
      return json({ error: "insufficient_credits", credits: spend.credits, required: cost }, 402);
    }
  }

  let result;
  try {
    const summary = repoUrl ? await fetchRepoSummary(env, repoUrl) : repoSummary;
    const prompt = buildPrompt(strategy, { id: "user", task }, summary);
    const tier = admin
      ? "admin"
      : (await hasPaidPurchase(env.DB, telegramUser.id))
      ? "paid"
      : "free";
    result = await generateText(env, prompt, tier);
  } catch (error) {
    console.error("[Generate] failed:", error);
    if (!admin) await refundCredits(env.DB, telegramUser.id, cost);
    return json({ error: "generation_failed" }, 500);
  }

  const creditResult = await recordUsage(
    env.DB,
    telegramUser.id,
    strategy,
    task,
    result,
    admin ? 0 : cost
  );

  return json({
    result,
    credits: creditResult.credits,
    spent: admin ? 0 : cost,
    isAdmin: admin,
  });
}

async function handleGenerateImagePrompt(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  const admin = isAdmin(env, telegramUser.id);
  const body = await readJson(request);
  const { imageBase64, targetModel, task } = body;

  if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
    return json({ error: "invalid_image" }, 400);
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return json({ error: "image_too_large" }, 400);
  }
  if (!targetModel || !IMAGE_STRATEGY_CARDS[targetModel]) {
    return json({ error: "invalid_target" }, 400);
  }
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return json({ error: "invalid_task" }, 400);
  }

  if (!admin && rateLimit(telegramUser.id, "gen", 8)) {
    return json({ error: "rate_limited", message: "Too many requests. Slow down." }, 429);
  }

  // Same deduct-first/refund-on-failure pattern as handleGenerate.
  if (!admin) {
    const spend = await spendCreditsAtomic(env.DB, telegramUser.id, IMAGE_PROMPT_COST);
    if (!spend.ok) {
      return json(
        { error: "insufficient_credits", credits: spend.credits, required: IMAGE_PROMPT_COST },
        402
      );
    }
  }

  let prompt;
  try {
    prompt = await generateImagePrompt(env, imageBase64, targetModel, task.trim());
  } catch (error) {
    console.error("[ImagePrompt] failed:", error);
    if (!admin) await refundCredits(env.DB, telegramUser.id, IMAGE_PROMPT_COST);
    return json({ error: "generation_failed" }, 500);
  }

  const creditResult = await recordUsage(
    env.DB,
    telegramUser.id,
    targetModel,
    task.trim(),
    prompt,
    admin ? 0 : IMAGE_PROMPT_COST
  );

  return json({
    prompt,
    creditsLeft: creditResult.credits,
    spent: admin ? 0 : IMAGE_PROMPT_COST,
    isAdmin: admin,
  });
}

async function requireAdminChatAccess(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  if (!isAdmin(env, telegramUser.id) || !(await isAdminChatUnlocked(env.DB, telegramUser.id))) {
    return { error: json({ error: "forbidden" }, 403) };
  }
  return { telegramUser };
}

async function handleAdminModels(request, env) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  return json({ models: ADMIN_CHAT_MODEL_LIST });
}

async function handleAdminChatList(request, env) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  return json({ chats: await listAdminChats(env.DB, access.telegramUser.id) });
}

async function handleAdminChatCreate(request, env) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  const body = await readJson(request);
  const model = ADMIN_CHAT_MODELS[body.model] ? body.model : ADMIN_CHAT_DEFAULT;
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, ADMIN_CHAT_TITLE_MAX)
      : "New chat";
  const id = await createAdminChat(env.DB, access.telegramUser.id, model, title);
  return json({ id, model, title });
}

async function handleAdminChatMessages(request, env, chatId) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  const chat = await getOwnedAdminChat(env.DB, access.telegramUser.id, chatId);
  if (!chat) return json({ error: "not_found" }, 404);
  return json({
    messages: await getAdminChatMessages(env.DB, chat.id),
    model: chat.model,
    title: chat.title,
  });
}

async function handleAdminChatDelete(request, env, chatId) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  await deleteAdminChat(env.DB, access.telegramUser.id, chatId);
  return json({ ok: true });
}

async function handleAdminChatSend(request, env, chatId) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  const chat = await getOwnedAdminChat(env.DB, access.telegramUser.id, chatId);
  if (!chat) return json({ error: "not_found" }, 404);

  const { content, attachments, model } = await readJson(request);
  if (typeof content !== "string" || content.length > 8000) {
    return json({ error: "invalid_content" }, 400);
  }

  let chatModelId = chat.model;
  if (model && model !== chat.model) {
    if (!ADMIN_CHAT_MODELS[model]) return json({ error: "invalid_model" }, 400);
    await setAdminChatModel(env.DB, chat.id, model);
    chatModelId = model;
  }
  const chatModel = ADMIN_CHAT_MODELS[chatModelId] || ADMIN_CHAT_MODELS[ADMIN_CHAT_DEFAULT];

  const att = validateAdminAttachments(attachments, chatModel);
  if (!att.ok) {
    return json(
      att.message ? { error: att.error, message: att.message } : { error: att.error },
      400
    );
  }
  if (!content.trim() && att.list.length === 0) {
    return json({ error: "empty_message" }, 400);
  }

  const prior = (await getAdminChatMessages(env.DB, chat.id))
    .map((message) => ({
      role: message.role,
      content:
        message.content && message.content.trim()
          ? message.content
          : message.atts?.length
          ? `[Attached: ${message.atts.map((item) => item.name).join(", ")}]`
          : "",
    }))
    .filter((message) => message.content.length);

  const typed = content.trim();
  const blocks = buildAdminAttachmentBlocks(att.list);
  const newUser = blocks.length
    ? {
        role: "user",
        content: [
          {
            type: "text",
            text: typed || "Please respond to the attached image(s) and file(s).",
          },
          ...blocks,
        ],
      }
    : { role: "user", content: typed };

  let planMode = false;
  if (typeof newUser.content === "string" && /^\/plan\b/i.test(newUser.content.trim())) {
    planMode = true;
    newUser.content =
      newUser.content.trim().replace(/^\/plan\b\s*/i, "") ||
      "Plan the project we discussed above.";
  }
  const outgoing = planMode
    ? [{ role: "system", content: PLAN_SYSTEM_PROMPT }, ...prior, newUser]
    : [...prior, newUser];

  try {
    const reply = await adminChatComplete(env, chatModel, outgoing, {
      maxTokens: planMode ? 8000 : 4096,
      temperature: planMode ? 0.4 : 0.5,
    });
    if (!reply) throw new Error(`${chatModel.label} unavailable`);
    const attMeta = att.list.map((item) => ({
      type: item.type,
      kind: item.type,
      name: item.name || "file",
    }));
    await addAdminChatMessage(env.DB, chat.id, "user", typed, attMeta);
    await addAdminChatMessage(env.DB, chat.id, "assistant", reply, []);
    await touchAdminChatMaybeTitle(env.DB, chat.id, typed || attMeta[0]?.name || "");
    return json({ reply, model: chatModelId });
  } catch (error) {
    console.error("[AdminChat] failed:", error);
    return json({ error: "chat_failed" }, 502);
  }
}

async function handleAdminChat(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  if (!isAdmin(env, telegramUser.id) || !(await isAdminChatUnlocked(env.DB, telegramUser.id))) {
    return json({ error: "forbidden" }, 403);
  }

  const { messages, attachments, model: modelId } = await readJson(request);
  const chatModel = ADMIN_CHAT_MODELS[modelId || ADMIN_CHAT_DEFAULT];
  if (!chatModel) return json({ error: "invalid_model" }, 400);
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return json({ error: "invalid_messages" }, 400);
  }

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  for (let i = 0; i < messages.length; i++) {
    const item = messages[i];
    const isLast = i === messages.length - 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return json({ error: "invalid_messages" }, 400);
    }
    if (item.role !== "user" && item.role !== "assistant") {
      return json({ error: "invalid_messages" }, 400);
    }
    if (typeof item.content !== "string" || item.content.length > 8000) {
      return json({ error: "invalid_messages" }, 400);
    }
    if (!item.content.length && !(isLast && hasAttachments)) {
      return json({ error: "invalid_messages" }, 400);
    }
  }

  const blocks = [];
  if (attachments !== undefined) {
    if (!Array.isArray(attachments) || attachments.length > ATT_MAX) {
      return json({ error: "invalid_attachments" }, 400);
    }
    for (const item of attachments) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return json({ error: "invalid_attachments" }, 400);
      }
      if (item.type !== "image" && item.type !== "file") {
        return json({ error: "invalid_attachments" }, 400);
      }
      if (typeof item.base64 !== "string" || !item.base64) {
        return json({ error: "invalid_attachments" }, 400);
      }
      if (item.base64.length > ATT_MAX_BASE64) {
        return json({ error: "attachment_too_large" }, 400);
      }
      if (item.type === "image" && !chatModel.vision) {
        return json(
          { error: "model_no_vision", message: `${chatModel.label} can't read images. Switch to a vision model.` },
          400
        );
      }
      if (item.type === "image") {
        blocks.push({
          type: "image_url",
          image_url: {
            url: item.base64.startsWith("data:")
              ? item.base64
              : `data:${item.mime || "image/jpeg"};base64,${item.base64}`,
          },
        });
      } else {
        blocks.push({
          type: "text",
          text: `Attached file "${item.name || "file"}":\n\n${decodeTextAttachment(item)}`,
        });
      }
    }
  }

  try {
    const outgoing = messages.map((item) => ({ role: item.role, content: item.content }));

    // Slash command: /plan <goal> → deep-planning system prompt + bigger budget.
    let planMode = false;
    const lastIdx = outgoing.length - 1;
    const lastText = typeof outgoing[lastIdx].content === "string" ? outgoing[lastIdx].content : "";
    if (/^\/plan\b/i.test(lastText.trim())) {
      planMode = true;
      outgoing[lastIdx] = {
        role: outgoing[lastIdx].role,
        content: lastText.trim().replace(/^\/plan\b\s*/i, "") || "Plan the project we discussed above.",
      };
    }
    if (planMode) {
      outgoing.unshift({ role: "system", content: PLAN_SYSTEM_PROMPT });
    }

    if (blocks.length) {
      const last = outgoing[outgoing.length - 1];
      outgoing[outgoing.length - 1] = {
        role: last.role,
        content: [
          {
            type: "text",
            text:
              (typeof last.content === "string" ? last.content : "").trim() ||
              "Please respond to the attached image(s) and file(s).",
          },
          ...blocks,
        ],
      };
    }

    const reply = await adminChatComplete(env, chatModel, outgoing, {
      maxTokens: planMode ? 8000 : 4096,
      temperature: planMode ? 0.4 : 0.5,
    });
    if (!reply) throw new Error(`${chatModel.label} unavailable`);
    return json({ reply, model: chatModel.label });
  } catch (error) {
    console.error("[AdminChat] failed:", error);
    return json({ error: "chat_failed" }, 502);
  }
}

function validateAdminAttachments(attachments, chatModel) {
  if (attachments === undefined) return { ok: true, list: [] };
  if (!Array.isArray(attachments) || attachments.length > ATT_MAX) {
    return { ok: false, error: "invalid_attachments" };
  }
  for (const item of attachments) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "invalid_attachments" };
    }
    if (item.type !== "image" && item.type !== "file") {
      return { ok: false, error: "invalid_attachments" };
    }
    if (typeof item.base64 !== "string" || !item.base64) {
      return { ok: false, error: "invalid_attachments" };
    }
    if (item.base64.length > ATT_MAX_BASE64) {
      return { ok: false, error: "attachment_too_large" };
    }
    if (item.type === "image" && !chatModel.vision) {
      return {
        ok: false,
        error: "model_no_vision",
        message: `${chatModel.label} can't read images. Switch to a vision model.`,
      };
    }
  }
  return { ok: true, list: attachments };
}

function buildAdminAttachmentBlocks(attachments) {
  return attachments.map((item) => {
    if (item.type === "image") {
      return {
        type: "image_url",
        image_url: {
          url: item.base64.startsWith("data:")
            ? item.base64
            : `data:${item.mime || "image/jpeg"};base64,${item.base64}`,
        },
      };
    }
    return {
      type: "text",
      text: `Attached file "${item.name || "file"}":\n\n${decodeTextAttachment(item)}`,
    };
  });
}

// Admin-chat completion via OpenRouter, pooling ALL configured OpenRouter keys
// so every free model works regardless of which env slot holds the key.
async function adminChatComplete(env, chatModel, messages, options = {}) {
  const keys = [
    ...parseKeys(env.OPENROUTER_API_KEY),
    ...parseKeys(env.OPENROUTER_KIMI_KEYS || env.OPENROUTER_KIMI_KEY),
    ...parseKeys(env.OPENROUTER_GPTOSS_KEYS || env.OPENROUTER_GPTOSS_KEY),
    ...parseKeys(env.OPENROUTER_GEMMA_KEYS || env.OPENROUTER_GEMMA_KEY),
  ];
  const seen = new Set();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...OPENROUTER_HEADERS,
      },
      body: JSON.stringify({
        model: chatModel.or,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });
    if (response.status === 429) continue;
    if (!response.ok) {
      console.warn(`[AdminChat] ${chatModel.or} failed: ${response.status}`);
      continue;
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (text?.trim()) return text.trim();
  }
  return null;
}

async function handleTelegramWebhook(request, env) {
  if (!env.WEBHOOK_SECRET) {
    console.error("[Webhook] WEBHOOK_SECRET is not configured; refusing update");
    return json({ error: "webhook_not_configured" }, 503);
  }

  const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (provided !== env.WEBHOOK_SECRET) return json({ error: "unauthorized" }, 401);

  const update = await readJson(request);

  try {
    if (update.pre_checkout_query) {
      try {
        const { pkg } = parseInvoicePayload(update.pre_checkout_query.invoice_payload);
        if (
          update.pre_checkout_query.currency !== "XTR" ||
          Number(update.pre_checkout_query.total_amount) !== pkg.stars
        ) {
          throw new Error("amount_mismatch");
        }
        await answerPreCheckout(env, update.pre_checkout_query.id, true);
      } catch (error) {
        console.warn("[Payment] Rejected pre-checkout:", error.message);
        await answerPreCheckout(
          env,
          update.pre_checkout_query.id,
          false,
          "Invalid payment package"
        );
      }
      return json({ ok: true });
    }

    const successfulPayment = update.message?.successful_payment;
    if (successfulPayment) {
      const payment = validateSuccessfulPayment(successfulPayment);
      // First-purchase bonus: +50% credits on the user's first paid package.
      let creditsToAdd = payment.creditsToAdd;
      if (payment.starsPaid > 0 && !(await hasPaidPurchase(env.DB, payment.telegramId))) {
        creditsToAdd = Math.round(creditsToAdd * (1 + FIRST_PURCHASE_BONUS));
        console.log(
          `[Payment] First-purchase bonus applied for ${payment.telegramId}: ${payment.creditsToAdd} -> ${creditsToAdd}`
        );
      }
      const result = await addCredits(
        env.DB,
        payment.telegramId,
        payment.starsPaid,
        creditsToAdd,
        payment.payload,
        payment.paymentId
      );
      if (result.duplicate) {
        console.log(`[Payment] Duplicate payment ignored: ${payment.paymentId}`);
      } else {
        console.log(
          `[Payment] User ${payment.telegramId} bought ${payment.creditsToAdd} credits. Balance: ${result.credits}`
        );
      }
    }
  } catch (error) {
    console.error("[Webhook] error:", error);
  }

  return json({ ok: true });
}

async function requireTelegramUser(request, env) {
  if (env.NODE_ENV === "development" && env.BOT_TOKEN === "dev") {
    return { id: 1090424330, first_name: "Dev" };
  }

  const initData = request.headers.get("x-telegram-initdata") || "";
  if (!initData) throw new HttpError(401, "Invalid initData");
  if (!env.BOT_TOKEN) throw new HttpError(500, "BOT_TOKEN not configured");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new HttpError(401, "Invalid initData");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacBytes("WebAppData", env.BOT_TOKEN);
  const computedHash = await hmacHex(secretKey, dataCheckString);
  if (computedHash !== hash) throw new HttpError(401, "Invalid initData");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > DAY_SECONDS) {
    throw new HttpError(401, "initData expired");
  }

  let user;
  try {
    user = JSON.parse(params.get("user"));
  } catch {
    throw new HttpError(401, "Invalid initData");
  }
  // JSON.parse(null) -> null without throwing; require a numeric id.
  if (!user || !Number.isFinite(Number(user.id)) || Number(user.id) <= 0) {
    throw new HttpError(401, "Invalid initData");
  }
  return user;
}

async function getUser(db, telegramId) {
  const id = Number(telegramId);
  const row = await db
    .prepare("SELECT credits, total_earned, admin_chat_unlocked FROM users WHERE telegram_id = ?")
    .bind(id)
    .first();
  if (row) {
    return {
      credits: row.credits,
      totalEarned: row.total_earned,
      adminChatUnlocked: row.admin_chat_unlocked === 1,
    };
  }
  await db.prepare("INSERT INTO users (telegram_id) VALUES (?)").bind(id).run();
  return { credits: 150, totalEarned: 0, adminChatUnlocked: false };
}

// Atomic spend: single UPDATE with credits >= cost guard (no TOCTOU window).
async function spendCreditsAtomic(db, telegramId, cost) {
  const id = Number(telegramId);
  await getUser(db, id);
  const result = await db
    .prepare(
      "UPDATE users SET credits = credits - ?, updated_at = unixepoch() WHERE telegram_id = ? AND credits >= ?"
    )
    .bind(cost, id, cost)
    .run();
  if (!result.meta?.changes) {
    const user = await getUser(db, id);
    return { ok: false, credits: user.credits };
  }
  return { ok: true };
}

// Refund a failed generation (provider error after deduction).
async function refundCredits(db, telegramId, cost) {
  await db
    .prepare(
      "UPDATE users SET credits = credits + ?, updated_at = unixepoch() WHERE telegram_id = ?"
    )
    .bind(cost, Number(telegramId))
    .run();
}

async function deductCredits(
  db,
  telegramId,
  strategy,
  task = null,
  promptText = null,
  costOverride = null
) {
  const id = Number(telegramId);
  const cost = costOverride ?? (GENERATION_COST[strategy] ?? 50);
  await getUser(db, id);
  const result = await db
    .prepare(
      "UPDATE users SET credits = credits - ?, updated_at = unixepoch() WHERE telegram_id = ? AND credits >= ?"
    )
    .bind(cost, id, cost)
    .run();
  if (!result.meta?.changes) {
    const user = await getUser(db, id);
    return { ok: false, credits: user.credits, required: cost };
  }
  await db
    .prepare(
      "INSERT INTO usage_log (telegram_id, strategy, credits_spent, task, prompt_text) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, strategy, cost, task, promptText)
    .run();
  const user = await getUser(db, id);
  return { ok: true, credits: user.credits, spent: cost };
}

async function isAdminChatUnlocked(db, telegramId) {
  const user = await getUser(db, telegramId);
  return user.adminChatUnlocked === true;
}

async function setAdminChatUnlocked(db, telegramId) {
  const id = Number(telegramId);
  await getUser(db, id);
  await db
    .prepare("UPDATE users SET admin_chat_unlocked = 1, updated_at = unixepoch() WHERE telegram_id = ?")
    .bind(id)
    .run();
}

async function hasPaidPurchase(db, telegramId) {
  const row = await db
    .prepare("SELECT 1 AS paid FROM purchase_log WHERE telegram_id = ? AND stars_paid > 0 LIMIT 1")
    .bind(Number(telegramId))
    .first();
  return !!row;
}

async function createAdminChat(db, telegramId, model, title = "New chat") {
  const result = await db
    .prepare("INSERT INTO admin_chats (telegram_id, title, model) VALUES (?, ?, ?)")
    .bind(Number(telegramId), String(title).slice(0, ADMIN_CHAT_TITLE_MAX), model)
    .run();
  return result.meta?.last_row_id;
}

async function listAdminChats(db, telegramId) {
  const result = await db
    .prepare(
      `SELECT c.id, c.title, c.model, c.updated_at,
              (SELECT m.content FROM admin_chat_messages m
                 WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS preview,
              (SELECT COUNT(*) FROM admin_chat_messages m WHERE m.chat_id = c.id) AS count
       FROM admin_chats c
       WHERE c.telegram_id = ?
       ORDER BY c.updated_at DESC, c.id DESC
       LIMIT 200`
    )
    .bind(Number(telegramId))
    .all();
  return result.results || [];
}

async function getOwnedAdminChat(db, telegramId, chatId) {
  const row = await db
    .prepare("SELECT id, telegram_id, title, model FROM admin_chats WHERE id = ?")
    .bind(Number(chatId))
    .first();
  if (!row || Number(row.telegram_id) !== Number(telegramId)) return null;
  return row;
}

async function getAdminChatMessages(db, chatId) {
  const result = await db
    .prepare(
      "SELECT role, content, attachments_json, created_at FROM admin_chat_messages WHERE chat_id = ? ORDER BY id ASC LIMIT 1000"
    )
    .bind(Number(chatId))
    .all();
  return (result.results || []).map((row) => ({
    role: row.role,
    content: row.content,
    atts: row.attachments_json ? JSON.parse(row.attachments_json) : [],
    created_at: row.created_at,
  }));
}

async function addAdminChatMessage(db, chatId, role, content, attachments) {
  const atts =
    Array.isArray(attachments) && attachments.length ? JSON.stringify(attachments) : null;
  await db
    .prepare(
      "INSERT INTO admin_chat_messages (chat_id, role, content, attachments_json) VALUES (?, ?, ?, ?)"
    )
    .bind(Number(chatId), role, content || "", atts)
    .run();
}

async function setAdminChatModel(db, chatId, model) {
  await db
    .prepare("UPDATE admin_chats SET model = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(model, Number(chatId))
    .run();
}

async function touchAdminChatMaybeTitle(db, chatId, firstUserText) {
  const row = await db
    .prepare("SELECT title FROM admin_chats WHERE id = ?")
    .bind(Number(chatId))
    .first();
  if (row && (row.title === "New chat" || !row.title) && firstUserText) {
    await db
      .prepare("UPDATE admin_chats SET title = ?, updated_at = unixepoch() WHERE id = ?")
      .bind(String(firstUserText).slice(0, ADMIN_CHAT_TITLE_MAX), Number(chatId))
      .run();
  } else {
    await db
      .prepare("UPDATE admin_chats SET updated_at = unixepoch() WHERE id = ?")
      .bind(Number(chatId))
      .run();
  }
}

async function deleteAdminChat(db, telegramId, chatId) {
  const chat = await getOwnedAdminChat(db, telegramId, chatId);
  if (!chat) return;
  await db.prepare("DELETE FROM admin_chat_messages WHERE chat_id = ?").bind(chat.id).run();
  await db
    .prepare("DELETE FROM admin_chats WHERE id = ? AND telegram_id = ?")
    .bind(chat.id, Number(telegramId))
    .run();
}

async function recordUsage(db, telegramId, strategy, task = null, promptText = null, creditsSpent = 0) {
  const id = Number(telegramId);
  await getUser(db, id);
  await db
    .prepare(
      "INSERT INTO usage_log (telegram_id, strategy, credits_spent, task, prompt_text) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, strategy, creditsSpent, task, promptText)
    .run();
  const user = await getUser(db, id);
  return { ok: true, credits: user.credits, spent: creditsSpent };
}

async function getHistory(db, telegramId) {
  const result = await db
    .prepare(
      "SELECT id, strategy, task, prompt_text, credits_spent, created_at FROM usage_log WHERE telegram_id = ? ORDER BY created_at DESC, id DESC LIMIT 30"
    )
    .bind(Number(telegramId))
    .all();
  return result.results || [];
}

async function addCredits(db, telegramId, starsPaid, creditsToAdd, payload, paymentId) {
  const id = Number(telegramId);
  await getUser(db, id);
  const insert = await db
    .prepare(
      "INSERT OR IGNORE INTO purchase_log (payment_id, telegram_id, stars_paid, credits_added, payload) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(paymentId || null, id, starsPaid, creditsToAdd, JSON.stringify(payload))
    .run();
  if (!insert.meta?.changes) {
    const user = await getUser(db, id);
    return { ok: true, duplicate: true, credits: user.credits };
  }
  await db
    .prepare(
      "UPDATE users SET credits = credits + ?, total_earned = total_earned + ?, updated_at = unixepoch() WHERE telegram_id = ?"
    )
    .bind(creditsToAdd, creditsToAdd, id)
    .run();
  const user = await getUser(db, id);
  return { ok: true, duplicate: false, credits: user.credits };
}

async function redeemPromo(db, telegramId, code) {
  const normalized = String(code || "").toUpperCase().trim();
  const promo = PROMO_CODES[normalized];
  if (!promo) return { error: "invalid_code" };

  try {
    const result = await db
      .prepare(
        "INSERT INTO promo_redemptions (telegram_id, promo_code, credits_added) VALUES (?, ?, ?)"
      )
      .bind(Number(telegramId), normalized, promo.credits)
      .run();
    if (!result.meta?.changes) return { error: "already_used" };
  } catch (error) {
    if (String(error.message || error).includes("UNIQUE")) {
      return { error: "already_used" };
    }
    throw error;
  }

  await addCredits(db, telegramId, 0, promo.credits, { promo: normalized }, null);
  return { success: true, credits: promo.credits, label: promo.label };
}

async function getStats(db) {
  const totalUsers = await db.prepare("SELECT COUNT(*) AS c FROM users").first();
  const totalCredits = await db
    .prepare("SELECT COALESCE(SUM(credits), 0) AS s FROM users")
    .first();
  const totalGenerations = await db.prepare("SELECT COUNT(*) AS c FROM usage_log").first();
  const todayGenerations = await db
    .prepare("SELECT COUNT(*) AS c FROM usage_log WHERE created_at >= unixepoch('now', 'start of day')")
    .first();
  const totalRevenue = await db
    .prepare("SELECT COALESCE(SUM(stars_paid), 0) AS s FROM purchase_log")
    .first();

  return {
    totalUsers: totalUsers.c,
    totalCreditsInCirculation: totalCredits.s,
    totalGenerations: totalGenerations.c,
    todayGenerations: todayGenerations.c,
    totalRevenue: totalRevenue.s,
  };
}

async function createInvoiceLink(env, telegramId, pkg) {
  const payload = JSON.stringify({
    v: 1,
    telegramId: Number(telegramId),
    packageId: pkg.id,
    credits: pkg.credits,
    stars: pkg.stars,
  });
  return callTelegram(env, "createInvoiceLink", {
    title: "Cue " + pkg.label,
    description: pkg.credits.toLocaleString() + " credits for prompt generation",
    payload,
    currency: "XTR",
    prices: [{ label: pkg.credits.toLocaleString() + " credits", amount: pkg.stars }],
  });
}

function parseInvoicePayload(invoicePayload) {
  const payload = JSON.parse(invoicePayload);
  const pkg = PACKAGES.find((p) => p.id === payload.packageId);
  if (!pkg) throw new Error("unknown_package");
  if (!Number.isFinite(Number(payload.telegramId)) || Number(payload.telegramId) <= 0) {
    throw new Error("invalid_telegram_id");
  }
  if (Number(payload.credits) !== pkg.credits) throw new Error("credits_mismatch");
  if (Number(payload.stars) !== pkg.stars) throw new Error("stars_mismatch");
  return { payload, pkg };
}

function validateSuccessfulPayment(successfulPayment) {
  const { payload, pkg } = parseInvoicePayload(successfulPayment.invoice_payload);
  if (successfulPayment.currency !== "XTR") throw new Error("invalid_currency");
  if (Number(successfulPayment.total_amount) !== pkg.stars) {
    throw new Error("amount_mismatch");
  }
  const paymentId =
    successfulPayment.telegram_payment_charge_id ||
    successfulPayment.provider_payment_charge_id;
  if (!paymentId) throw new Error("missing_payment_id");
  return {
    telegramId: Number(payload.telegramId),
    packageId: pkg.id,
    starsPaid: pkg.stars,
    creditsToAdd: pkg.credits,
    payload,
    paymentId,
  };
}

async function answerPreCheckout(env, queryId, ok, errorMessage) {
  const body = { pre_checkout_query_id: queryId, ok };
  if (!ok && errorMessage) body.error_message = errorMessage;
  return callTelegram(env, "answerPreCheckoutQuery", body);
}

async function callTelegram(env, method, body) {
  if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN not configured");
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed`);
  return data.result;
}

async function generateText(env, prompt, tier = "free") {
  const order =
    tier === "admin"
      ? ["kimi", "gptoss", "gemini", "siliconflow", "qwen"]
      : tier === "paid"
      ? ["gptoss", "gemini", "siliconflow", "qwen"]
      : ["gemini", "siliconflow", "qwen"];

  for (const provider of order) {
    try {
      if (provider === "gemini") {
        const text = await geminiGenerate(env, prompt);
        if (text) return text;
      } else if (provider === "siliconflow") {
        const text = await openAiChat(env, provider, SILICONFLOW_MODEL, [
          { role: "user", content: prompt },
        ]);
        if (text) return text;
      } else if (provider === "qwen") {
        const text = await openAiChat(env, provider, QWEN_MODEL, [{ role: "user", content: prompt }]);
        if (text) return text;
      } else if (provider === "gptoss") {
        const text = await openAiChat(env, provider, GPTOSS_MODEL, [
          { role: "user", content: prompt },
        ]);
        if (text) return text;
      } else if (provider === "kimi") {
        const text = await openAiChat(env, provider, KIMI_MODEL, [{ role: "user", content: prompt }]);
        if (text) return text;
      }
    } catch (error) {
      console.warn(`[${provider}] provider failed:`, error.message);
    }
  }

  throw new Error(`No generation provider returned a response for tier=${tier}`);
}

async function geminiGenerate(env, prompt) {
  const geminiKeys = parseKeys(env.GEMINI_API_KEYS || env.GEMINI_API_KEY);
  for (const key of geminiKeys) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5 },
        }),
      }
    );
    if (response.status === 429) continue;
    if (!response.ok) throw new Error(`Gemini failed: ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
    if (text?.trim()) return text.trim();
  }
  return null;
}

async function openAiChat(env, provider, model, messages, options = {}) {
  const keys = providerKeys(env, provider);
  for (const key of keys) {
    const baseUrl =
      provider === "siliconflow"
        ? SILICONFLOW_BASE_URL
        : provider === "qwen"
        ? QWEN_BASE_URL
        : OPENROUTER_BASE_URL;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    };
    if (baseUrl === OPENROUTER_BASE_URL) Object.assign(headers, OPENROUTER_HEADERS);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 2000,
      }),
    });
    if (response.status === 429) continue;
    if (!response.ok) throw new Error(`${provider} failed: ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (text?.trim()) return text.trim();
  }
  return null;
}

async function generateImagePrompt(env, imageBase64, targetModel, task) {
  const systemPrompt = `You are an expert image-generation prompt engineer.

The user has uploaded an image. They may have drawn ORANGE annotation marks
(circles, arrows, lines) directly on it to highlight areas they want changed
or emphasized. Pay close attention to anything marked in orange - those regions
are the focus of their request.

User's task: ${task}

Generate a single optimized prompt for the target image-generation model below,
following its specific syntax and rules exactly. Output ONLY the final prompt,
ready to paste - no explanations, no preamble.

=== TARGET MODEL RULES ===
${IMAGE_STRATEGY_CARDS[targetModel]}`;

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: systemPrompt },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    },
  ];
  const text = await openAiChat(env, "gemma", GEMMA_MODEL, messages, {
    maxTokens: 1500,
    temperature: 0.2,
  });
  if (!text) throw new Error("Gemma vision unavailable");
  return text;
}

function providerKeys(env, provider) {
  if (provider === "siliconflow") return parseKeys(env.SILICONFLOW_API_KEYS || env.SILICONFLOW_API_TOKEN);
  if (provider === "qwen") return parseKeys(env.QWEN_API_KEYS || env.QWEN_API_KEY);
  if (provider === "gptoss") return parseKeys(env.OPENROUTER_GPTOSS_KEYS || env.OPENROUTER_GPTOSS_KEY);
  if (provider === "kimi") return parseKeys(env.OPENROUTER_KIMI_KEYS || env.OPENROUTER_KIMI_KEY);
  if (provider === "gemma") return parseKeys(env.OPENROUTER_GEMMA_KEYS || env.OPENROUTER_GEMMA_KEY || env.OPENROUTER_API_KEY);
  return [];
}

async function fetchRepoSummary(env, repoUrl) {
  const { owner, repo } = parseGithubRepoUrl(repoUrl);
  const headers = env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "Cue" }
    : { "User-Agent": "Cue" };
  const meta = await githubJson(`/repos/${owner}/${repo}`, headers);
  const readme = await githubJson(`/repos/${owner}/${repo}/readme`, headers).catch(() => null);
  const readmeText = readme?.content
    ? atob(readme.content.replace(/\n/g, "")).slice(0, 600)
    : null;
  return [
    `PROJECT: ${meta.name || repo} - ${meta.description || "no description"}`,
    `REPO: https://github.com/${owner}/${repo}`,
    `LANGUAGE: ${meta.language || "unknown"}`,
    "",
    readmeText ? `README excerpt:\n${readmeText}` : "",
  ].join("\n");
}

async function githubJson(path, headers) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
  return response.json();
}

function parseGithubRepoUrl(repoUrl) {
  const match = String(repoUrl)
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)(?:\.git)?(?:[/?#].*)?$/i);
  if (!match) throw new Error("invalid_repoUrl");
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

function isValidGithubRepoUrl(repoUrl) {
  try {
    parseGithubRepoUrl(repoUrl);
    return true;
  } catch {
    return false;
  }
}

function isAdmin(env, telegramId) {
  return String(env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(String(telegramId));
}

// Per-user sliding-window limiter. Scoped by bucket ("promo", "gen", ...).
// In-memory per isolate — not a hard guarantee on Cloudflare, but enough to
// blunt request-spam against paid provider APIs.
function rateLimit(telegramId, bucket = "promo", max = 10) {
  const now = Date.now();
  const key = `${bucket}:${telegramId}`;
  const recent = (PROMO_HITS.get(key) || []).filter((time) => now - time < 60_000);
  if (recent.length >= max) {
    PROMO_HITS.set(key, recent);
    return true;
  }
  recent.push(now);
  PROMO_HITS.set(key, recent);
  return false;
}

async function matchesAdminToken(env, code) {
  const token = String(env.ADMIN_CHAT_TOKEN || "");
  if (!token) return false;
  return safeEqual(String(code || "").trim(), token);
}

async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const left = enc.encode(String(a || ""));
  const right = enc.encode(String(b || ""));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function decodeTextAttachment(item) {
  const name = item.name || "file";
  const raw = String(item.base64 || "");
  const payload = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  const mime = String(item.mime || "").toLowerCase();
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    /\.(pdf|docx)$/i.test(name)
  ) {
    return "[Binary document attached. Cloudflare Worker production cannot extract this file type yet; ask the user to paste the text or attach a text/markdown/code file.]";
  }
  try {
    const text = atob(payload);
    return text.slice(0, 30_000);
  } catch {
    return "[Attachment could not be decoded as text.]";
  }
}

function parseKeys(value) {
  return String(value || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-telegram-initdata, X-Telegram-Bot-Api-Secret-Token",
  };
}

async function hmacBytes(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

class HttpError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function buildPrompt(strategy, task, summary = repoSummary) {
  const card = strategyCards[strategy];
  if (!card) throw new Error("Unknown strategy");
  return generatorPrompt
    .replace("{strategy_card}", card)
    .replace("{repo_summary}", summary)
    .replace("{user_task}", task.task);
}

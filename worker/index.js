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

// First paid purchase grants +50% extra credits (freeв†’paid conversion lever).
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
const GPTOSS_MODEL = "openai/gpt-oss-20b:free";
const KIMI_MODEL = "moonshotai/kimi-k2.6";
const GEMMA_MODEL = "google/gemma-4-31b-it:free";

// Admin-chat model registry вЂ” all routed through OpenRouter. Keep ids in sync
// with the Express-side registry and the client model sheet.
const ADMIN_CHAT_MODEL_LIST = [
  {
    id: "moonshotai/kimi-k2.6:free",
    or: "moonshotai/kimi-k2.6:free",
    label: "Kimi K2.6",
    vision: true,
    blurb: "Best all-rounder вЂ” agentic, coding & tool use. Reads images.",
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
    blurb: "Fast & light вЂ” quick answers.",
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
    weak: "Mid-size вЂ” not the deepest reasoner.",
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
    blurb: "Code specialist вЂ” repos & refactors.",
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
    blurb: "Massive & steerable вЂ” long-form & roleplay.",
    best: "Long-form writing, personas, steerability.",
    weak: "Large & slower; no images.",
    tags: ["Long-form", "Roleplay", "Huge"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    or: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano VL",
    vision: true,
    blurb: "Small vision model вЂ” reads images, fast.",
    best: "Quick image reading on a budget.",
    weak: "Small вЂ” limited for hard text tasks.",
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
const CRITIC_SYSTEM_PROMPT = `You are a brutally honest senior code reviewer auditing the provided project/code. Surface ONLY substantive problems: real bugs, security holes, race conditions, data-loss risks, broken edge cases, incorrect logic, missing validation/auth checks, performance traps, and violations of the project's own stated contracts.

Rules:
- Evidence over opinion. Every issue must point to a concrete file/function/area and explain what breaks.
- No subjective style nits unless they cause an actual bug or concrete maintainability failure.
- Severity-rank each finding: [CRITICAL], [HIGH], [MEDIUM], [LOW].
- For each finding use: [SEVERITY] short title вЂ” file/area вЂ” problem вЂ” why it breaks вЂ” concrete fix.
- Finish with "Top 3 to fix first" in priority order.`;
const REPO_CONTEXT_MAX_BLOB_BYTES = 100_000; // skip blobs larger than this
const REPO_PREVIEW_HEAD_LINES = 10;          // first N lines shown per file (cheat sheet)
const REPO_PREVIEW_MAX_FILES = 40;           // how many files to fetch for previews (subrequest-safe)
const REPO_PREVIEW_MAX_TOTAL_CHARS = 14_000; // total budget - small enough for 8k-context models
const QWEN_MODEL = "qwen-max";
const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const PROMO_HITS = new Map();

// ── Multi-platform admin models (Groq + Gemini, alongside OpenRouter) ─────────
// All providers are called via plain fetch (Workers-compatible). Keys come from
// env bindings (set with `wrangler secret put`). Gemini uses its native REST
// endpoint with x-goog-api-key — AQ. keys work there (and fail on OpenAI-compat).
const PLATFORMS = {
  openrouter: { label: "OpenRouter", transport: "openai", baseUrl: OPENROUTER_BASE_URL, passthrough: true },
  groq: {
    label: "Groq",
    transport: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: {
      gpt: {
        label: "GPT",
        hasEffort: true,
        effort: {
          low: { apiModel: "openai/gpt-oss-20b", keyEnv: "GROQ_GPT_KEY" },
          high: { apiModel: "openai/gpt-oss-120b", keyEnv: "GROQ_GPT_KEY" },
        },
      },
      qwen: { label: "Qwen", hasEffort: false, apiModel: "qwen/qwen3-32b", keyEnv: "GROQ_QWEN_KEY" },
      meta: {
        label: "Meta",
        hasEffort: true,
        effort: {
          low: { apiModel: "llama-3.3-70b-versatile", keyEnv: "GROQ_META_KEY" },
          high: { apiModel: "meta-llama/llama-4-scout-17b-16e-instruct", keyEnv: "GROQ_META_KEY" },
        },
      },
    },
    vision: { apiModel: "meta-llama/llama-4-scout-17b-16e-instruct", keyEnv: "GROQ_META_KEY" },
  },
  gemini: {
    label: "Gemini",
    transport: "gemini-native",
    models: {
      gemini: {
        label: "Gemini 3",
        hasEffort: true,
        effort: {
          fast: { apiModel: "gemini-3.1-flash-lite", keyEnv: "GEMINI_FLASH_LITE_KEY" },
          medium: { apiModel: "gemini-3-flash-preview", keyEnv: "GEMINI_FLASH_KEY" },
          high: { apiModel: "gemini-3.5-flash", keyEnv: "GEMINI_FRONTIER_KEY" },
        },
      },
    },
    image: { apiModel: "gemini-2.5-flash-image", keyEnv: "GEMINI_IMAGE_KEY" },
  },
};
const PLATFORM_SET = new Set(["openrouter", "groq", "gemini"]);
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

class ProviderError extends Error {
  constructor(type, status, detail) {
    super(type);
    this.type = type;
    this.status = status;
    this.detail = detail;
  }
}
function firstKey(env, keyEnv) {
  return parseKeys(env[keyEnv])[0] || "";
}

// Resolve a (platform, model, effort) selection to a concrete provider target.
// Throws HttpError(400) on a bad combo, HttpError(500) when the key is missing.
function resolveAdminModel(env, platform, model, effort) {
  const p = PLATFORMS[platform];
  if (!p) throw new HttpError(400, "unknown_platform");
  if (p.passthrough) return { transport: p.transport, baseUrl: p.baseUrl, apiModel: model, apiKey: null };
  const m = p.models?.[model];
  if (!m) throw new HttpError(400, "unknown_model");
  let apiModel;
  let keyEnv;
  if (m.hasEffort) {
    const e = effort ? m.effort?.[effort] : null;
    if (!e) throw new HttpError(400, "invalid_effort");
    apiModel = e.apiModel;
    keyEnv = e.keyEnv;
  } else {
    apiModel = m.apiModel;
    keyEnv = m.keyEnv;
  }
  const apiKey = firstKey(env, keyEnv);
  if (!apiKey) throw new HttpError(500, "missing_key");
  return { transport: p.transport, baseUrl: p.transport === "openai" ? p.baseUrl : null, apiModel, apiKey };
}

// Dedicated vision model for a platform (Groq → Llama 4 Scout). Gemini reads
// images natively, so it has no `vision` entry and this returns null.
function resolveAdminVision(env, platform) {
  const p = PLATFORMS[platform];
  if (!p || !p.vision) return null;
  const apiKey = firstKey(env, p.vision.keyEnv);
  if (!apiKey) throw new HttpError(500, "missing_key");
  return { transport: p.transport, baseUrl: p.transport === "openai" ? p.baseUrl : null, apiModel: p.vision.apiModel, apiKey };
}

// Key-free shape for the UI dropdowns (no api ids, no keys).
function getPlatformsForClient() {
  const out = {};
  for (const [id, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.passthrough) {
      out[id] = { label: cfg.label, passthrough: true };
      continue;
    }
    out[id] = {
      label: cfg.label,
      models: Object.entries(cfg.models || {}).map(([mid, m]) => {
        const entry = { id: mid, label: m.label, hasEffort: !!m.hasEffort };
        if (m.hasEffort) entry.effort = Object.keys(m.effort || {});
        return entry;
      }),
    };
  }
  return out;
}

async function callOpenAICompatibleWorker({ baseUrl, apiKey, apiModel, messages }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: apiModel, messages }),
  });
  if (res.status === 429) throw new ProviderError("rate_limit", 429);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError("provider_error", res.status, body.slice(0, 200));
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// OpenAI-style messages → Gemini REST { systemInstruction, contents }.
function geminiPartsFromContent(content) {
  if (typeof content === "string") return content ? [{ text: content }] : [];
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const b of content) {
    if (!b) continue;
    if (b.type === "text" && b.text) parts.push({ text: b.text });
    else if (b.type === "image_url") {
      const inline = dataUrlToInline(b.image_url?.url);
      if (inline) parts.push({ inlineData: inline });
    }
  }
  return parts;
}
function geminiTextFromContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((b) => b && b.type === "text" && b.text).map((b) => b.text).join("\n");
  return "";
}
function dataUrlToInline(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}
function toGeminiContents(messages) {
  const systemParts = [];
  const contents = [];
  for (const msg of messages || []) {
    if (!msg || !msg.role) continue;
    if (msg.role === "system") {
      const t = geminiTextFromContent(msg.content);
      if (t) systemParts.push(t);
      continue;
    }
    const role = msg.role === "assistant" ? "model" : "user";
    const parts = geminiPartsFromContent(msg.content);
    if (parts.length) contents.push({ role, parts });
  }
  return { systemInstruction: systemParts.length ? systemParts.join("\n\n") : null, contents };
}

async function callGeminiTextWorker({ apiKey, apiModel, messages }) {
  const { systemInstruction, contents } = toGeminiContents(messages);
  const body = { contents };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(`${GEMINI_BASE}/models/${apiModel}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new ProviderError("rate_limit", 429);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new ProviderError("provider_error", res.status, t.slice(0, 200));
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

async function callGeminiImageWorker({ apiKey, apiModel, prompt, image }) {
  const parts = [{ text: prompt }];
  if (image) {
    const inline = dataUrlToInline(image);
    if (inline) parts.push({ inlineData: inline });
  }
  const res = await fetch(`${GEMINI_BASE}/models/${apiModel}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }] }),
  });
  if (res.status === 429) throw new ProviderError("rate_limit", 429);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new ProviderError("provider_error", res.status, t.slice(0, 200));
  }
  const data = await res.json();
  const outParts = data.candidates?.[0]?.content?.parts || [];
  const img = outParts.find((p) => p.inlineData?.data);
  if (!img) throw new ProviderError("provider_error", 502, "no_image_in_response");
  return `data:${img.inlineData.mimeType || "image/png"};base64,${img.inlineData.data}`;
}

// Dispatch a chat completion to the right provider. Groq images route to the
// vision model; Gemini reads images natively (resolveAdminVision → null).
async function callAdminModel(env, { platform, model, effort, messages, vision }) {
  let r = vision ? resolveAdminVision(env, platform) : null;
  if (!r) r = resolveAdminModel(env, platform, model, effort);
  if (r.transport === "gemini-native") {
    return callGeminiTextWorker({ apiKey: r.apiKey, apiModel: r.apiModel, messages });
  }
  return callOpenAICompatibleWorker({ baseUrl: r.baseUrl, apiKey: r.apiKey, apiModel: r.apiModel, messages });
}

// POST /api/admin/generate-image — admin-gated Prompt → Image via Gemini.
async function handleAdminGenerateImage(request, env) {
  const access = await requireAdminChatAccess(request, env);
  if (access.error) return access.error;
  const { prompt, image } = await readJson(request);
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000) {
    return json({ error: "invalid_prompt" }, 400);
  }
  if (image !== undefined && image !== null) {
    if (typeof image !== "string" || !/^data:[^;,]+;base64,/.test(image)) {
      return json({ error: "invalid_image" }, 400);
    }
    if (image.length > ATT_MAX_BASE64) return json({ error: "image_too_large" }, 400);
  }
  const imgCfg = PLATFORMS.gemini.image;
  const apiKey = firstKey(env, imgCfg.keyEnv);
  if (!apiKey) return json({ error: "image_unavailable" }, 500);
  try {
    const dataUrl = await callGeminiImageWorker({ apiKey, apiModel: imgCfg.apiModel, prompt: prompt.trim(), image: image || null });
    return json({ image: dataUrl });
  } catch (error) {
    if (error instanceof ProviderError) {
      if (error.type === "rate_limit") return json({ error: "rate_limit" }, 429);
      return json({ error: error.type, detail: error.detail }, 502);
    }
    console.error("[AdminImage] failed:", error);
    return json({ error: "image_failed" }, 502);
  }
}

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
          adminPanelUnlocked:
            isAdmin(env, telegramUser.id) &&
            (await isAdminPanelUnlocked(env.DB, telegramUser.id)),
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
        if (await matchesAdminPanelToken(env, code)) {
          if (!isAdmin(env, telegramUser.id)) {
            return json({ error: "invalid_code", message: "Invalid promo code" }, 400);
          }
          await setAdminPanelUnlocked(env.DB, telegramUser.id);
          return json({ adminPanel: true });
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

      if (url.pathname === "/api/admin/platforms" && request.method === "GET") {
        const access = await requireAdminChatAccess(request, env);
        if (access.error) return access.error;
        return json(getPlatformsForClient());
      }

      if (url.pathname === "/api/admin/generate-image" && request.method === "POST") {
        return await handleAdminGenerateImage(request, env);
      }

      if (url.pathname === "/api/admin/panel/key-limits" && request.method === "GET") {
        return await handleAdminPanelKeyLimits(request, env);
      }

      if (url.pathname === "/api/admin/panel/openrouter-models" && request.method === "GET") {
        return await handleAdminPanelModels(request, env);
      }

      if (url.pathname === "/api/admin/panel/model-tests" && request.method === "GET") {
        return await handleAdminPanelModelTests(request, env);
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
  const { strategy, task, repoUrl, model } = body;

  if (!strategyKeys.includes(strategy)) return json({ error: "invalid_strategy" }, 400);
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return json({ error: "invalid_task" }, 400);
  }
  let overrideModel = null;
  if (model !== undefined && model !== null && model !== "" && model !== "auto") {
    if (!admin) return json({ error: "forbidden_model_override" }, 403);
    if (typeof model !== "string" || !ADMIN_CHAT_MODELS[model]) {
      return json({ error: "invalid_model" }, 400);
    }
    overrideModel = model;
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
    if (overrideModel) {
      result = await adminChatComplete(
        env,
        ADMIN_CHAT_MODELS[overrideModel],
        [{ role: "user", content: prompt }],
        { maxTokens: 2000, temperature: 0.5 }
      );
      if (!result) throw new Error(`Model override unavailable: ${overrideModel}`);
    } else {
      result = await generateText(env, prompt, tier);
    }
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
  const telegramUser = await requireTelegramUser(request, env);
  if (!isAdmin(env, telegramUser.id)) return json({ error: "forbidden" }, 403);
  return json({ models: ADMIN_CHAT_MODEL_LIST });
}

// в”Ђв”Ђ Admin monitoring panel в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Gated on live admin status AND the persistent panel unlock, mirroring
// requireAdminChatAccess.
async function requireAdminPanelAccess(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  if (!isAdmin(env, telegramUser.id) || !(await isAdminPanelUnlocked(env.DB, telegramUser.id))) {
    return { error: json({ error: "forbidden" }, 403) };
  }
  return { telegramUser };
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 10) return `вЂ¦${key.slice(-3)}`;
  return `${key.slice(0, 4)}вЂ¦${key.slice(-4)}`;
}

async function checkSiliconFlowKey(key) {
  const masked = maskKey(key);
  try {
    const res = await fetch(`${SILICONFLOW_BASE_URL}/user/info`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { key: masked, status: "error", detail: `HTTP ${res.status}` };
    const body = await res.json().catch(() => null);
    const data = body?.data || {};
    return {
      key: masked,
      status: "ok",
      balance: data.balance ?? data.totalBalance ?? null,
      totalBalance: data.totalBalance ?? null,
      remaining: data.balance ?? null,
    };
  } catch (err) {
    return { key: masked, status: "error", detail: String(err.message || err) };
  }
}

async function checkOpenRouterKey(key) {
  const masked = maskKey(key);
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/key`, {
      headers: { Authorization: `Bearer ${key}`, ...OPENROUTER_HEADERS },
    });
    if (!res.ok) return { key: masked, status: "error", detail: `HTTP ${res.status}` };
    const body = await res.json().catch(() => null);
    const data = body?.data || {};
    const remaining =
      data.limit_remaining ??
      (data.limit != null && data.usage != null ? data.limit - data.usage : null);
    return {
      key: masked,
      status: "ok",
      usage: data.usage ?? null,
      limit: data.limit ?? null,
      remaining,
      freeTier: data.is_free_tier ?? null,
    };
  } catch (err) {
    return { key: masked, status: "error", detail: String(err.message || err) };
  }
}

async function handleAdminPanelKeyLimits(request, env) {
  const access = await requireAdminPanelAccess(request, env);
  if (access.error) return access.error;

  const defs = [
    { label: "Gemini", keys: parseKeys(env.GEMINI_API_KEYS || env.GEMINI_API_KEY), kind: "gemini" },
    { label: "SiliconFlow", keys: parseKeys(env.SILICONFLOW_API_KEYS || env.SILICONFLOW_API_TOKEN), kind: "siliconflow" },
    { label: "OpenRouter - User", keys: parseKeys(env.OPENROUTER_USER_KEY), kind: "openrouter" },
    { label: "OpenRouter - Admin", keys: parseKeys(env.OPENROUTER_ADMIN_KEY), kind: "openrouter" },
    { label: "Qwen", keys: parseKeys(env.QWEN_API_KEYS || env.QWEN_API_KEY), kind: "qwen" },
  ];

  const providers = await Promise.all(
    defs.map(async (d) => {
      let entries;
      if (d.keys.length === 0) {
        entries = [];
      } else if (d.kind === "siliconflow") {
        entries = await Promise.all(d.keys.map(checkSiliconFlowKey));
      } else if (d.kind === "openrouter") {
        entries = await Promise.all(d.keys.map(checkOpenRouterKey));
      } else {
        entries = d.keys.map((k) => ({ key: maskKey(k), status: "no_quota_api", remaining: null }));
      }
      return { provider: d.label, kind: d.kind, configured: d.keys.length, keys: entries };
    })
  );

  return json({ providers, checkedAt: new Date().toISOString() });
}

async function handleAdminPanelModels(request, env) {
  const access = await requireAdminPanelAccess(request, env);
  if (access.error) return access.error;

  const available = new Map();
  let error = null;
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/models`, { headers: OPENROUTER_HEADERS });
    if (!res.ok) {
      error = `HTTP ${res.status}`;
    } else {
      const data = await res.json();
      for (const m of data?.data || []) available.set(m.id, m);
    }
  } catch (err) {
    error = String(err.message || err);
  }

  const models = ADMIN_CHAT_MODEL_LIST.map((m) => {
    const live = available.get(m.or) || null;
    return {
      id: m.id,
      label: m.label,
      enabled: !!live,
      available: !!live,
      contextLength: live?.context_length ?? null,
    };
  });

  return json({ models, totalAvailable: available.size, error, checkedAt: new Date().toISOString() });
}

function allOpenRouterKeys(env) {
  const keys = parseKeys(env.OPENROUTER_ADMIN_KEY);
  return [...new Set(keys)];
}

// Minimal generation for one model, using the admin OpenRouter key. A 429 is
// reported as "limited" (not a hard "error") вЂ” the model is likely fine, just
// throttled on the free tier right now.
async function testModel(env, model, keys) {
  const started = Date.now();
  let rateLimited = false;
  for (const key of keys) {
    try {
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          ...OPENROUTER_HEADERS,
        },
        body: JSON.stringify({
          model: model.or,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          max_tokens: 16,
        }),
      });
      if (res.status === 429) {
        rateLimited = true;
        continue; // try the next key
      }
      const ms = Date.now() - started;
      if (!res.ok) return { id: model.id, label: model.label, status: "error", ms, detail: `HTTP ${res.status}` };
      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content;
      if (!text || !text.trim()) {
        return { id: model.id, label: model.label, status: "error", ms, detail: "empty response" };
      }
      return { id: model.id, label: model.label, status: "ok", ms, sample: text.trim().slice(0, 80) };
    } catch (err) {
      return { id: model.id, label: model.label, status: "error", ms: Date.now() - started, detail: String(err.message || err) };
    }
  }
  return {
    id: model.id,
    label: model.label,
    status: rateLimited ? "limited" : "error",
    ms: Date.now() - started,
    detail: rateLimited ? "rate-limited (HTTP 429)" : "no key available",
  };
}

async function handleAdminPanelModelTests(request, env) {
  const access = await requireAdminPanelAccess(request, env);
  if (access.error) return access.error;

  const keys = allOpenRouterKeys(env);
  if (keys.length === 0) {
    return json({
      results: ADMIN_CHAT_MODEL_LIST.map((m) => ({
        id: m.id,
        label: m.label,
        status: "error",
        ms: null,
        detail: "no OpenRouter key configured",
      })),
      checkedAt: new Date().toISOString(),
    });
  }

  // Sequential (not parallel) so we don't fire a burst that trips free-tier
  // rate limits and reports false failures.
  const results = [];
  for (const m of ADMIN_CHAT_MODEL_LIST) {
    results.push(await testModel(env, m, keys));
  }
  return json({ results, checkedAt: new Date().toISOString() });
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
    platform: chat.platform || "openrouter",
    effort: chat.effort ?? null,
    title: chat.title,
    repo: chat.repo || null,
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

  const body = await readJson(request);
  const { content, attachments } = body;
  if (typeof content !== "string" || content.length > 8000) {
    return json({ error: "invalid_content" }, 400);
  }

  // Resolve the platform/model/effort selection (falls back to the chat's
  // stored selection), then persist it so reopening restores the dropdowns.
  const platform = String(body.platform || chat.platform || "openrouter");
  if (!PLATFORM_SET.has(platform)) return json({ error: "unknown_platform" }, 400);
  let chatModelId;
  let effort;
  let chatModel = null;
  if (platform === "openrouter") {
    if (body.model && !ADMIN_CHAT_MODELS[body.model]) return json({ error: "invalid_model" }, 400);
    chatModelId = ADMIN_CHAT_MODELS[body.model]
      ? body.model
      : chat.platform === "openrouter" && ADMIN_CHAT_MODELS[chat.model]
      ? chat.model
      : ADMIN_CHAT_DEFAULT;
    effort = null;
    chatModel = ADMIN_CHAT_MODELS[chatModelId] || ADMIN_CHAT_MODELS[ADMIN_CHAT_DEFAULT];
  } else {
    const sameP = chat.platform === platform;
    chatModelId = body.model || (sameP ? chat.model : null) || (platform === "gemini" ? "gemini" : "gpt");
    effort = body.effort || (sameP ? chat.effort : null) || "high";
    try {
      resolveAdminModel(env, platform, chatModelId, effort);
    } catch (error) {
      if (error instanceof HttpError && error.status === 400) return json({ error: error.publicMessage }, 400);
      if (error instanceof HttpError) return json({ error: "model_unavailable" }, 500);
      throw error;
    }
  }
  await setAdminChatSelection(env.DB, chat.id, platform, chatModelId, effort);

  const att = validateAdminAttachments(attachments, platform === "openrouter" ? chatModel : { vision: true });
  if (!att.ok) {
    return json(
      att.message ? { error: att.error, message: att.message } : { error: att.error },
      400
    );
  }
  if (!content.trim() && att.list.length === 0) {
    return json({ error: "empty_message" }, 400);
  }

  const typed = content.trim();
  const command = parseAdminCommand(typed);

  if (command?.cmd === "github") {
    if (!command.arg) {
      return json({
        reply: "Usage: /github <repo url or owner/repo>",
        model: chatModelId,
        platform,
        effort,
        repo: chat.repo || null,
      });
    }
    const repoArg = command.arg.includes("github.com")
      ? command.arg
      : `https://github.com/${command.arg}`;
    try {
      const info = await fetchRepoContext(env, repoArg);
      await setAdminChatRepo(env.DB, chat.id, info.repo, info.context);
      const kb = Math.round(info.chars / 1024);
      const reply =
        `Loaded ${info.repo} - cheat sheet of ${info.fileCount} files previewed ` +
        `(~${fmtThousands(info.totalLines)} lines across ${info.totalFiles} source files, ~${kb} KB context).\n\n` +
        `Each file shows its first lines so the model can map the project without overflowing its context. ` +
        `Ask anything about the code, run /plan <task> for an implementation plan, or /critic for an honest review.`;
      await addAdminChatMessage(env.DB, chat.id, "user", typed, []);
      await addAdminChatMessage(env.DB, chat.id, "assistant", reply, []);
      await touchAdminChatMaybeTitle(env.DB, chat.id, info.repo);
      return json({ reply, model: chatModelId, platform, effort, repo: info.repo });
    } catch (error) {
      console.error("[AdminChat] /github failed:", error);
      const reply = `Couldn't load that repo: ${error.message}`;
      await addAdminChatMessage(env.DB, chat.id, "user", typed, []);
      await addAdminChatMessage(env.DB, chat.id, "assistant", reply, []);
      await touchAdminChatMaybeTitle(env.DB, chat.id, typed);
      return json({ reply, model: chatModelId, platform, effort, repo: chat.repo || null });
    }
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

  const blocks = buildAdminAttachmentBlocks(att.list);
  let taskText = typed;
  const systemParts = [];
  if (command?.cmd === "plan") {
    systemParts.push(PLAN_SYSTEM_PROMPT);
    taskText =
      command.arg ||
      "Produce a deep implementation plan for the project/feature discussed in this conversation.";
  }
  if (command?.cmd === "critic") {
    systemParts.push(CRITIC_SYSTEM_PROMPT);
    taskText =
      command.arg ||
      (chat.repo
        ? `Review the ${chat.repo} repository loaded in context.`
        : "Review the code and project discussed in this conversation.");
  }
  if (chat.repo_context) {
    systemParts.push(
      `REPOSITORY IN CONTEXT вЂ” the user loaded this repo with /github; use it as the source of truth when answering:\n\n${chat.repo_context}`
    );
  }
  const newUser = blocks.length
    ? {
        role: "user",
        content: [
          {
            type: "text",
            text: taskText || "Please respond to the attached image(s) and file(s).",
          },
          ...blocks,
        ],
      }
    : { role: "user", content: taskText };

  const outgoing = systemParts.length
    ? [{ role: "system", content: systemParts.join("\n\n---\n\n") }, ...prior, newUser]
    : [...prior, newUser];

  const hasImage = att.list.some((item) => item.type === "image");
  try {
    let reply;
    if (platform === "openrouter") {
      reply = await adminChatComplete(env, chatModel, outgoing, {
        maxTokens: command?.cmd === "plan" ? 8000 : 4096,
        temperature: command?.cmd === "plan" ? 0.4 : 0.5,
      });
      if (!reply) throw new Error(`${chatModel.label} unavailable`);
    } else {
      // Groq / Gemini via the multi-platform dispatcher. Groq images route to
      // the vision model (Llama 4 Scout); Gemini reads images natively.
      reply = await callAdminModel(env, {
        platform,
        model: chatModelId,
        effort,
        messages: outgoing,
        vision: hasImage && platform === "groq",
      });
      reply = (reply || "").trim();
      if (!reply) return json({ error: "provider_error", detail: "empty_response" }, 502);
    }
    const attMeta = att.list.map((item) => ({
      type: item.type,
      kind: item.type,
      name: item.name || "file",
    }));
    await addAdminChatMessage(env.DB, chat.id, "user", typed, attMeta);
    await addAdminChatMessage(env.DB, chat.id, "assistant", reply, []);
    await touchAdminChatMaybeTitle(env.DB, chat.id, typed || attMeta[0]?.name || "");
    return json({ reply, model: chatModelId, platform, effort, repo: chat.repo || null });
  } catch (error) {
    if (error instanceof ProviderError) {
      if (error.type === "rate_limit") return json({ error: "rate_limit" }, 429);
      return json({ error: error.type, detail: error.detail }, 502);
    }
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

    // Slash command: /plan <goal> в†’ deep-planning system prompt + bigger budget.
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

function parseAdminCommand(content) {
  const text = String(content || "").trimStart();
  if (!text.startsWith("/")) return null;
  const match = text.match(/^\/(\w[\w-]*)\s*([\s\S]*)$/);
  if (!match) return null;
  const cmd = match[1].toLowerCase();
  if (!["github", "plan", "critic"].includes(cmd)) return null;
  return { cmd, arg: (match[2] || "").trim() };
}

async function fetchRepoContext(env, repoUrl) {
  const { owner, repo } = parseGithubRepoUrlLoose(repoUrl);
  const meta = await githubJsonWorker(env, `/repos/${owner}/${repo}`);
  const branch = meta.default_branch || "main";
  const ref = await githubJsonWorker(env, `/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  const sha = ref?.object?.sha;
  if (!sha) throw new Error("Could not resolve repo HEAD.");

  const treeResp = await githubJsonWorker(
    env,
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  );
  const allBlobs = (treeResp.tree || []).filter((entry) => entry.type === "blob" && entry.path);
  const fullTree = allBlobs
    .map((entry) => entry.path)
    .filter((path) => !isRepoNoise(path))
    .sort((a, b) => a.localeCompare(b));
  // Code files only. Total lines are ESTIMATED from blob sizes (no extra
  // fetches) - ~36 bytes/line is a fair average for source.
  const codeBlobs = allBlobs.filter((entry) => !isRepoNoise(entry.path) && isCodePath(entry.path));
  const totalBytes = codeBlobs.reduce((sum, entry) => sum + (entry.size || 0), 0);
  const estTotalLines = Math.round(totalBytes / 36);

  const candidates = codeBlobs
    .filter((entry) => entry.size == null || entry.size <= REPO_CONTEXT_MAX_BLOB_BYTES)
    .sort((a, b) => repoPriority(a.path) - repoPriority(b.path) || a.path.localeCompare(b.path));

  // CHEAT SHEET: counts + tree + the first N lines of each file (not full
  // bodies), so even large repos stay small enough for any model's context.
  const parts = [];
  parts.push(`REPOSITORY: ${owner}/${repo}`);
  if (meta.description) parts.push(`DESCRIPTION: ${meta.description}`);
  parts.push(`LANGUAGE: ${meta.language || "unknown"} | BRANCH: ${branch}`);
  parts.push("");
  parts.push(
    `OVERVIEW: ${codeBlobs.length} source files, ~${fmtThousands(estTotalLines)} total lines (estimated). ` +
      `This is a CHEAT SHEET - each file below shows its first ${REPO_PREVIEW_HEAD_LINES} lines and its length ` +
      `so you can map the project. If you need a file's full content, ask the user to paste it (or open it on GitHub).`
  );
  parts.push("");
  parts.push(`FILE TREE (${fullTree.length} files):`);
  parts.push(
    fullTree.slice(0, 300).join("\n") +
      (fullTree.length > 300 ? `\n... (${fullTree.length - 300} more)` : "")
  );
  parts.push("");
  parts.push(`FILE PREVIEWS (first ${REPO_PREVIEW_HEAD_LINES} lines each):`);

  let total = parts.join("\n").length;
  let used = 0;
  let omitted = 0;
  for (const blobRef of candidates) {
    if (used >= REPO_PREVIEW_MAX_FILES || total >= REPO_PREVIEW_MAX_TOTAL_CHARS) {
      omitted++;
      continue;
    }
    let content = "";
    try {
      const blob = await githubJsonWorker(env, `/repos/${owner}/${repo}/git/blobs/${blobRef.sha}`);
      content = decodeBase64Utf8(blob.content);
    } catch {
      continue;
    }
    if (content.includes(String.fromCharCode(0))) continue; // binary
    const lines = content.split("\n");
    const head = lines.slice(0, REPO_PREVIEW_HEAD_LINES).join("\n");
    const more = lines.length - REPO_PREVIEW_HEAD_LINES;
    const note = more > 0 ? `\n... (+${more} more lines)` : "";
    const block = `\n----- ${blobRef.path} (${lines.length} lines) -----\n${head}${note}\n`;
    if (total + block.length > REPO_PREVIEW_MAX_TOTAL_CHARS && used > 0) {
      omitted++;
      continue;
    }
    parts.push(block);
    total += block.length;
    used++;
  }
  if (omitted > 0) {
    parts.push(`\n[${omitted} more files not previewed - they're in the FILE TREE above; ask for any specific one.]`);
  }
  return {
    repo: `${owner}/${repo}`,
    context: parts.join("\n"),
    fileCount: used,
    totalFiles: codeBlobs.length,
    totalLines: estTotalLines,
    chars: total,
  };
}

// Thousands separator without relying on full-ICU Intl in the Worker runtime.
function fmtThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseGithubRepoUrlLoose(repoUrl) {
  const raw = String(repoUrl || "").trim();
  if (!raw) throw new Error("Repo URL is required (e.g. https://github.com/owner/repo).");
  const normalized = raw.includes("github.com") ? raw : `https://github.com/${raw}`;
  const match = normalized
    .replace(/^git@github\.com:/, "github.com/")
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!match) throw new Error(`Not a recognisable GitHub repo URL: "${repoUrl}"`);
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) {
    throw new Error(`Not a recognisable GitHub repo URL: "${repoUrl}"`);
  }
  return { owner, repo };
}

async function githubJsonWorker(env, path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Cue",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Invalid GITHUB_TOKEN");
    if (response.status === 403) throw new Error("GitHub API rate limit hit вЂ” check GITHUB_TOKEN");
    if (response.status === 404) throw new Error("Repo not found or is private");
    let detail = "";
    try {
      const body = await response.json();
      if (body?.message) detail = ` вЂ” ${body.message}`;
    } catch {
      /* ignore */
    }
    throw new Error(`GitHub API error ${response.status}${detail}`);
  }
  return response.json();
}

function decodeBase64Utf8(content) {
  const clean = String(content || "").replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function repoExt(path) {
  const base = path.split("/").pop() || "";
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx + 1).toLowerCase() : "";
}

function isCodePath(path) {
  return new Set([
    "js","jsx","ts","tsx","mjs","cjs","py","go","rs","java","rb","php","c","cc",
    "cpp","h","hpp","cs","swift","kt","dart","scala","sh","bash","sql","vue",
    "svelte","astro","css","scss","less","html","json","jsonc","yaml","yml",
    "toml","md","txt","gradle","xml",
  ]).has(repoExt(path));
}

function isRepoNoise(path) {
  const lower = path.toLowerCase();
  const noiseDirs = [
    "node_modules/",".git/","dist/","build/","out/",".next/",".wrangler/",
    "vendor/","coverage/",".dart_tool/",".venv/","__pycache__/",
  ];
  if (noiseDirs.some((dir) => lower.includes(dir))) return true;
  if (/(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(js|css))$/i.test(path)) {
    return true;
  }
  return new Set([
    "png","jpg","jpeg","gif","svg","ico","webp","bmp","ttf","woff","woff2",
    "pdf","zip","gz","tar","mp4","mov","mp3","wasm","lock",
  ]).has(repoExt(path));
}

function repoPriority(path) {
  const base = (path.split("/").pop() || "").toLowerCase();
  if (/^readme/i.test(base)) return 0;
  if (
    ["package.json","wrangler.jsonc","wrangler.toml","go.mod","cargo.toml",
     "requirements.txt","pyproject.toml","pom.xml","tsconfig.json"].includes(base)
  ) return 1;
  if (["index","main","app","server","router","schema","routes"].some((key) => base.startsWith(key))) {
    return 2;
  }
  return 3 + Math.min(path.split("/").length, 6);
}

// Admin-chat completion via the dedicated admin OpenRouter key. User-facing
// OpenRouter traffic uses OPENROUTER_USER_KEY separately.
async function adminChatComplete(env, chatModel, messages, options = {}) {
  const keys = parseKeys(env.OPENROUTER_ADMIN_KEY);
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

// Read the panel-unlock flag with its own query (kept out of getUser's hot path).
// Tolerates the column being absent until migration 0006 is applied вЂ” locked.
async function isAdminPanelUnlocked(db, telegramId) {
  const id = Number(telegramId);
  try {
    const row = await db
      .prepare("SELECT admin_panel_unlocked FROM users WHERE telegram_id = ?")
      .bind(id)
      .first();
    return !!(row && row.admin_panel_unlocked === 1);
  } catch {
    return false;
  }
}

async function setAdminPanelUnlocked(db, telegramId) {
  const id = Number(telegramId);
  await getUser(db, id);
  await ensureAdminPanelColumn(db);
  await db
    .prepare("UPDATE users SET admin_panel_unlocked = 1, updated_at = unixepoch() WHERE telegram_id = ?")
    .bind(id)
    .run();
}

// Idempotently add the panel-unlock column so activation works even if the D1
// migration (0006) hasn't been applied manually. Ignores "duplicate column".
async function ensureAdminPanelColumn(db) {
  try {
    await db
      .prepare("ALTER TABLE users ADD COLUMN admin_panel_unlocked INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    /* column already exists вЂ” fine */
  }
}

async function hasPaidPurchase(db, telegramId) {
  const row = await db
    .prepare("SELECT 1 AS paid FROM purchase_log WHERE telegram_id = ? AND stars_paid > 0 LIMIT 1")
    .bind(Number(telegramId))
    .first();
  return !!row;
}

async function createAdminChat(db, telegramId, model, title = "New chat", platform = "openrouter", effort = null) {
  const result = await db
    .prepare("INSERT INTO admin_chats (telegram_id, title, model, platform, effort) VALUES (?, ?, ?, ?, ?)")
    .bind(Number(telegramId), String(title).slice(0, ADMIN_CHAT_TITLE_MAX), model, platform, effort)
    .run();
  return result.meta?.last_row_id;
}

async function listAdminChats(db, telegramId) {
  const result = await db
    .prepare(
      `SELECT c.id, c.title, c.model, c.platform, c.effort, c.updated_at,
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
    .prepare("SELECT id, telegram_id, title, model, platform, effort, repo, repo_context FROM admin_chats WHERE id = ?")
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

async function setAdminChatSelection(db, chatId, platform, model, effort) {
  await db
    .prepare("UPDATE admin_chats SET platform = ?, model = ?, effort = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(platform, model, effort ?? null, Number(chatId))
    .run();
}

async function setAdminChatRepo(db, chatId, repo, context) {
  await db
    .prepare("UPDATE admin_chats SET repo = ?, repo_context = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(repo, context, Number(chatId))
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
  if (provider === "gptoss") return parseKeys(env.OPENROUTER_USER_KEY);
  if (provider === "kimi") return parseKeys(env.OPENROUTER_ADMIN_KEY);
  if (provider === "gemma") return parseKeys(env.OPENROUTER_USER_KEY);
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
// In-memory per isolate вЂ” not a hard guarantee on Cloudflare, but enough to
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

// Admin monitoring-panel unlock token. Defaults to a built-in value so the panel
// activates out of the box; set ADMIN_PANEL_TOKEN (wrangler secret) to override.
// Useless on its own вЂ” the redeem path also requires the caller to be an admin.
async function matchesAdminPanelToken(env, code) {
  const token = String(env.ADMIN_PANEL_TOKEN || "ADMIN_PANEL_060826qramvseryuoz10409");
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

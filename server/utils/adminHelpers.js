// Helpers for the admin monitoring panel. Self-contained on purpose: it reads
// API keys straight from the environment (mirroring the parsing rules in
// src/gemini/keyManager.js) and queries each provider's public status endpoint,
// so it never mutates the live rotating-pool state used by generation.
//
// Two capabilities back the /api/admin/panel routes:
//   1. getKeyLimits()        — validate every stored KEY (one cheap request per
//                              unique key; never a model generation) + remaining
//                              quota where the provider exposes it.
//   2. getOpenRouterModels() — which configured models OpenRouter currently lists.
import { getModels } from "../services/openrouterModels.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const FETCH_TIMEOUT_MS = 8000;

// Show only enough of a key to identify it; never return the secret itself.
function maskKey(key) {
  if (!key) return "";
  if (key.length <= 10) return `вЂ¦${key.slice(-3)}`;
  return `${key.slice(0, 4)}вЂ¦${key.slice(-4)}`;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

// в”Ђв”Ђ 1. Key limit verification в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Per stored key: configured status plus, where the provider exposes it, live
// usage / remaining quota. Gemini and Qwen have no public per-key quota API, so
// they are reported as configured with quota "unknown".
async function checkSiliconFlowKey(key) {
  const masked = maskKey(key);
  try {
    const { ok, status, body } = await fetchJson(`${SILICONFLOW_BASE}/user/info`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!ok) return { key: masked, status: "error", detail: `HTTP ${status}` };
    const data = body?.data || {};
    return {
      key: masked,
      status: "ok",
      balance: data.balance ?? data.totalBalance ?? null,
      totalBalance: data.totalBalance ?? null,
      remaining: data.balance ?? null,
    };
  } catch (err) {
    return { key: masked, status: "error", detail: err.name === "AbortError" ? "timeout" : err.message };
  }
}

async function checkOpenRouterKey(key) {
  const masked = maskKey(key);
  try {
    const { ok, status, body } = await fetchJson(`${OPENROUTER_BASE}/key`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!ok) return { key: masked, status: "error", detail: `HTTP ${status}` };
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
    return { key: masked, status: "error", detail: err.name === "AbortError" ? "timeout" : err.message };
  }
}

// Validate a Groq / Gemini key cheaply: listing models authenticates the key
// without consuming any generation/token quota. 200 => the key is live.
async function checkGroqKey(key) {
  const masked = maskKey(key);
  try {
    const { ok, status } = await fetchJson(`${GROQ_BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!ok) return { key: masked, status: "error", detail: `HTTP ${status}` };
    return { key: masked, status: "ok", remaining: null };
  } catch (err) {
    return { key: masked, status: "error", detail: err.name === "AbortError" ? "timeout" : err.message };
  }
}

async function checkGeminiKey(key) {
  const masked = maskKey(key);
  try {
    const { ok, status } = await fetchJson(`${GEMINI_BASE}/models?key=${encodeURIComponent(key)}`);
    if (!ok) return { key: masked, status: "error", detail: `HTTP ${status}` };
    return { key: masked, status: "ok", remaining: null };
  } catch (err) {
    return { key: masked, status: "error", detail: err.name === "AbortError" ? "timeout" : err.message };
  }
}

// Read one env var (comma-separated) into a trimmed key list.
function envKeys(name) {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.split(",").map((k) => k.trim()).filter(Boolean) : [];
}
const dedupeKeys = (keys) => [...new Set(keys.filter(Boolean))];

// One cheap validation request per UNIQUE key (never a model generation), so it
// won't burn free-tier limits the way per-model probing did. Keys shared across
// env vars are deduped so a single key is pinged once.
export async function getKeyLimits() {
  const defs = [
    {
      label: "OpenRouter",
      keys: dedupeKeys([...envKeys("OPENROUTER_USER_KEY"), ...envKeys("OPENROUTER_ADMIN_KEY")]),
      check: checkOpenRouterKey,
    },
    {
      label: "Groq",
      keys: dedupeKeys([...envKeys("GROQ_GPT_KEY"), ...envKeys("GROQ_QWEN_KEY"), ...envKeys("GROQ_META_KEY")]),
      check: checkGroqKey,
    },
    {
      label: "Gemini",
      keys: dedupeKeys([
        ...envKeys("GEMINI_API_KEYS"),
        ...envKeys("GEMINI_API_KEY"),
        ...envKeys("GEMINI_FLASH_LITE_KEY"),
        ...envKeys("GEMINI_FLASH_KEY"),
        ...envKeys("GEMINI_FRONTIER_KEY"),
        ...envKeys("GEMINI_IMAGE_KEY"),
      ]),
      check: checkGeminiKey,
    },
    {
      label: "SiliconFlow",
      keys: dedupeKeys([...envKeys("SILICONFLOW_API_KEYS"), ...envKeys("SILICONFLOW_API_TOKEN")]).filter(
        (k) => !k.startsWith("sk-or-")
      ),
      check: checkSiliconFlowKey,
    },
  ];

  const providers = await Promise.all(
    defs.map(async (d) => ({
      provider: d.label,
      configured: d.keys.length,
      keys: d.keys.length ? await Promise.all(d.keys.map(d.check)) : [],
    }))
  );
  return { providers, checkedAt: new Date().toISOString() };
}

// в”Ђв”Ђ 2. OpenRouter model check в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Lists each configured model and marks it enabled (live on OpenRouter) or
// disabled (configured here but not currently offered upstream).
export async function getOpenRouterModels() {
  let available = new Map();
  let error = null;
  try {
    const { ok, status, body } = await fetchJson(`${OPENROUTER_BASE}/models`);
    if (!ok) {
      error = `HTTP ${status}`;
    } else {
      for (const m of body?.data || []) available.set(m.id, m);
    }
  } catch (err) {
    error = err.name === "AbortError" ? "timeout" : err.message;
  }

  const models = getModels().map((m) => {
    const live = available.get(m.id) || null;
    return {
      id: m.id,
      label: m.label,
      enabled: !!live,
      available: !!live,
      contextLength: live?.context_length ?? null,
    };
  });

  return {
    models,
    totalAvailable: available.size,
    error,
    checkedAt: new Date().toISOString(),
  };
}

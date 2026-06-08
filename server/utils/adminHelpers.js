// Helpers for the admin monitoring panel. Self-contained on purpose: it reads
// API keys straight from the environment (mirroring the parsing rules in
// src/gemini/keyManager.js) and queries each provider's public status endpoint,
// so it never mutates the live rotating-pool state used by generation.
//
// Three capabilities back the /api/admin/panel routes:
//   1. getKeyLimits()        — usage / remaining quota for stored keys.
//   2. getOpenRouterModels() — which configured models OpenRouter currently lists.
//   3. testModels()          — a minimal generation per configured model.
import { getModels } from "../services/openrouterModels.js";
import { openRouterChat } from "../services/adminChat.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";
const FETCH_TIMEOUT_MS = 8000;

// Providers whose stored keys we surface in the key-limits table. `kind` selects
// the live check; `exclude` keeps one provider's prefix from swallowing another's
// (SiliconFlow "sk-" must not match OpenRouter "sk-or-").
const KEY_PROVIDERS = [
  { label: "Gemini", multi: "GEMINI_API_KEYS", single: "GEMINI_API_KEY", kind: "gemini" },
  {
    label: "SiliconFlow",
    multi: "SILICONFLOW_API_KEYS",
    single: "SILICONFLOW_API_TOKEN",
    kind: "siliconflow",
    exclude: ["sk-or-"],
  },
  { label: "OpenRouter · GPT-OSS", multi: "OPENROUTER_GPTOSS_KEYS", single: "OPENROUTER_GPTOSS_KEY", kind: "openrouter" },
  { label: "OpenRouter · Kimi", multi: "OPENROUTER_KIMI_KEYS", single: "OPENROUTER_KIMI_KEY", kind: "openrouter" },
  { label: "OpenRouter · Gemma", multi: "OPENROUTER_GEMMA_KEYS", single: "OPENROUTER_GEMMA_KEY", kind: "openrouter" },
  { label: "Qwen", multi: "QWEN_API_KEYS", single: "QWEN_API_KEY", kind: "qwen" },
];

// Same precedence as keyManager.parseList: comma-separated multi var first, then
// the single-key fallback.
function parseKeys(multiVar, singleVar, exclude = []) {
  const out = [];
  const multi = process.env[multiVar];
  const raw =
    multi && multi.trim()
      ? multi.split(",").map((k) => k.trim()).filter(Boolean)
      : process.env[singleVar] && process.env[singleVar].trim()
      ? [process.env[singleVar].trim()]
      : [];
  for (const k of raw) {
    if (exclude.some((x) => k.startsWith(x))) continue;
    out.push(k);
  }
  return out;
}

// Show only enough of a key to identify it; never return the secret itself.
function maskKey(key) {
  if (!key) return "";
  if (key.length <= 10) return `…${key.slice(-3)}`;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
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

// ── 1. Key limit verification ──────────────────────────────────────────────
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

export async function getKeyLimits() {
  const providers = await Promise.all(
    KEY_PROVIDERS.map(async (p) => {
      const keys = parseKeys(p.multi, p.single, p.exclude);
      let entries;
      if (keys.length === 0) {
        entries = [];
      } else if (p.kind === "siliconflow") {
        entries = await Promise.all(keys.map(checkSiliconFlowKey));
      } else if (p.kind === "openrouter") {
        entries = await Promise.all(keys.map(checkOpenRouterKey));
      } else {
        // gemini / qwen — no public per-key quota endpoint.
        entries = keys.map((k) => ({ key: maskKey(k), status: "no_quota_api", remaining: null }));
      }
      return { provider: p.label, kind: p.kind, configured: keys.length, keys: entries };
    })
  );
  return { providers, checkedAt: new Date().toISOString() };
}

// ── 2. OpenRouter model check ──────────────────────────────────────────────
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

// ── 3. Model operability test ──────────────────────────────────────────────
// Fires a tiny generation at each configured model and reports success/latency
// or the error. Runs in parallel; failures are isolated per model.
async function testOneModel(model) {
  const started = Date.now();
  try {
    const reply = await openRouterChat([{ role: "user", content: "Reply with the single word: ok" }], model.id);
    return {
      id: model.id,
      label: model.label,
      status: "ok",
      ms: Date.now() - started,
      sample: typeof reply === "string" ? reply.slice(0, 80) : "",
    };
  } catch (err) {
    return {
      id: model.id,
      label: model.label,
      status: "error",
      ms: Date.now() - started,
      detail: err?.message || String(err),
    };
  }
}

export async function testModels() {
  const results = await Promise.all(getModels().map(testOneModel));
  return { results, checkedAt: new Date().toISOString() };
}

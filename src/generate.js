// Generation core: build the engineered prompt, then generate via a rotating
// multi-provider key pool. Fallback chain (see ./gemini/keyManager.js):
//   free  -> gemini/siliconflow/qwen
//   paid  -> gptoss first, then free providers
//   admin -> kimi first, then paid/free providers
// The OpenRouter pools each rotate through their own keys on 429 before the
// chain advances to the next provider.
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { generatorPrompt } from "./config/generatorPrompt.js";
import { strategyCards } from "./config/strategyCards.js";
import { repoSummary } from "./fixtures/repoSummary.js";
import { getActiveKeyForTier, reportError, getPoolStatus } from "./gemini/keyManager.js";

const MODEL_ID = "gemini-2.5-flash";
const TEMPERATURE = 0.5;
const MAX_TOKENS = 2000;
// Safety cap above the total key count across all pools; getActiveKey() ends the
// loop earlier once every key is sidelined.
const MAX_ROTATIONS = 40;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };

// Per-provider request config. `type: "gemini"` uses @google/genai; everything
// else is OpenAI-compatible chat completions at the given baseURL. gptoss/kimi/
// gemma all hit OpenRouter, each backed by its own rotating key pool.
const PROVIDER_CONFIG = {
  gemini: { type: "gemini", model: MODEL_ID },
  siliconflow: {
    type: "openai",
    baseURL: "https://api.siliconflow.com/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
  },
  gptoss: {
    type: "openai",
    baseURL: OPENROUTER_BASE,
    model: "openai/gpt-oss-120b",
    headers: OR_HEADERS,
  },
  kimi: {
    type: "openai",
    baseURL: OPENROUTER_BASE,
    model: "moonshotai/kimi-k2.6",
    headers: OR_HEADERS,
  },
  gemma: {
    type: "openai",
    baseURL: OPENROUTER_BASE,
    model: "google/gemma-4-31b-it:free",
    headers: OR_HEADERS,
  },
  qwen: {
    type: "openai",
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: "qwen-max",
  },
};

// Backward-compatible export (some callers import this name).
const SILICONFLOW_MODEL = PROVIDER_CONFIG.siliconflow.model;

/**
 * Fill the generator prompt skeleton with the chosen strategy card, the repo
 * summary, and the user's task. Returns the full prompt string.
 *
 * `summary` is optional and defaults to the hardcoded fixture, so existing
 * callers (buildPrompt(strategy, task)) behave exactly as before. Pass a live
 * GitHub summary to override it.
 */
export function buildPrompt(strategy, task, summary = repoSummary) {
  const card = strategyCards[strategy];
  if (!card) {
    const known = Object.keys(strategyCards).join(", ");
    throw new Error(`Unknown strategy "${strategy}". Known strategies: ${known}`);
  }

  return generatorPrompt
    .replace("{strategy_card}", card)
    .replace("{repo_summary}", summary)
    .replace("{user_task}", task.task);
}

// One client per provider+key, created lazily and reused.
const _clients = new Map();
function getClient(key, provider) {
  const cacheKey = provider + ":" + key;
  let client = _clients.get(cacheKey);
  if (!client) {
    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg) throw new Error(`Unknown provider: ${provider}`);
    if (cfg.type === "gemini") {
      client = new GoogleGenAI({ apiKey: key });
    } else {
      client = new OpenAI({
        apiKey: key,
        baseURL: cfg.baseURL,
        defaultHeaders: cfg.headers,
        timeout: 60_000,
        maxRetries: 0,
      });
    }
    _clients.set(cacheKey, client);
  }
  return client;
}

function isRateLimit(error) {
  if (!error) return false;
  const status = error.status || error.response?.status;
  if (status === 429) return true;
  const msg = error.message || String(error);
  return /\b429\b/.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg);
}

// Whether a failed attempt should rotate to the next key/provider. Rate limits,
// auth/availability failures, server errors, timeouts, and empty responses all
// rotate. Client mistakes (400/422) surface immediately — they won't fix
// themselves on another provider.
function shouldRotate(error) {
  if (!error) return false;
  const status = error.status || error.response?.status;
  if (status === 400 || status === 422) return false;
  if (isRateLimit(error)) return true;
  if (status && (status === 401 || status === 403 || status === 404 || status === 408 || status >= 500)) {
    return true;
  }
  const msg = (error.message || String(error)).toLowerCase();
  return /timeout|temporarily|overload|econnreset|etimedout|enotfound|fetch failed|socket hang up|network|empty response/.test(
    msg
  );
}

async function generateOnce(key, provider, prompt) {
  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);
  const client = getClient(key, provider);

  if (provider !== "gemini") {
    console.log(`[Generator] Using fallback provider=${provider} model=${cfg.model}`);
  }

  if (cfg.type === "gemini") {
    const response = await client.models.generateContent({
      model: cfg.model,
      contents: prompt,
      config: { temperature: TEMPERATURE },
    });
    const text = response.text;
    if (!text || !text.trim()) throw new Error("gemini returned an empty response.");
    return text.trim();
  }

  // OpenAI-compatible chat completions (siliconflow / openrouter / qwen / kimi).
  const response = await client.chat.completions.create({
    model: cfg.model,
    messages: [{ role: "user", content: prompt }],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  });
  const text = response.choices?.[0]?.message?.content;
  if (!text || !text.trim()) throw new Error(`${provider} returned an empty response.`);
  return text.trim();
}

/**
 * Generate the optimized prompt. Picks the active key/provider from the fallback
 * chain (Gemini first). On a rotate-worthy failure the offending key is reported
 * (sidelined) and the request retries with the next available key, walking the
 * chain until one succeeds or capacity is exhausted.
 *
 * `strategy` is accepted for signature compatibility (it selects the prompt card
 * in buildPrompt, not the generation model). Name kept as callGemini for
 * backward compatibility.
 */
export async function callGemini(prompt, strategy = "claude-standard", options = {}) {
  const tier = options.tier || "free";
  let lastError;
  for (let attempt = 0; attempt < MAX_ROTATIONS; attempt++) {
    let active;
    try {
      active = getActiveKeyForTier(tier);
    } catch (noKeys) {
      throw lastError || noKeys; // nothing left to try
    }
    try {
      return await generateOnce(active.key, active.provider, prompt);
    } catch (error) {
      if (!shouldRotate(error)) throw error;
      reportError(active.key, active.provider, error);
      lastError = error;
    }
  }
  throw new Error(
    `Generation failed after ${MAX_ROTATIONS} provider rotations. ${getPoolStatus()}` +
      (lastError ? ` Last error: ${lastError.message}` : "")
  );
}

// Surface combined pool capacity once, at module load. Throws a clear startup
// error if no valid keys are configured for any provider.
console.log(`[KeyManager] ${getPoolStatus()}`);

export { MODEL_ID, TEMPERATURE, SILICONFLOW_MODEL };

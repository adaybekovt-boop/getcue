// Generation core: build the engineered prompt, then generate via a rotating
// multi-provider key pool — Gemini first, falling back to SiliconFlow (see
// ./gemini/keyManager.js).
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { generatorPrompt } from "./config/generatorPrompt.js";
import { strategyCards } from "./config/strategyCards.js";
import { repoSummary } from "./fixtures/repoSummary.js";
import { getActiveKey, reportError, getPoolStatus } from "./gemini/keyManager.js";

const MODEL_ID = "gemini-2.5-flash";
const TEMPERATURE = 0.5;
const SILICONFLOW_BASE_URL = "https://api.siliconflow.com/v1";
const SILICONFLOW_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const SILICONFLOW_MAX_TOKENS = 2000;

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

// One client per key string, created lazily and reused.
const _clients = new Map();
function getClient(key, provider) {
  let client = _clients.get(key);
  if (!client) {
    if (provider === "gemini") {
      client = new GoogleGenAI({ apiKey: key });
    } else if (provider === "siliconflow") {
      client = new OpenAI({ apiKey: key, baseURL: SILICONFLOW_BASE_URL });
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
    _clients.set(key, client);
  }
  return client;
}

function isRateLimit(error) {
  if (!error) return false;
  if (error.status === 429) return true;
  const msg = error.message || String(error);
  return /\b429\b/.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg);
}

async function generateOnce(key, provider, prompt, strategy) {
  const client = getClient(key, provider);

  if (provider === "gemini") {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { temperature: TEMPERATURE },
    });
    const text = response.text;
    if (!text || !text.trim()) {
      throw new Error("Gemini returned an empty response.");
    }
    return text.trim();
  }

  // SiliconFlow (OpenAI-compatible chat completions).
  console.log("[Generator] Using SiliconFlow fallback");
  const response = await client.chat.completions.create({
    model: SILICONFLOW_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: TEMPERATURE,
    max_tokens: SILICONFLOW_MAX_TOKENS,
  });
  const text = response.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error("SiliconFlow returned an empty response.");
  }
  return text.trim();
}

/**
 * Generate the optimized prompt. Picks the active key/provider (Gemini first,
 * DeepSeek fallback). On a 429 the offending key is reported (rotated out) and
 * the request is retried ONCE with the next active key. Max one retry per call.
 *
 * `strategy` selects the DeepSeek model (reasoner vs chat); it is optional and
 * defaults to a standard strategy so existing callers keep working unchanged.
 * Name kept as callGemini for compatibility.
 */
export async function callGemini(prompt, strategy = "claude-standard") {
  const first = getActiveKey();
  try {
    return await generateOnce(first.key, first.provider, prompt, strategy);
  } catch (error) {
    if (!isRateLimit(error)) throw error;

    // First key rate-limited: record it and rotate (may cross to DeepSeek).
    reportError(first.key, first.provider, error.message);

    // getActiveKey() throws a clear message if nothing is left in either pool.
    const next = getActiveKey();
    try {
      return await generateOnce(next.key, next.provider, prompt, strategy);
    } catch (retryError) {
      if (isRateLimit(retryError)) {
        reportError(next.key, next.provider, retryError.message);
        throw new Error(
          `Generation failed: rate-limited after one key rotation. ` +
            getPoolStatus()
        );
      }
      throw retryError;
    }
  }
}

// Surface combined pool capacity once, at module load. Throws a clear startup
// error if no valid keys are configured for either provider.
console.log(`[KeyManager] ${getPoolStatus()}`);

export { MODEL_ID, TEMPERATURE, SILICONFLOW_MODEL };

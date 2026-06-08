// Raw multi-turn passthrough to any OpenRouter model (admin chat). Rotates
// across ALL OpenRouter key pools (gptoss + kimi + gemma) on 429 for maximum
// free-tier throughput; fails only when every key is rate-limited.
// Admin-only — callers MUST gate on admin id + unlock flag first, and MUST pass
// a model already validated as free (see openrouterModels.isAllowedModel).
// `messages` may contain string content or OpenAI-style content blocks (for
// image_url / extracted-file attachments).
import OpenAI from "openai";
import { getActiveKeyForProvider, reportError } from "../../src/gemini/keyManager.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };
const OR_PROVIDERS = ["gptoss", "kimi", "gemma"]; // all hold OpenRouter keys
const MAX_ROTATIONS = 12;
const DEFAULT_MODEL = "moonshotai/kimi-k2.6:free";

const _clients = new Map();
function clientFor(key) {
  let c = _clients.get(key);
  if (!c) {
    c = new OpenAI({
      apiKey: key,
      baseURL: OPENROUTER_BASE,
      defaultHeaders: OR_HEADERS,
      timeout: 90_000,
      maxRetries: 0,
    });
    _clients.set(key, c);
  }
  return c;
}

function isRateLimit(error) {
  const status = error?.status || error?.response?.status;
  if (status === 429) return true;
  return /\b429\b/.test(error?.message || "");
}

// First usable key across the OpenRouter pools, or null when all are cooled.
function pickKey() {
  for (const provider of OR_PROVIDERS) {
    try {
      return { key: getActiveKeyForProvider(provider).key, provider };
    } catch {
      /* this pool is empty or fully cooled — try the next */
    }
  }
  return null;
}

export async function openRouterChat(messages, model = DEFAULT_MODEL) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ROTATIONS; attempt++) {
    const active = pickKey();
    if (!active) throw lastError || new Error("No OpenRouter keys available");
    try {
      const response = await clientFor(active.key).chat.completions.create({
        model,
        messages,
        max_tokens: 4096,
      });
      const reply = response.choices?.[0]?.message?.content;
      if (!reply || !reply.trim()) throw new Error("empty response");
      return reply.trim();
    } catch (error) {
      if (!isRateLimit(error)) throw error;
      reportError(active.key, active.provider, error);
      lastError = error;
    }
  }
  throw lastError || new Error("All OpenRouter keys rate-limited");
}

// Raw multi-turn passthrough to Kimi K2.6 via the OpenRouter 'kimi' key pool.
// No strategy cards, no system prompt, no credit deduction, no usage_log.
// Rotates to the next key in the kimi pool on 429; fails only when the pool is
// exhausted. Admin-only — callers MUST gate on admin id + unlock flag first.
// `messages` may contain string content or OpenAI-style content blocks (for
// image_url / extracted-file attachments).
import OpenAI from "openai";
import { getActiveKeyForProvider, reportError } from "../../src/gemini/keyManager.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const KIMI_MODEL = "moonshotai/kimi-k2.6";
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };
const MAX_ROTATIONS = 6; // > kimi pool size; getActiveKeyForProvider ends earlier

const _clients = new Map();
function clientFor(key) {
  let c = _clients.get(key);
  if (!c) {
    c = new OpenAI({
      apiKey: key,
      baseURL: OPENROUTER_BASE,
      defaultHeaders: OR_HEADERS,
      timeout: 60_000,
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

export async function kimiChat(messages) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ROTATIONS; attempt++) {
    let active;
    try {
      active = getActiveKeyForProvider("kimi");
    } catch (noKeys) {
      throw lastError || noKeys;
    }
    try {
      const response = await clientFor(active.key).chat.completions.create({
        model: KIMI_MODEL,
        messages,
        max_tokens: 4096, // bound output so the request fits the key's credit budget
      });
      const reply = response.choices?.[0]?.message?.content;
      if (!reply || !reply.trim()) throw new Error("empty response");
      return reply.trim();
    } catch (error) {
      if (!isRateLimit(error)) throw error;
      reportError(active.key, "kimi", error);
      lastError = error;
    }
  }
  throw new Error("Kimi unavailable: kimi pool rate-limited");
}

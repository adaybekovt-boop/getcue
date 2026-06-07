// Image-prompt generation via Gemma 4 31B (vision) on OpenRouter.
// Uses the rotating 'gemma' key pool (429 -> next key). If that pool isn't
// configured, falls back to a single OPENROUTER_API_KEY env var.
import OpenAI from "openai";
import { getActiveKeyForProvider, reportError } from "../../src/gemini/keyManager.js";
import { IMAGE_STRATEGY_CARDS } from "../../src/config/imageStrategyCards.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const GEMMA_MODEL = "google/gemma-4-31b-it:free";
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };
const MAX_ROTATIONS = 6; // > gemma pool size; loop also ends when pool empty

function buildSystemPrompt(task, targetModel) {
  return `You are an expert image-generation prompt engineer.

The user has uploaded an image. They may have drawn ORANGE annotation marks
(circles, arrows, lines) directly on it to highlight areas they want changed
or emphasized. Pay close attention to anything marked in orange — those regions
are the focus of their request.

User's task: ${task}

Generate a single optimized prompt for the target image-generation model below,
following its specific syntax and rules exactly. Output ONLY the final prompt,
ready to paste — no explanations, no preamble.

=== TARGET MODEL RULES ===
${IMAGE_STRATEGY_CARDS[targetModel]}
`;
}

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

// Next usable key: gemma pool (rotatable) first, else single env fallback.
function pickKey() {
  try {
    return { key: getActiveKeyForProvider("gemma").key, provider: "gemma" };
  } catch (poolEmpty) {
    const fb = (process.env.OPENROUTER_API_KEY || "").trim();
    if (fb) return { key: fb, provider: null }; // single fallback, no rotation
    throw poolEmpty;
  }
}

export async function generateImagePrompt({ imageBase64, targetModel, task }) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: buildSystemPrompt(task, targetModel) },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    },
  ];

  let lastError;
  for (let attempt = 0; attempt < MAX_ROTATIONS; attempt++) {
    let active;
    try {
      active = pickKey();
    } catch (noKeys) {
      throw lastError || noKeys;
    }
    try {
      const response = await clientFor(active.key).chat.completions.create({
        model: GEMMA_MODEL,
        messages,
        max_tokens: 1500, // an image prompt is short; bound output
      });
      const text = response.choices?.[0]?.message?.content;
      if (!text || !text.trim()) throw new Error("empty response");
      return text.trim();
    } catch (error) {
      if (!isRateLimit(error)) throw error;
      if (active.provider) reportError(active.key, active.provider, error);
      lastError = error;
      if (!active.provider) break; // single fallback key can't rotate
    }
  }
  throw new Error("Gemma vision unavailable: gemma pool rate-limited");
}

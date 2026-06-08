// Image-prompt generation via Gemma 4 31B (vision) on OpenRouter.
// Uses OPENROUTER_USER_KEY through the logical 'gemma' provider.
import OpenAI from "openai";
import { getActiveKeyForProvider, reportError } from "../../src/gemini/keyManager.js";
import { IMAGE_STRATEGY_CARDS } from "../../src/config/imageStrategyCards.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const GEMMA_MODEL = "google/gemma-4-31b-it:free";
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };
const MAX_ROTATIONS = 2; // one account-level key, with one retry after cooldown checks

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

// Next usable user OpenRouter key.
function pickKey() {
  return { key: getActiveKeyForProvider("gemma").key, provider: "gemma" };
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
      reportError(active.key, active.provider, error);
      lastError = error;
    }
  }
  throw new Error("Gemma vision unavailable: gemma pool rate-limited");
}

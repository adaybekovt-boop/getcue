// Admin chat model registry (Phase 1 — foundation only).
//
// One PLATFORMS object describes every selectable platform for the admin chat.
// Friendly model names + an "effort" level map to the real API model and the
// env var that holds its key. Nothing here calls a provider or touches existing
// chat/generation logic — the resolver (resolveModel.js) consumes this config.
//
// transport:
//   'openai'        -> OpenAI-compatible client (Groq + OpenRouter share it).
//   'gemini-native' -> MUST use the native @google/genai SDK. AQ. keys FAIL on
//                      the OpenAI-compatible Gemini endpoint with "Multiple
//                      authentication credentials received". Never route Gemini
//                      through an OpenAI-style client.
export const PLATFORMS = {
  openrouter: {
    label: "OpenRouter",
    transport: "openai", // OpenAI-compatible client
    baseUrl: "https://openrouter.ai/api/v1",
    // existing OpenRouter models stay as they are handled today;
    // represent them here only if needed by the resolver, otherwise
    // leave a passthrough flag:
    passthrough: true,
  },

  groq: {
    label: "Groq",
    transport: "openai", // OpenAI-compatible client
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
      qwen: {
        label: "Qwen",
        hasEffort: false,
        apiModel: "qwen/qwen3-32b",
        keyEnv: "GROQ_QWEN_KEY",
      },
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
    transport: "gemini-native", // CRITICAL: native @google/genai SDK ONLY
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

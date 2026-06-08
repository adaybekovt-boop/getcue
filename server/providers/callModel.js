// Unified provider dispatcher (Phase 2, extended in Phase 3 with vision routing).
// The single entry point the admin endpoint calls: resolve the (platform, model,
// effort) selection via the registry, then route to the correct transport.
import { resolveModel, resolveVision } from "../config/resolveModel.js";
import { callOpenAICompatible } from "./openaiClient.js";
import { callGeminiChat } from "./geminiClient.js";

export async function callModel({ platform, model, effort, messages, signal, vision }) {
  // Image input + a platform with a dedicated vision model (Groq → Llama 4 Scout)
  // routes there instead of the selected text model. Gemini flash reads images
  // natively (resolveVision returns null), so it falls through to the text model.
  let r = vision ? resolveVision(platform) : null;
  if (!r) r = resolveModel(platform, model, effort); // { transport, baseUrl, apiModel, apiKey }

  if (r.transport === "gemini-native") {
    return callGeminiChat({ apiKey: r.apiKey, apiModel: r.apiModel, messages, signal });
  }

  // 'openai' transport (Groq, OpenRouter)
  return callOpenAICompatible({
    baseUrl: r.baseUrl,
    apiKey: r.apiKey,
    apiModel: r.apiModel,
    messages,
    signal,
  });
}

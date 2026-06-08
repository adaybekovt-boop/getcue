// Gemini native transport (Phase 2).
//
// CRITICAL: Gemini AQ. keys work ONLY through the native @google/genai SDK. They
// FAIL on any OpenAI-compatible endpoint with "Multiple authentication
// credentials received" — never route a Gemini call through openaiClient.
//
// res.text is a getter in @google/genai >=1 (verified against installed 1.52.0),
// so we read res.text directly (not res.response.text()). Typed errors match
// openaiClient. The API key is never logged.
import { GoogleGenAI } from "@google/genai";
import { providerError, truncateBody } from "./providerErrors.js";

export async function callGeminiChat({ apiKey, apiModel, messages, signal }) {
  const ai = new GoogleGenAI({ apiKey });
  const { systemInstruction, contents } = toGeminiMessages(messages);

  const config = {};
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (signal) config.abortSignal = signal;

  try {
    const res = await ai.models.generateContent({
      model: apiModel,
      contents,
      config: Object.keys(config).length ? config : undefined,
    });
    return res.text ?? "";
  } catch (e) {
    throw normalizeGeminiError(e, apiModel);
  }
}

// Convert OpenAI-style messages into Gemini's { systemInstruction, contents }:
//   - role 'system'    → collected into systemInstruction (joined if multiple)
//   - role 'user'      → { role: 'user',  parts: [...] }
//   - role 'assistant' → { role: 'model', parts: [...] }
//   - image_url blocks → inlineData parts (raw base64, mime sniffed from the URL)
export function toGeminiMessages(messages) {
  const systemParts = [];
  const contents = [];

  for (const msg of messages || []) {
    if (!msg || !msg.role) continue;
    if (msg.role === "system") {
      const t = textOf(msg.content);
      if (t) systemParts.push(t);
      continue;
    }
    const role = msg.role === "assistant" ? "model" : "user";
    const parts = toParts(msg.content);
    if (parts.length) contents.push({ role, parts });
  }

  return {
    systemInstruction: systemParts.length ? systemParts.join("\n\n") : undefined,
    contents,
  };
}

// A message's content may be a plain string or OpenAI content blocks.
function toParts(content) {
  if (typeof content === "string") return content ? [{ text: content }] : [];
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const block of content) {
    if (!block) continue;
    if (block.type === "text" && block.text) {
      parts.push({ text: block.text });
    } else if (block.type === "image_url") {
      const inline = toInlineData(block.image_url?.url);
      if (inline) parts.push({ inlineData: inline });
    }
    // unknown block types are ignored
  }
  return parts;
}

// Only inline data URLs are supported: data:<mime>;base64,<data>. We strip the
// prefix to raw base64 for Gemini inlineData. Remote http(s) URLs are skipped —
// the admin chat already inlines attachments as data URLs upstream.
function toInlineData(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n");
  }
  return "";
}

export function normalizeGeminiError(e, apiModel) {
  if (e?.name === "AbortError") return e;
  const msg = e?.message || String(e);
  let status =
    typeof e?.status === "number" ? e.status : typeof e?.code === "number" ? e.code : undefined;
  if (status === undefined) {
    // genai embeds the server JSON in the message, e.g. {"error":{"code":404,...}}
    const m = msg.match(/"code"\s*:\s*(\d{3})/) || msg.match(/\b(4\d\d|5\d\d)\b/);
    if (m) status = Number(m[1]);
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return providerError("rate_limit", { provider: "gemini", apiModel });
  }
  if (typeof status === "number" && status >= 400) {
    return providerError("provider_error", { status, body: truncateBody(msg) });
  }
  return providerError("network_error", { message: msg });
}

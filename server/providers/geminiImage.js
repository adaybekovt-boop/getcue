// Gemini image generation (Phase 5).
//
// Native @google/genai SDK ONLY (AQ key). Image output arrives as an inlineData
// part inside candidates[0].content.parts — NOT res.text. Returns a ready-to-
// render data URL. Typed errors match the other providers. Key is never logged.
import { GoogleGenAI } from "@google/genai";
import { providerError } from "./providerErrors.js";
import { normalizeGeminiError } from "./geminiClient.js";

// Parse a data URL into { mimeType, data(base64) }; null if it isn't one.
function parseDataUrl(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

/**
 * Generate an image from a text prompt (+ optional reference image data URL).
 * @returns {Promise<string>} a `data:<mime>;base64,<data>` URL.
 * @throws  typed provider error (rate_limit | provider_error | network_error)
 */
export async function generateGeminiImage({ apiKey, apiModel, prompt, image }) {
  const ai = new GoogleGenAI({ apiKey });

  // A single user turn: the text prompt, plus the reference image if provided.
  const parts = [{ text: prompt }];
  if (image) {
    const inline = parseDataUrl(image);
    if (inline) parts.push({ inlineData: inline });
  }

  let res;
  try {
    res = await ai.models.generateContent({ model: apiModel, contents: parts });
  } catch (e) {
    throw normalizeGeminiError(e, apiModel);
  }

  // Image bytes live in an inlineData part (verified against @google/genai 1.52.0).
  const outParts = res?.candidates?.[0]?.content?.parts || [];
  const imgPart = outParts.find((p) => p?.inlineData?.data);
  if (!imgPart) {
    // No image returned (e.g. the model replied with text / a refusal).
    throw providerError("provider_error", { status: 502, body: "no_image_in_response" });
  }
  const { mimeType, data } = imgPart.inlineData;
  return `data:${mimeType || "image/png"};base64,${data}`;
}

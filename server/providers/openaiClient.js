// OpenAI-compatible transport (Phase 2) — Groq + OpenRouter share this. Plain
// fetch, no SDK. POSTs /chat/completions and returns choices[0].message.content.
// The API key travels only in the Authorization header and is never logged.
import { providerError, truncateBody } from "./providerErrors.js";

export async function callOpenAICompatible({ baseUrl, apiKey, apiModel, messages, signal }) {
  const url = `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: apiModel, messages }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e; // honor cancellation, don't reclassify
    throw providerError("network_error", { message: e?.message || String(e) });
  }

  // 429 → surface as rate_limit; do NOT retry here (caller decides; Groq free
  // tier throttles under rapid calls).
  if (res.status === 429) {
    await res.text().catch(() => {}); // drain the body to free the socket
    throw providerError("rate_limit", { provider: hostOf(baseUrl), apiModel });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw providerError("provider_error", { status: res.status, body: truncateBody(body) });
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw providerError("provider_error", { status: res.status, body: "invalid JSON in response" });
  }
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function hostOf(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return String(baseUrl);
  }
}

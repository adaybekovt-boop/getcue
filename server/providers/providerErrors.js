// Shared typed errors for provider clients (Phase 2). Each carries a stable
// `type` so callers (Phase 3+) can branch without string-matching messages.
// API keys are NEVER attached here or logged.
export function providerError(type, fields = {}) {
  const err = new Error(fields.message || describe(type, fields));
  err.type = type;
  for (const [k, v] of Object.entries(fields)) {
    if (k !== "message" && v !== undefined) err[k] = v;
  }
  return err;
}

function describe(type, f) {
  if (type === "rate_limit") return `rate_limit${f.apiModel ? ` (${f.apiModel})` : ""}`;
  if (type === "provider_error") return `provider_error${f.status ? ` ${f.status}` : ""}`;
  if (type === "network_error") return "network_error";
  return type;
}

export function truncateBody(s, n = 600) {
  return typeof s === "string" ? s.slice(0, n) : "";
}

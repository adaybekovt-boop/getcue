// Admin-chat unlock helpers. The token is an opaque secret compared in
// constant time to defeat timing attacks — never with === (which leaks
// length/timing). The token lives only in process.env.ADMIN_CHAT_TOKEN
// (Cloudflare secret in prod, gitignored .env in local dev).
import crypto from "node:crypto";

export function safeEqual(a, b) {
  const ba = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  // Length check first (lengths aren't the secret). timingSafeEqual requires
  // equal-length buffers and itself runs in constant time.
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// True iff the supplied code matches the configured admin-chat token. Returns
// false when no token is configured (empty env), so nothing unlocks by default.
export function matchesAdminToken(code) {
  const token = process.env.ADMIN_CHAT_TOKEN || "";
  if (!token) return false;
  return safeEqual((code || "").trim(), token);
}

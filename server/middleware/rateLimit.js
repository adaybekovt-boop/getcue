// Simple per-telegram-id rate limiter (in-memory, no dependencies). Blocks
// brute-forcing the admin token on the promo/unlock endpoint.
// Must run AFTER validateInitData (needs req.telegramUser.id).
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 10; // per user per window

const hits = new Map(); // telegramId -> [timestamps]

export function rateLimit(req, res, next) {
  const id = req.telegramUser?.id;
  if (id == null) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const now = Date.now();
  const recent = (hits.get(id) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    return res
      .status(429)
      .json({ error: "rate_limited", message: "Too many attempts. Try again shortly." });
  }
  recent.push(now);
  hits.set(id, recent);
  next();
}

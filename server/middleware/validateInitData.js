// Telegram Mini App initData verification (HMAC-SHA256).
// MANDATORY: without this, anyone could spoof a telegram_id.
// Implements the algorithm from the Telegram WebApp docs, using only Node
// built-ins. Reads BOT_TOKEN from process.env.
import crypto from "node:crypto";

const DAY_SECONDS = 86400;

export function validateInitData(req, res, next) {
  // Local-dev bypass: lets the server be tested without a real Telegram session.
  if (process.env.NODE_ENV === "development" && process.env.BOT_TOKEN === "dev") {
    req.telegramUser = { id: 1090424330, first_name: "Dev" };
    return next();
  }

  const initData = req.header("x-telegram-initdata") || "";
  if (!initData) {
    return res.status(401).json({ error: "Invalid initData" });
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: "BOT_TOKEN not configured" });
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return res.status(401).json({ error: "Invalid initData" });
  }
  params.delete("hash");

  // Sort remaining pairs by key, join with "\n" -> data_check_string.
  const dataCheckString = [...params.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return res.status(401).json({ error: "Invalid initData" });
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > DAY_SECONDS) {
    return res.status(401).json({ error: "initData expired" });
  }

  try {
    req.telegramUser = JSON.parse(params.get("user"));
  } catch {
    return res.status(401).json({ error: "Invalid initData" });
  }

  next();
}

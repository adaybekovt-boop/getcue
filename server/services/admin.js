// Admin check. Admin IDs come from ADMIN_TELEGRAM_IDS (comma-separated).
const adminIds = (process.env.ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdmin(telegramId) {
  return adminIds.includes(String(telegramId));
}

import WebApp from "@twa-dev/sdk";

// The Telegram user object for the current Mini App session, when available:
//   { id, first_name, last_name, username, photo_url, language_code, ... }
// Undefined when running outside Telegram (e.g. local browser preview).
export const tgUser = WebApp.initDataUnsafe?.user || null;

export function displayName(user = tgUser) {
  if (!user) return "Guest";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username || "Telegram user";
}

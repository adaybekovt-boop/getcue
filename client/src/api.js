import WebApp from "@twa-dev/sdk";

export const initData = WebApp.initData || "";

// Thin fetch wrapper that attaches the Telegram initData header and throws
// an Error (with .data / .status) on non-2xx responses.
export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-telegram-initdata": initData,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

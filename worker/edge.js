// Cloudflare edge Worker (NEW — replaces the archived full worker as the deploy
// target). It does two things:
//   1. Serves the static SPA (client/dist) from Cloudflare's edge via ASSETS.
//   2. Proxies every /api/* request to the Node Express backend.
//
// Why proxy instead of running the API here: the admin multi-platform backend
// runs on Node (better-sqlite3 + @google/genai + express) and cannot run inside
// the Workers runtime. So the real API lives on a Node host; set API_ORIGIN to
// that host's URL (e.g. `wrangler secret put API_ORIGIN`, or a dashboard var):
//   API_ORIGIN = https://your-node-host.example.com
//
// The previous full Workers implementation is preserved, untouched, at
// worker/index.js.archived (no longer deployed).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const origin = (env.API_ORIGIN || "").replace(/\/+$/, "");
      if (!origin) {
        // Node backend not wired yet — fail clearly instead of a confusing 404.
        return new Response(JSON.stringify({ error: "api_origin_not_configured" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
      // Forward method, headers (incl. x-telegram-initdata), and body as-is.
      return fetch(origin + url.pathname + url.search, request);
    }

    // Everything else → static assets; unknown routes fall back to index.html
    // via the SPA not_found_handling configured in wrangler.jsonc.
    return env.ASSETS.fetch(request);
  },
};

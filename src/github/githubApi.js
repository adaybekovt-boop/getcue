// Thin fetch wrapper around the GitHub REST API.
// Reads GITHUB_TOKEN from the environment (optional but strongly recommended:
// raises the rate limit from 60 to 5000 requests/hour).

const API_BASE = "https://api.github.com";

function buildHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch a path from the GitHub API (e.g. "/repos/owner/repo").
 * Returns parsed JSON on success; throws a descriptive error on non-2xx.
 */
export async function githubFetch(path) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { headers: buildHeaders() });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Invalid GITHUB_TOKEN");
    }
    if (res.status === 403) {
      throw new Error("GitHub API rate limit hit — add GITHUB_TOKEN to .env");
    }
    if (res.status === 404) {
      throw new Error("Repo not found or is private");
    }
    let detail = "";
    try {
      const body = await res.json();
      if (body && body.message) detail = ` — ${body.message}`;
    } catch {
      // ignore body parse failures
    }
    throw new Error(`GitHub API error ${res.status} for ${path}${detail}`);
  }

  return res.json();
}

export { API_BASE };

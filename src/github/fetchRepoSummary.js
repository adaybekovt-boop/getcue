// Fetch a live repo summary from GitHub and format it the same way the
// hardcoded fixture is shaped, so it can be dropped into the generator prompt.
import { parseRepoUrl } from "./parseRepoUrl.js";
import { githubFetch } from "./githubApi.js";

// Module-level in-memory cache, keyed by `${owner}/${repo}/${sha}`.
const cache = new Map();

const MAX_TREE_ENTRIES = 80;
const README_CHARS = 600;
const MANIFEST_CHARS = 800;

// Paths/extensions that are noise for understanding a codebase.
const NOISE_DIRS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".dart_tool/",
];
const NOISE_FILES = [".flutter-plugins"];
const NOISE_EXTS = [
  ".lock",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".ttf",
  ".woff",
  ".woff2",
];

// Manifests we try, in priority order.
const MANIFESTS = [
  "package.json",
  "pubspec.yaml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
];

// Key filename patterns worth surfacing even when deep in the tree.
const KEY_PATTERNS = [
  /^main\.[^/]+$/i,
  /^app\.[^/]+$/i,
  /^index\.[^/]+$/i,
  /^router\.[^/]+$/i,
  /_repository\.[^/]+$/i,
  /_controller\.[^/]+$/i,
  /_screen\.[^/]+$/i,
  /^package\.json$/i,
  /^pubspec\.yaml$/i,
  /^requirements\.txt$/i,
  /^go\.mod$/i,
  /^Cargo\.toml$/i,
  /^pom\.xml$/i,
  /^build\.gradle$/i,
  /^README/i,
];

function basename(path) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function isNoise(path) {
  const lower = path.toLowerCase();
  if (NOISE_DIRS.some((d) => lower.includes(d))) return true;
  const base = basename(lower);
  if (NOISE_FILES.includes(base)) return true;
  if (NOISE_EXTS.some((ext) => lower.endsWith(ext))) return true;
  return false;
}

function depth(path) {
  return path.split("/").length;
}

function isKeyFile(path) {
  const base = basename(path);
  return KEY_PATTERNS.some((re) => re.test(base));
}

function decodeBase64(content) {
  // GitHub returns base64 with embedded newlines.
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

function buildTree(treeEntries) {
  const blobs = treeEntries
    .filter((e) => e.type === "blob" && e.path)
    .map((e) => e.path)
    .filter((p) => !isNoise(p));

  // Selection: always include shallow entries (depth 1-2), plus key files anywhere.
  const selected = blobs.filter((p) => depth(p) <= 2 || isKeyFile(p));

  // Stable, readable ordering.
  selected.sort((a, b) => a.localeCompare(b));

  const total = selected.length;
  let shown = selected;
  let overflow = 0;
  if (total > MAX_TREE_ENTRIES) {
    shown = selected.slice(0, MAX_TREE_ENTRIES);
    overflow = total - MAX_TREE_ENTRIES;
  }

  let out = shown.join("\n");
  if (overflow > 0) {
    out += `\n... (${overflow} more files)`;
  }
  return out || "(no files matched the filter)";
}

async function tryFetchReadme(owner, repo) {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/readme`);
    const text = decodeBase64(data.content || "");
    return text.slice(0, README_CHARS).trim();
  } catch (err) {
    console.warn(`  (skipped README: ${err.message})`);
    return null;
  }
}

async function tryFetchManifest(owner, repo) {
  for (const filename of MANIFESTS) {
    try {
      const data = await githubFetch(
        `/repos/${owner}/${repo}/contents/${filename}`
      );
      if (data && data.content) {
        const text = decodeBase64(data.content);
        return { filename, text: text.slice(0, MANIFEST_CHARS).trim() };
      }
    } catch {
      // 404 / not present — try the next manifest silently.
    }
  }
  console.warn("  (skipped manifest: none of the known manifests were found)");
  return null;
}

/**
 * fetchRepoSummary(repoUrl) -> formatted summary string.
 */
export async function fetchRepoSummary(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  // Step 2: repo metadata.
  const meta = await githubFetch(`/repos/${owner}/${repo}`);
  const description = meta.description || "no description";
  const defaultBranch = meta.default_branch || "main";
  const language = meta.language || "unknown";
  const topics =
    Array.isArray(meta.topics) && meta.topics.length
      ? meta.topics.join(", ")
      : "none";

  // Step 3: HEAD sha of the default branch.
  const ref = await githubFetch(
    `/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`
  );
  const sha = ref && ref.object && ref.object.sha ? ref.object.sha : null;
  if (!sha) {
    throw new Error(`Could not resolve HEAD sha for ${owner}/${repo}@${defaultBranch}`);
  }

  // Step 4: cache check.
  const cacheKey = `${owner}/${repo}/${sha}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Step 5: recursive tree.
  const treeResp = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  );
  const treeString = buildTree(
    Array.isArray(treeResp.tree) ? treeResp.tree : []
  );

  // Step 6: README excerpt (best-effort).
  const readme = await tryFetchReadme(owner, repo);

  // Step 7: dependency manifest (best-effort).
  const manifest = await tryFetchManifest(owner, repo);

  // Step 8: assemble.
  const lines = [];
  lines.push(`PROJECT: ${meta.name || repo} — ${description}`);
  lines.push(`REPO: https://github.com/${owner}/${repo}`);
  lines.push(`LANGUAGE: ${language} | TOPICS: ${topics}`);
  lines.push("");
  if (manifest) {
    lines.push(`STACK / MANIFEST (${manifest.filename}):`);
    lines.push(manifest.text);
    lines.push("");
  }
  if (readme) {
    lines.push("README (excerpt):");
    lines.push(readme);
    lines.push("");
  }
  lines.push("FILE TREE (abridged):");
  lines.push(treeString);

  const summary = lines.join("\n");

  cache.set(cacheKey, summary);
  return summary;
}

export { cache as _summaryCache };

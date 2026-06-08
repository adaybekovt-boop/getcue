// Fetch a GitHub repo's file tree + selected source files as a single context
// string the admin chat can feed to a model. Reuses githubFetch (token-aware).
// Capped so it fits a free model's context window.
import { parseRepoUrl } from "./parseRepoUrl.js";
import { githubFetch } from "./githubApi.js";

const MAX_FILES = 24; // how many file bodies to include
const MAX_TOTAL_CHARS = 36000; // ~9k tokens overall budget
const PER_FILE_CHARS = 9000; // cap a single file
const MAX_BLOB_BYTES = 100_000; // skip files larger than this in the tree
const NUL = String.fromCharCode(0); // binary-file sniff

const CODE_EXTS = new Set([
  "js","jsx","ts","tsx","mjs","cjs","py","go","rs","java","rb","php","c","cc",
  "cpp","h","hpp","cs","swift","kt","dart","scala","sh","bash","sql","vue",
  "svelte","astro","css","scss","less","html","json","jsonc","yaml","yml",
  "toml","md","txt","gradle","xml",
]);
const NOISE_DIRS = [
  "node_modules/",".git/","dist/","build/","out/",".next/",".wrangler/",
  "vendor/","coverage/",".dart_tool/",".venv/","__pycache__/",
];
const NOISE_FILE_RE = /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(js|css))$/i;
const BINARY_EXTS = new Set([
  "png","jpg","jpeg","gif","svg","ico","webp","bmp","ttf","woff","woff2",
  "pdf","zip","gz","tar","mp4","mov","mp3","wasm","lock",
]);

function ext(p) {
  const base = p.split("/").pop() || "";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}
function depth(p) {
  return p.split("/").length;
}
function isNoise(p) {
  const lower = p.toLowerCase();
  if (NOISE_DIRS.some((d) => lower.includes(d))) return true;
  if (NOISE_FILE_RE.test(p)) return true;
  if (BINARY_EXTS.has(ext(p))) return true;
  return false;
}
function priority(p) {
  const base = (p.split("/").pop() || "").toLowerCase();
  if (/^readme/i.test(base)) return 0;
  if (
    ["package.json","wrangler.jsonc","wrangler.toml","go.mod","cargo.toml",
     "requirements.txt","pyproject.toml","pom.xml","tsconfig.json"].includes(base)
  ) return 1;
  if (["index","main","app","server","router","schema","routes"].some((k) => base.startsWith(k))) return 2;
  return 3 + Math.min(depth(p), 6);
}
function decodeBase64(content) {
  return Buffer.from((content || "").replace(/\n/g, ""), "base64").toString("utf8");
}

export async function fetchRepoContext(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const meta = await githubFetch(`/repos/${owner}/${repo}`);
  const branch = meta.default_branch || "main";
  const ref = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  const sha = ref?.object?.sha;
  if (!sha) throw new Error("Could not resolve repo HEAD.");

  const treeResp = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  );
  const allBlobs = (treeResp.tree || []).filter((e) => e.type === "blob" && e.path);
  const fullTree = allBlobs
    .map((e) => e.path)
    .filter((p) => !isNoise(p))
    .sort((a, b) => a.localeCompare(b));

  const candidates = allBlobs
    .filter(
      (e) =>
        !isNoise(e.path) &&
        CODE_EXTS.has(ext(e.path)) &&
        (e.size == null || e.size <= MAX_BLOB_BYTES)
    )
    .sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));

  const parts = [];
  parts.push(`REPOSITORY: ${owner}/${repo}`);
  if (meta.description) parts.push(`DESCRIPTION: ${meta.description}`);
  parts.push(`LANGUAGE: ${meta.language || "unknown"} · BRANCH: ${branch}`);
  parts.push("");
  parts.push(`FILE TREE (${fullTree.length} files):`);
  parts.push(
    fullTree.slice(0, 200).join("\n") +
      (fullTree.length > 200 ? `\n... (${fullTree.length - 200} more)` : "")
  );
  parts.push("");
  parts.push("FILE CONTENTS:");

  let total = parts.join("\n").length;
  let used = 0;
  let omitted = 0;

  for (const b of candidates) {
    if (used >= MAX_FILES || total >= MAX_TOTAL_CHARS) {
      omitted++;
      continue;
    }
    let content;
    try {
      const blob = await githubFetch(`/repos/${owner}/${repo}/git/blobs/${b.sha}`);
      content = decodeBase64(blob.content);
    } catch {
      continue;
    }
    if (content.includes(NUL)) continue; // skip binary
    let body = content;
    let note = "";
    if (body.length > PER_FILE_CHARS) {
      body = body.slice(0, PER_FILE_CHARS);
      note = `\n... [truncated; ${content.length} chars total]`;
    }
    const block = `\n===== ${b.path} =====\n${body}${note}\n`;
    if (total + block.length > MAX_TOTAL_CHARS && used > 0) {
      omitted++;
      continue;
    }
    parts.push(block);
    total += block.length;
    used++;
  }
  if (omitted > 0) {
    parts.push(`\n[${omitted} more source files omitted to fit the context window]`);
  }

  return {
    repo: `${owner}/${repo}`,
    context: parts.join("\n"),
    fileCount: used,
    totalFiles: fullTree.length,
    chars: total,
  };
}

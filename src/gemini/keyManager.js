// Multi-provider API key manager. Maintains an ordered fallback chain and
// rotates keys out on rate-limit / transient errors.
// (Filename kept as keyManager.js for import compatibility.)
//
// Fallback order: free users -> gemini/siliconflow/qwen, paid users -> gptoss
// first, admins -> kimi first. Gemma is reserved for image-understanding flows.
// Each provider loads keys from its own env var(s). The three OpenRouter
// providers (gptoss/kimi/gemma) are model-specific rotating pools. Keys are
// validated by prefix where the format is known; `exclude` stops one provider's
// prefix from swallowing another's (SiliconFlow "sk-" must NOT match "sk-or-").
//
// Per-key state (in-memory, module-level):
//   rpmCooldownUntil — timestamp; key is in short cooldown until then
//   dailyExhausted   — key has hit a per-day quota

const RPM_COOLDOWN_MS = 65_000; // 65 seconds

// Default order for the public free-trial path.
const PROVIDERS = [
  { name: "gemini", multi: "GEMINI_API_KEYS", single: "GEMINI_API_KEY", prefix: "AIza" },
  {
    name: "siliconflow",
    multi: "SILICONFLOW_API_KEYS",
    single: "SILICONFLOW_API_TOKEN",
    prefix: "sk-",
    exclude: ["sk-or-"],
  },
  // OpenRouter model-specific rotating pools (all keys are sk-or-...).
  { name: "gptoss", multi: "OPENROUTER_GPTOSS_KEYS", single: "OPENROUTER_GPTOSS_KEY", prefix: "sk-or-" },
  { name: "kimi", multi: "OPENROUTER_KIMI_KEYS", single: "OPENROUTER_KIMI_KEY", prefix: "sk-or-" },
  { name: "gemma", multi: "OPENROUTER_GEMMA_KEYS", single: "OPENROUTER_GEMMA_KEY", prefix: "sk-or-" },
  { name: "qwen", multi: "QWEN_API_KEYS", single: "QWEN_API_KEY" },
];

const PROVIDER_BY_NAME = Object.fromEntries(PROVIDERS.map((provider) => [provider.name, provider]));
const PROVIDER_ORDERS = {
  free: ["gemini", "siliconflow", "qwen"],
  paid: ["gptoss", "gemini", "siliconflow", "qwen"],
  admin: ["kimi", "gptoss", "gemini", "siliconflow", "qwen"],
  all: ["gemini", "siliconflow", "gptoss", "kimi", "gemma", "qwen"],
};

let _pools = null; // { gemini: [...], siliconflow: [...], ... }

function parseList(multiVar, singleVar) {
  const multi = process.env[multiVar];
  if (multi && multi.trim()) {
    const keys = multi
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length > 0) return keys;
  }
  const single = process.env[singleVar];
  if (single && single.trim()) return [single.trim()];
  return [];
}

function validate(raw, { name, prefix, exclude = [] }) {
  const ok = [];
  for (const k of raw) {
    if (exclude.some((x) => k.startsWith(x))) continue; // belongs to another provider
    if (prefix && !k.startsWith(prefix)) {
      console.warn(
        `[KeyManager] Skipping ${name} key (expected "${prefix}" prefix): ...${k.slice(-6)}`
      );
      continue;
    }
    ok.push(k);
  }
  return ok;
}

function loadPools() {
  const pools = {};
  let total = 0;
  for (const p of PROVIDERS) {
    const keys = validate(parseList(p.multi, p.single), p);
    pools[p.name] = keys.map((key) => ({ key, rpmCooldownUntil: 0, dailyExhausted: false }));
    total += keys.length;
  }
  if (total === 0) {
    throw new Error(
      "No valid API keys found. Set at least one of: GEMINI_API_KEYS (AIza...), " +
        "SILICONFLOW_API_KEYS (sk-...), OPENROUTER_GPTOSS_KEYS / OPENROUTER_KIMI_KEYS / " +
        "OPENROUTER_GEMMA_KEYS (sk-or-...), or QWEN_API_KEY in .env."
    );
  }
  return pools;
}

function getPools() {
  if (!_pools) _pools = loadPools();
  return _pools;
}

function firstAvailable(pool, now) {
  return pool.find((k) => !k.dailyExhausted && k.rpmCooldownUntil <= now);
}

/**
 * Returns { key, provider } for the first usable key, walking the fallback
 * chain in priority order. Throws a descriptive error if nothing is available.
 */
export function getActiveKey() {
  return getActiveKeyForTier("free");
}

export function getActiveKeyForTier(tier = "free") {
  const pools = getPools();
  const now = Date.now();
  const order = PROVIDER_ORDERS[tier] || PROVIDER_ORDERS.free;
  for (const name of order) {
    const entry = firstAvailable(pools[name] || [], now);
    if (entry) return { key: entry.key, provider: name };
  }
  throw new Error(
    `No ${tier} API keys available — configured providers are rate-limited or exhausted.\n` +
      getPoolStatus()
  );
}

/**
 * Returns { key, provider } for the first usable key in ONE specific provider's
 * pool (no chain fallback). Used by features pinned to a single model (e.g. the
 * admin chat → kimi pool). Throws when that pool has no capacity.
 */
export function getActiveKeyForProvider(provider) {
  const pools = getPools();
  const entry = firstAvailable(pools[provider] || [], Date.now());
  if (!PROVIDER_BY_NAME[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (entry) return { key: entry.key, provider };
  throw new Error(`No ${provider} keys available — pool exhausted.`);
}

/**
 * Sidelines a key after a failure. Per-day quota marks it exhausted; everything
 * else (per-minute limit, transient 5xx, auth/availability errors) gets a short
 * cooldown so the chain can rotate to the next provider.
 */
export function reportError(key, provider, error) {
  const pools = getPools();
  const entry = (pools[provider] || []).find((k) => k.key === key);
  const msg = typeof error === "string" ? error : (error && error.message) || String(error);
  const status =
    error && typeof error === "object" ? error.status || error.response?.status : null;

  let type;
  if (/PerDay|per day|daily|quota.*day/i.test(msg)) {
    type = "daily quota";
    if (entry) entry.dailyExhausted = true;
  } else if (/PerMinute|per minute|\brpm\b/i.test(msg)) {
    type = "per-minute limit";
    if (entry) entry.rpmCooldownUntil = Date.now() + RPM_COOLDOWN_MS;
  } else {
    type = status ? `HTTP ${status}` : "transient error";
    if (entry) entry.rpmCooldownUntil = Date.now() + RPM_COOLDOWN_MS;
  }

  console.warn(
    `[KeyManager] ${provider} key ...${key.slice(-6)} sidelined (${type}). Rotating.`
  );
}

function poolCounts(pool, now) {
  let active = 0;
  let rpm = 0;
  let daily = 0;
  for (const k of pool) {
    if (k.dailyExhausted) daily++;
    else if (k.rpmCooldownUntil > now) rpm++;
    else active++;
  }
  return { active, rpm, daily };
}

/**
 * One-line status across all configured pools (providers with zero keys are
 * omitted to keep the line readable).
 */
export function getPoolStatus() {
  const pools = getPools();
  const now = Date.now();
  const parts = [];
  for (const p of PROVIDERS) {
    const pool = pools[p.name] || [];
    if (pool.length === 0) continue;
    const c = poolCounts(pool, now);
    parts.push(`${p.name}: ${c.active} active, ${c.rpm} rpm, ${c.daily} daily`);
  }
  return parts.join(" | ") || "no keys configured";
}

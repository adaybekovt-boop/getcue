// Multi-provider API key manager (Gemini + SiliconFlow). Rotates automatically
// on 429 errors and falls back from Gemini to SiliconFlow when all Gemini keys
// are out. (Filename kept as keyManager.js for import compatibility.)
//
// Key provider is inferred by prefix:
//   "AIza..." -> gemini      "sk-..." -> siliconflow
//
// Per-key state (in-memory, module-level):
//   rpmCooldownUntil — timestamp; key is in per-minute cooldown until then
//   dailyExhausted   — key has hit the per-day quota

const RPM_COOLDOWN_MS = 65_000; // 65 seconds

let _pools = null; // { gemini: [...], siliconflow: [...] }

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

function filterByPrefix(raw, prefix, providerName) {
  const ok = [];
  for (const k of raw) {
    if (k.startsWith(prefix)) ok.push(k);
    else
      console.warn(
        `[KeyManager] Skipping ${providerName} key (expected "${prefix}" prefix): ...${k.slice(
          -6
        )}`
      );
  }
  return ok;
}

function loadKeys() {
  const gemini = filterByPrefix(
    parseList("GEMINI_API_KEYS", "GEMINI_API_KEY"),
    "AIza",
    "Gemini"
  );
  const siliconflow = filterByPrefix(
    parseList("SILICONFLOW_API_KEYS", "SILICONFLOW_API_TOKEN"),
    "sk-",
    "SiliconFlow"
  );

  if (gemini.length === 0 && siliconflow.length === 0) {
    throw new Error(
      "No valid API keys found. Set GEMINI_API_KEYS / GEMINI_API_KEY (AIza...) " +
        "or SILICONFLOW_API_KEYS / SILICONFLOW_API_TOKEN (sk-...) in .env."
    );
  }
  return { gemini, siliconflow };
}

function getPools() {
  if (_pools) return _pools;
  const { gemini, siliconflow } = loadKeys();
  const mk = (key) => ({ key, rpmCooldownUntil: 0, dailyExhausted: false });
  _pools = { gemini: gemini.map(mk), siliconflow: siliconflow.map(mk) };
  return _pools;
}

function firstAvailable(pool, now) {
  return pool.find((k) => !k.dailyExhausted && k.rpmCooldownUntil <= now);
}

/**
 * Returns { key, provider } for the first usable key, trying Gemini first and
 * falling back to SiliconFlow. Throws a descriptive error if neither has
 * capacity.
 */
export function getActiveKey() {
  const pools = getPools();
  const now = Date.now();

  const g = firstAvailable(pools.gemini, now);
  if (g) return { key: g.key, provider: "gemini" };

  const s = firstAvailable(pools.siliconflow, now);
  if (s) return { key: s.key, provider: "siliconflow" };

  throw new Error(
    "No API keys available — all providers are rate-limited or exhausted.\n" +
      getPoolStatus()
  );
}

/**
 * Records a 429 against a key for the given provider, deciding per-minute vs
 * per-day from the error message, and rotates the key out accordingly.
 */
export function reportError(key, provider, error) {
  const pools = getPools();
  const pool = pools[provider] || [];
  const entry = pool.find((k) => k.key === key);
  const msg =
    typeof error === "string" ? error : (error && error.message) || String(error);

  let type;
  if (/PerMinute|rpm/i.test(msg)) {
    type = "RPM";
    if (entry) entry.rpmCooldownUntil = Date.now() + RPM_COOLDOWN_MS;
  } else if (/PerDay|daily/i.test(msg)) {
    type = "daily";
    if (entry) entry.dailyExhausted = true;
  } else {
    // Unknown 429 — treat as RPM cooldown (safe default).
    type = "RPM (unknown 429)";
    if (entry) entry.rpmCooldownUntil = Date.now() + RPM_COOLDOWN_MS;
  }

  console.warn(
    `[KeyManager] ${provider} key ...${key.slice(-6)} hit ${type} limit. Rotating.`
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
 * One-line status across both pools.
 */
export function getPoolStatus() {
  const pools = getPools();
  const now = Date.now();
  const g = poolCounts(pools.gemini, now);
  const s = poolCounts(pools.siliconflow, now);
  return (
    `Gemini: ${g.active} active, ${g.rpm} rpm, ${g.daily} daily | ` +
    `SiliconFlow: ${s.active} active, ${s.rpm} rpm, ${s.daily} daily`
  );
}

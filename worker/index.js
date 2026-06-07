import { generatorPrompt } from "../src/config/generatorPrompt.js";
import { repoSummary } from "../src/fixtures/repoSummary.js";
import { strategyCards, strategyKeys } from "../src/config/strategyCards.js";

const PACKAGES = [
  { id: "pack_10", stars: 10, credits: 1500, label: "Starter" },
  { id: "pack_25", stars: 25, credits: 3500, label: "Basic" },
  { id: "pack_50", stars: 50, credits: 6000, label: "Standard" },
  { id: "pack_100", stars: 100, credits: 10000, label: "Pro" },
  { id: "pack_200", stars: 200, credits: 18000, label: "Max" },
];

const GENERATION_COST = {
  "claude-standard": 50,
  "claude-reasoning": 100,
  "gpt-standard": 50,
  "gpt-reasoning": 100,
  gemini: 50,
  kimi: 50,
};

const MAX_TASK_CHARS = 2000;
const DAY_SECONDS = 86400;
const GEMINI_MODEL = "gemini-2.5-flash";
const SILICONFLOW_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const SILICONFLOW_BASE_URL = "https://api.siliconflow.com/v1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, runtime: "cloudflare-worker" });
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        const telegramUser = await requireTelegramUser(request, env);
        const user = await getUser(env.DB, telegramUser.id);
        return json({
          telegramUser,
          credits: user.credits,
          isAdmin: isAdmin(env, telegramUser.id),
          packages: PACKAGES,
          generationCost: GENERATION_COST,
        });
      }

      if (url.pathname === "/api/payment/packages" && request.method === "GET") {
        return json(PACKAGES);
      }

      if (
        url.pathname === "/api/payment/create-invoice" &&
        request.method === "POST"
      ) {
        const telegramUser = await requireTelegramUser(request, env);
        const body = await readJson(request);
        const pkg = PACKAGES.find((p) => p.id === body.packageId);
        if (!pkg) return json({ error: "invalid_package" }, 400);
        const invoiceLink = await createInvoiceLink(env, telegramUser.id, pkg);
        return json({ invoiceLink, package: pkg });
      }

      if (url.pathname === "/api/generate" && request.method === "POST") {
        return handleGenerate(request, env);
      }

      if (url.pathname === "/api/webhook/telegram" && request.method === "POST") {
        return handleTelegramWebhook(request, env);
      }

      if (
        url.pathname === "/api/admin/stats" &&
        request.method === "GET"
      ) {
        const telegramUser = await requireTelegramUser(request, env);
        if (!isAdmin(env, telegramUser.id)) return json({ error: "forbidden" }, 403);
        return json(await getStats(env.DB));
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.publicMessage }, error.status);
      }
      console.error("[Worker] request failed:", error);
      return json({ error: "internal_error" }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleGenerate(request, env) {
  const telegramUser = await requireTelegramUser(request, env);
  const admin = isAdmin(env, telegramUser.id);
  const body = await readJson(request);
  const { strategy, task, repoUrl } = body;

  if (!strategyKeys.includes(strategy)) return json({ error: "invalid_strategy" }, 400);
  if (typeof task !== "string" || !task.trim() || task.length > MAX_TASK_CHARS) {
    return json({ error: "invalid_task" }, 400);
  }
  if (repoUrl && !isValidGithubRepoUrl(repoUrl)) {
    return json({ error: "invalid_repoUrl" }, 400);
  }

  const cost = GENERATION_COST[strategy] ?? 50;
  const user = await getUser(env.DB, telegramUser.id);
  if (!admin && user.credits < cost) {
    return json({ error: "insufficient_credits", credits: user.credits, required: cost }, 402);
  }

  let result;
  try {
    const summary = repoUrl ? await fetchRepoSummary(env, repoUrl) : repoSummary;
    const prompt = buildPrompt(strategy, { id: "user", task }, summary);
    result = await generateText(env, prompt);
  } catch (error) {
    console.error("[Generate] failed:", error);
    return json({ error: "generation_failed" }, 500);
  }

  const creditResult = admin
    ? { ok: true, credits: user.credits, spent: 0 }
    : await deductCredits(env.DB, telegramUser.id, strategy);
  if (!creditResult.ok) {
    return json(
      {
        error: "insufficient_credits",
        credits: creditResult.credits,
        required: creditResult.required,
      },
      402
    );
  }

  return json({
    result,
    credits: creditResult.credits,
    spent: creditResult.spent,
    isAdmin: admin,
  });
}

async function handleTelegramWebhook(request, env) {
  if (!env.WEBHOOK_SECRET) {
    console.error("[Webhook] WEBHOOK_SECRET is not configured; refusing update");
    return json({ error: "webhook_not_configured" }, 503);
  }

  const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (provided !== env.WEBHOOK_SECRET) return json({ error: "unauthorized" }, 401);

  const update = await readJson(request);

  try {
    if (update.pre_checkout_query) {
      try {
        const { pkg } = parseInvoicePayload(update.pre_checkout_query.invoice_payload);
        if (
          update.pre_checkout_query.currency !== "XTR" ||
          Number(update.pre_checkout_query.total_amount) !== pkg.stars
        ) {
          throw new Error("amount_mismatch");
        }
        await answerPreCheckout(env, update.pre_checkout_query.id, true);
      } catch (error) {
        console.warn("[Payment] Rejected pre-checkout:", error.message);
        await answerPreCheckout(
          env,
          update.pre_checkout_query.id,
          false,
          "Invalid payment package"
        );
      }
      return json({ ok: true });
    }

    const successfulPayment = update.message?.successful_payment;
    if (successfulPayment) {
      const payment = validateSuccessfulPayment(successfulPayment);
      const result = await addCredits(
        env.DB,
        payment.telegramId,
        payment.starsPaid,
        payment.creditsToAdd,
        payment.payload,
        payment.paymentId
      );
      if (result.duplicate) {
        console.log(`[Payment] Duplicate payment ignored: ${payment.paymentId}`);
      } else {
        console.log(
          `[Payment] User ${payment.telegramId} bought ${payment.creditsToAdd} credits. Balance: ${result.credits}`
        );
      }
    }
  } catch (error) {
    console.error("[Webhook] error:", error);
  }

  return json({ ok: true });
}

async function requireTelegramUser(request, env) {
  if (env.NODE_ENV === "development" && env.BOT_TOKEN === "dev") {
    return { id: 1090424330, first_name: "Dev" };
  }

  const initData = request.headers.get("x-telegram-initdata") || "";
  if (!initData) throw new HttpError(401, "Invalid initData");
  if (!env.BOT_TOKEN) throw new HttpError(500, "BOT_TOKEN not configured");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new HttpError(401, "Invalid initData");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacBytes("WebAppData", env.BOT_TOKEN);
  const computedHash = await hmacHex(secretKey, dataCheckString);
  if (computedHash !== hash) throw new HttpError(401, "Invalid initData");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > DAY_SECONDS) {
    throw new HttpError(401, "initData expired");
  }

  try {
    return JSON.parse(params.get("user"));
  } catch {
    throw new HttpError(401, "Invalid initData");
  }
}

async function getUser(db, telegramId) {
  const id = Number(telegramId);
  const row = await db
    .prepare("SELECT credits, total_earned FROM users WHERE telegram_id = ?")
    .bind(id)
    .first();
  if (row) return { credits: row.credits, totalEarned: row.total_earned };
  await db.prepare("INSERT INTO users (telegram_id) VALUES (?)").bind(id).run();
  return { credits: 150, totalEarned: 0 };
}

async function deductCredits(db, telegramId, strategy) {
  const id = Number(telegramId);
  const cost = GENERATION_COST[strategy] ?? 50;
  await getUser(db, id);
  const result = await db
    .prepare(
      "UPDATE users SET credits = credits - ?, updated_at = unixepoch() WHERE telegram_id = ? AND credits >= ?"
    )
    .bind(cost, id, cost)
    .run();
  if (!result.meta?.changes) {
    const user = await getUser(db, id);
    return { ok: false, credits: user.credits, required: cost };
  }
  await db
    .prepare("INSERT INTO usage_log (telegram_id, strategy, credits_spent) VALUES (?, ?, ?)")
    .bind(id, strategy, cost)
    .run();
  const user = await getUser(db, id);
  return { ok: true, credits: user.credits, spent: cost };
}

async function addCredits(db, telegramId, starsPaid, creditsToAdd, payload, paymentId) {
  const id = Number(telegramId);
  await getUser(db, id);
  const insert = await db
    .prepare(
      "INSERT OR IGNORE INTO purchase_log (payment_id, telegram_id, stars_paid, credits_added, payload) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(paymentId || null, id, starsPaid, creditsToAdd, JSON.stringify(payload))
    .run();
  if (!insert.meta?.changes) {
    const user = await getUser(db, id);
    return { ok: true, duplicate: true, credits: user.credits };
  }
  await db
    .prepare(
      "UPDATE users SET credits = credits + ?, total_earned = total_earned + ?, updated_at = unixepoch() WHERE telegram_id = ?"
    )
    .bind(creditsToAdd, creditsToAdd, id)
    .run();
  const user = await getUser(db, id);
  return { ok: true, duplicate: false, credits: user.credits };
}

async function getStats(db) {
  const totalUsers = await db.prepare("SELECT COUNT(*) AS c FROM users").first();
  const totalCredits = await db
    .prepare("SELECT COALESCE(SUM(credits), 0) AS s FROM users")
    .first();
  const totalGenerations = await db.prepare("SELECT COUNT(*) AS c FROM usage_log").first();
  const todayGenerations = await db
    .prepare("SELECT COUNT(*) AS c FROM usage_log WHERE created_at >= unixepoch('now', 'start of day')")
    .first();
  const totalRevenue = await db
    .prepare("SELECT COALESCE(SUM(stars_paid), 0) AS s FROM purchase_log")
    .first();

  return {
    totalUsers: totalUsers.c,
    totalCreditsInCirculation: totalCredits.s,
    totalGenerations: totalGenerations.c,
    todayGenerations: todayGenerations.c,
    totalRevenue: totalRevenue.s,
  };
}

async function createInvoiceLink(env, telegramId, pkg) {
  const payload = JSON.stringify({
    v: 1,
    telegramId: Number(telegramId),
    packageId: pkg.id,
    credits: pkg.credits,
    stars: pkg.stars,
  });
  return callTelegram(env, "createInvoiceLink", {
    title: "Cue " + pkg.label,
    description: pkg.credits.toLocaleString() + " credits for prompt generation",
    payload,
    currency: "XTR",
    prices: [{ label: pkg.credits.toLocaleString() + " credits", amount: pkg.stars }],
  });
}

function parseInvoicePayload(invoicePayload) {
  const payload = JSON.parse(invoicePayload);
  const pkg = PACKAGES.find((p) => p.id === payload.packageId);
  if (!pkg) throw new Error("unknown_package");
  if (!Number.isFinite(Number(payload.telegramId)) || Number(payload.telegramId) <= 0) {
    throw new Error("invalid_telegram_id");
  }
  if (Number(payload.credits) !== pkg.credits) throw new Error("credits_mismatch");
  if (Number(payload.stars) !== pkg.stars) throw new Error("stars_mismatch");
  return { payload, pkg };
}

function validateSuccessfulPayment(successfulPayment) {
  const { payload, pkg } = parseInvoicePayload(successfulPayment.invoice_payload);
  if (successfulPayment.currency !== "XTR") throw new Error("invalid_currency");
  if (Number(successfulPayment.total_amount) !== pkg.stars) {
    throw new Error("amount_mismatch");
  }
  const paymentId =
    successfulPayment.telegram_payment_charge_id ||
    successfulPayment.provider_payment_charge_id;
  if (!paymentId) throw new Error("missing_payment_id");
  return {
    telegramId: Number(payload.telegramId),
    packageId: pkg.id,
    starsPaid: pkg.stars,
    creditsToAdd: pkg.credits,
    payload,
    paymentId,
  };
}

async function answerPreCheckout(env, queryId, ok, errorMessage) {
  const body = { pre_checkout_query_id: queryId, ok };
  if (!ok && errorMessage) body.error_message = errorMessage;
  return callTelegram(env, "answerPreCheckoutQuery", body);
}

async function callTelegram(env, method, body) {
  if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN not configured");
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed`);
  return data.result;
}

async function generateText(env, prompt) {
  const geminiKeys = parseKeys(env.GEMINI_API_KEYS || env.GEMINI_API_KEY);
  for (const key of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5 },
          }),
        }
      );
      if (response.status === 429) continue;
      if (!response.ok) throw new Error(`Gemini failed: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
      if (text?.trim()) return text.trim();
    } catch (error) {
      console.warn("[Gemini] key failed:", error.message);
    }
  }

  const siliconKeys = parseKeys(env.SILICONFLOW_API_KEYS || env.SILICONFLOW_API_TOKEN);
  for (const key of siliconKeys) {
    try {
      const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: SILICONFLOW_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 2000,
        }),
      });
      if (response.status === 429) continue;
      if (!response.ok) throw new Error(`SiliconFlow failed: ${response.status}`);
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text?.trim()) return text.trim();
    } catch (error) {
      console.warn("[SiliconFlow] key failed:", error.message);
    }
  }

  throw new Error("No generation provider returned a response");
}

async function fetchRepoSummary(env, repoUrl) {
  const { owner, repo } = parseGithubRepoUrl(repoUrl);
  const headers = env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "Cue" }
    : { "User-Agent": "Cue" };
  const meta = await githubJson(`/repos/${owner}/${repo}`, headers);
  const readme = await githubJson(`/repos/${owner}/${repo}/readme`, headers).catch(() => null);
  const readmeText = readme?.content
    ? atob(readme.content.replace(/\n/g, "")).slice(0, 600)
    : null;
  return [
    `PROJECT: ${meta.name || repo} - ${meta.description || "no description"}`,
    `REPO: https://github.com/${owner}/${repo}`,
    `LANGUAGE: ${meta.language || "unknown"}`,
    "",
    readmeText ? `README excerpt:\n${readmeText}` : "",
  ].join("\n");
}

async function githubJson(path, headers) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
  return response.json();
}

function parseGithubRepoUrl(repoUrl) {
  const match = String(repoUrl)
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)(?:\.git)?(?:[/?#].*)?$/i);
  if (!match) throw new Error("invalid_repoUrl");
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

function isValidGithubRepoUrl(repoUrl) {
  try {
    parseGithubRepoUrl(repoUrl);
    return true;
  } catch {
    return false;
  }
}

function isAdmin(env, telegramId) {
  return String(env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(String(telegramId));
}

function parseKeys(value) {
  return String(value || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-telegram-initdata, X-Telegram-Bot-Api-Secret-Token",
  };
}

async function hmacBytes(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

class HttpError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function buildPrompt(strategy, task, summary = repoSummary) {
  const card = strategyCards[strategy];
  if (!card) throw new Error("Unknown strategy");
  return generatorPrompt
    .replace("{strategy_card}", card)
    .replace("{repo_summary}", summary)
    .replace("{user_task}", task.task);
}

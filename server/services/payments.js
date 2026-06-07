// Telegram Stars payment helpers (Bot API calls via fetch).
import { PACKAGES } from "./users.js";

function apiBase() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN not configured");
  return `https://api.telegram.org/bot${token}`;
}

async function callTelegram(method, body) {
  const res = await fetch(`${apiBase()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(
      `Telegram ${method} failed: ${data.description || res.status}`
    );
  }
  return data.result;
}

export async function createInvoiceLink(telegramId, packageId) {
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error(`Unknown package: ${packageId}`);

  const payload = createInvoicePayload(telegramId, packageId);

  return callTelegram("createInvoiceLink", {
    title: "Cue " + pkg.label,
    description: pkg.credits.toLocaleString() + " credits for prompt generation",
    payload,
    currency: "XTR",
    prices: [{ label: pkg.credits.toLocaleString() + " credits", amount: pkg.stars }],
  });
}

export function createInvoicePayload(telegramId, packageId) {
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error(`Unknown package: ${packageId}`);

  return JSON.stringify({
    v: 1,
    telegramId: Number(telegramId),
    packageId,
    credits: pkg.credits,
    stars: pkg.stars,
  });
}

export function parseInvoicePayload(invoicePayload) {
  let payload;
  try {
    payload = JSON.parse(invoicePayload);
  } catch {
    throw new Error("invalid_invoice_payload");
  }

  const pkg = PACKAGES.find((p) => p.id === payload.packageId);
  if (!pkg) throw new Error("unknown_package");
  if (!Number.isFinite(Number(payload.telegramId)) || Number(payload.telegramId) <= 0) {
    throw new Error("invalid_telegram_id");
  }
  if (Number(payload.credits) !== pkg.credits) throw new Error("credits_mismatch");
  if (Number(payload.stars) !== pkg.stars) throw new Error("stars_mismatch");

  return { payload, package: pkg };
}

export function validateSuccessfulPayment(successfulPayment) {
  const { payload, package: pkg } = parseInvoicePayload(
    successfulPayment.invoice_payload
  );

  if (successfulPayment.currency !== "XTR") {
    throw new Error("invalid_currency");
  }
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

export async function answerPreCheckout(queryId, ok, errorMessage) {
  const body = { pre_checkout_query_id: queryId, ok };
  if (!ok && errorMessage) body.error_message = errorMessage;
  return callTelegram("answerPreCheckoutQuery", body);
}

export async function setWebhook(webhookUrl) {
  const body = { url: webhookUrl };
  if (process.env.WEBHOOK_SECRET) {
    body.secret_token = process.env.WEBHOOK_SECRET;
  }
  // Return the full response (including ok/description) for visibility.
  const res = await fetch(`${apiBase()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

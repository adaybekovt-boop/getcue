import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cue-payment-smoke-"));
process.env.DB_PATH = path.join(tmpDir, "cue.db");

const { createInvoicePayload, validateSuccessfulPayment } = await import(
  "../server/services/payments.js"
);
const { addCredits, deductCredits, getCredits } = await import(
  "../server/services/users.js"
);

const telegramId = 424242;
const payload = createInvoicePayload(telegramId, "pack_10");
const payment = validateSuccessfulPayment({
  invoice_payload: payload,
  currency: "XTR",
  total_amount: 10,
  telegram_payment_charge_id: "smoke-payment-1",
});

assert.equal(payment.telegramId, telegramId);
assert.equal(payment.starsPaid, 10);
assert.equal(payment.creditsToAdd, 1500);

assert.equal(getCredits(telegramId), 150);

const firstCredit = addCredits(
  payment.telegramId,
  payment.starsPaid,
  payment.creditsToAdd,
  payment.payload,
  payment.paymentId
);
assert.deepEqual(firstCredit, {
  ok: true,
  duplicate: false,
  credits: 1650,
});

const duplicateCredit = addCredits(
  payment.telegramId,
  payment.starsPaid,
  payment.creditsToAdd,
  payment.payload,
  payment.paymentId
);
assert.deepEqual(duplicateCredit, {
  ok: true,
  duplicate: true,
  credits: 1650,
});

assert.deepEqual(deductCredits(telegramId, "gpt-reasoning"), {
  ok: true,
  credits: 1550,
  spent: 100,
});

const poorUser = 111;
assert.deepEqual(deductCredits(poorUser, "gpt-reasoning"), {
  ok: true,
  credits: 50,
  spent: 100,
});
assert.deepEqual(deductCredits(poorUser, "gpt-reasoning"), {
  ok: false,
  credits: 50,
  required: 100,
});

assert.throws(
  () =>
    validateSuccessfulPayment({
      invoice_payload: payload,
      currency: "XTR",
      total_amount: 9,
      telegram_payment_charge_id: "bad-payment",
    }),
  /amount_mismatch/
);

process.env.WEBHOOK_SECRET = "";
const { default: app } = await import("../server/index.js");

const server = app.listen(0);
try {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/webhook/telegram`;
  const webhookPayload = {
    message: {
      successful_payment: {
        invoice_payload: createInvoicePayload(777, "pack_10"),
        currency: "XTR",
        total_amount: 10,
        telegram_payment_charge_id: "webhook-smoke-payment-1",
      },
    },
  };

  const withoutSecret = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });
  assert.equal(withoutSecret.status, 503);
  assert.equal(getCredits(777), 150);

  process.env.WEBHOOK_SECRET = "smoke-secret";
  const withSecret = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "smoke-secret",
    },
    body: JSON.stringify(webhookPayload),
  });
  assert.equal(withSecret.status, 200);
  assert.equal(getCredits(777), 1650);

  const duplicate = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "smoke-secret",
    },
    body: JSON.stringify(webhookPayload),
  });
  assert.equal(duplicate.status, 200);
  assert.equal(getCredits(777), 1650);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("payment smoke ok");

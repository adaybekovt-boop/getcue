# Cue Telegram Mini App

Cue is a Telegram Mini App for generating model-specific engineering prompts.
It has:

- Express backend with Telegram Mini App auth validation.
- SQLite credit ledger.
- Telegram Stars payments.
- React/Vite client.
- Gemini primary generation with SiliconFlow fallback.
- Optional GitHub repo summary context.

## Requirements

- Node.js 20+
- Telegram bot token from BotFather
- At least one generation provider key:
  - `GEMINI_API_KEYS` / `GEMINI_API_KEY`
  - or `SILICONFLOW_API_KEYS` / `SILICONFLOW_API_TOKEN`

## Setup

```bash
npm install
npm --prefix client install
cp .env.example .env
```

Fill `.env` with real secrets. Do not commit `.env`.

Important variables:

```bash
BOT_TOKEN=...
WEBHOOK_SECRET=...
ADMIN_TELEGRAM_IDS=123456789,987654321
DB_PATH=./data/cue.db
GEMINI_API_KEYS=...
SILICONFLOW_API_KEYS=...
GITHUB_TOKEN=...
```

## Run Locally

Backend:

```bash
npm start
```

Client:

```bash
npm --prefix client run dev
```

The Vite dev server proxies `/api` to `http://localhost:3000`.

## Build

```bash
npm run build
npm run client:build
```

## Payment Safety

Stars packages live in `server/services/users.js`.

Current packages (value per Star increases with size):

- `pack_10`: 10 Stars -> 1500 credits
- `pack_25`: 25 Stars -> 4000 credits (+7%)
- `pack_50`: 50 Stars -> 8500 credits (+13%)
- `pack_100`: 100 Stars -> 18000 credits (+20%)
- `pack_200`: 200 Stars -> 40000 credits (+33%)

The first paid purchase grants +50% extra credits (`FIRST_PURCHASE_BONUS`).
Generation endpoints deduct credits atomically BEFORE calling the provider and
refund on provider failure (closes the concurrent-spend race).

Payment handling verifies:

- Telegram payment currency is `XTR`.
- Telegram `total_amount` matches the selected package.
- Payload credits and stars match server-side package config.
- `telegram_payment_charge_id` / `provider_payment_charge_id` is recorded once.
- Duplicate webhook delivery does not add credits twice.

Credit spending is atomic and cannot move a user below zero.

## Webhook Setup

Webhook setup is admin-only:

```http
POST /api/admin/setup-webhook
Content-Type: application/json
x-telegram-initdata: <admin initData>

{ "url": "https://your-domain.example" }
```

The server registers:

```text
https://your-domain.example/api/webhook/telegram
```

`WEBHOOK_SECRET` is required for payment webhooks. If it is missing, the webhook
fails closed and refuses all Telegram updates.

## Checks

```bash
npm run test:payments
npm run client:build
npm audit --omit=dev
npm --prefix client audit --omit=dev
```

`npm run test:payments` uses a temporary SQLite database and does not call
Telegram or any paid AI provider.

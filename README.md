# Cue

**Cue is a Telegram Mini App for AI prompt engineering.** You give it a rough
intent, and it compiles a clean, model-specific prompt tuned for the target
model — Claude, GPT, Gemini, or Kimi. Each model gets a prompt written the way
*that* model responds best to, not a one-size-fits-all template.

## What it does

Cue turns a half-formed idea into a production-ready prompt. Describe the task in
plain language, pick the target model, and Cue handles the structure, framing,
and conventions that model expects — XML tags and explicit scope for Claude,
different shaping for GPT, Gemini, and Kimi.

It also works with images: extract a reusable prompt from a picture, or generate
an image from a description with an optional reference.

## Features

- **Text → Prompt** — compile a rough intent into a model-specific engineering
  prompt, with optional GitHub repository context for code-aware prompts.
- **Image → Prompt** — turn an uploaded image into a reusable prompt, with a
  gallery of trending styles (toy figure, cinematic, vintage film, and more).
- **Prompt → Image** — generate an image from a description plus an optional
  reference image.
- **History** — every generated prompt, kept and searchable.
- **Credits & payments** — a credit ledger with Telegram Stars purchases and
  promo codes.
- **Admin tools** — a hidden multi-platform admin chat (OpenRouter, Groq, and
  Gemini) with file/image attachments and repo-aware commands, plus a monitoring
  panel for API-key quotas and model health.

## How prompts are tuned

Cue keeps a strategy per target model that encodes how that model behaves:

- **Claude** — literal instruction-following; XML-tag structure
  (`<context>`, `<task>`, `<constraints>`, `<output_format>`), explicit scope,
  context before the request.
- **GPT / Gemini / Kimi** — each with its own framing, structure, and reasoning
  conventions.

The result is a prompt that reads like it was written by someone who knows the
target model, not a generic wrapper.

## Architecture

- **Edge backend** — a Cloudflare Worker serves the app and runs the entire API
  on the edge, backed by **Cloudflare D1**. It handles generation, the admin
  multi-platform chat, vision, image generation, the credit ledger, and Telegram
  Stars payments.
- **Client** — a React + Vite single-page app embedded as a Telegram Mini App
  (`@twa-dev/sdk`), with a bottom-nav layout (Text / Image / History / Settings).
- **Auth** — Telegram Mini App `initData` is verified server-side with HMAC-SHA256
  on every authenticated request, so a `telegram_id` can't be spoofed.
- **Generation providers** — OpenRouter (free model pool) and Gemini, with
  automatic key rotation and provider fallback. Image generation uses
  `gemini-2.5-flash-image`.

## Tech stack

- **Frontend:** React 18, Vite, React Router, `@twa-dev/sdk`
- **Backend:** Cloudflare Workers, D1 (SQLite at the edge)
- **AI providers:** OpenRouter, Google Gemini, Groq
- **Platform:** Telegram Mini Apps + Telegram Stars

## Payments & credits

Generation costs credits; credits are bought with Telegram Stars or granted via
promo codes. The model is designed to be safe under concurrency and duplicate
delivery:

- Credits are deducted **atomically before** a generation runs and refunded if
  the provider fails — a balance can never go below zero or fund more work than
  it paid for.
- Payments verify the currency (`XTR`), the amount against the selected package,
  and the payload server-side; the first paid purchase grants a bonus.
- Duplicate payment webhooks are recorded once and never credit twice.

## Status

Cue is a working Telegram Mini App with text and image prompt generation, a
credit and payments system, and a full admin suite (multi-platform chat +
monitoring panel) running on Cloudflare's edge.

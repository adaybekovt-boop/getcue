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
- **History** — every generated prompt, kept and searchable.
- **Credits & payments** — a credit ledger with Telegram Stars purchases and
  promo codes.

## How prompts are tuned

Cue keeps a strategy per target model that encodes how that model behaves:

- **Claude** — literal instruction-following; XML-tag structure
  (`<context>`, `<task>`, `<constraints>`, `<output_format>`), explicit scope,
  context before the request.
- **GPT / Gemini / Kimi** — each with its own framing, structure, and reasoning
  conventions.

The result is a prompt that reads like it was written by someone who knows the
target model, not a generic wrapper.

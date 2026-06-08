// Selectable free OpenRouter models for the admin chat. Free-only by design —
// the admin chat never deducts credits. Each chat stores its own model.
//
// NOTE: the requested list named two paid-only models (meta-llama/llama-4-scout
// and qwen/qwen3-vl have no free variant on OpenRouter), which would burn
// credits and break the "no credits" rule. They're substituted with the closest
// FREE equivalents (llama-3.3-70b, qwen3-coder).
export const MODELS = [
  {
    id: "moonshotai/kimi-k2.6:free",
    label: "Kimi K2.6",
    vision: true,
    blurb: "Best all-rounder — agentic, coding & tool use. Reads images.",
    best: "Coding, multi-step tasks, working with images & files.",
    weak: "Can be slower on very long replies.",
    tags: ["Agentic", "Coding", "Vision", "Tool use"],
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    vision: false,
    blurb: "Strong reasoning & coding. Text only.",
    best: "Hard reasoning, math, clean code.",
    weak: "No image input.",
    tags: ["Reasoning", "Coding", "Text only"],
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    vision: false,
    blurb: "Fast & light — quick answers.",
    best: "Quick questions, drafts, fast iteration.",
    weak: "Weaker on hard / complex problems.",
    tags: ["Fast", "Lightweight", "Text only"],
  },
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
    vision: true,
    blurb: "Balanced all-rounder that reads images.",
    best: "General chat and reading images/screenshots.",
    weak: "Mid-size — not the deepest reasoner.",
    tags: ["Balanced", "Vision", "General"],
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    vision: false,
    blurb: "Reliable writing & general help. Text only.",
    best: "Writing, summaries, everyday assistance.",
    weak: "No images; not a coding specialist.",
    tags: ["Writing", "General", "Text only"],
  },
  {
    id: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder",
    vision: false,
    blurb: "Code specialist — repos & refactors.",
    best: "Writing & refactoring code, whole repos.",
    weak: "Weaker at casual chat; text only.",
    tags: ["Coding", "Repos", "Text only"],
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
    vision: false,
    blurb: "Fast general assistant, long context.",
    best: "Long documents and fast general answers.",
    weak: "No image input.",
    tags: ["Fast", "Long context", "General"],
  },
  {
    id: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    vision: false,
    blurb: "Light, fast multilingual chat.",
    best: "Multilingual chat, quick replies.",
    weak: "Weaker at deep coding & reasoning.",
    tags: ["Multilingual", "Fast", "Light"],
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super",
    vision: false,
    blurb: "Strong reasoning, good speed/quality balance.",
    best: "Reasoning with a sensible speed trade-off.",
    weak: "No image input.",
    tags: ["Reasoning", "Balanced", "Text only"],
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra",
    vision: false,
    blurb: "Deep reasoning & STEM (huge model).",
    best: "Hardest reasoning, math & science.",
    weak: "Slowest of the bunch; no images.",
    tags: ["Deep reasoning", "STEM", "Slow"],
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    label: "Hermes 3 405B",
    vision: false,
    blurb: "Massive & steerable — long-form & roleplay.",
    best: "Long-form writing, personas, steerability.",
    weak: "Large & slower; no images.",
    tags: ["Long-form", "Roleplay", "Huge"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano VL",
    vision: true,
    blurb: "Small vision model — reads images, fast.",
    best: "Quick image reading on a budget.",
    weak: "Small — limited for hard text tasks.",
    tags: ["Vision", "Small", "Fast"],
  },
];

const BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export const DEFAULT_MODEL = MODELS[0].id;

export function getModels() {
  return MODELS;
}

export function isAllowedModel(id) {
  return BY_ID.has(id);
}

export function modelMeta(id) {
  return BY_ID.get(id) || null;
}

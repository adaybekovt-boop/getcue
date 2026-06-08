// Friendly display names for OpenRouter models. The raw ids/names are long and
// intimidating ("NVIDIA: Nemotron 3 Nano 30B A3B (free)") — this returns a clean
// title plus a short vendor label for the picker.

const VENDOR_LABELS = {
  moonshotai: "MoonshotAI",
  openai: "OpenAI",
  google: "Google",
  nvidia: "NVIDIA",
  qwen: "Qwen",
  "meta-llama": "Meta",
  deepseek: "DeepSeek",
  mistralai: "Mistral",
  "z-ai": "Z.ai",
  poolside: "Poolside",
  liquid: "Liquid",
  nousresearch: "Nous",
  cognitivecomputations: "Cognitive",
  openrouter: "OpenRouter",
};

function titleCase(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function vendorOf(model) {
  const slug = (model?.id || "").split("/")[0].toLowerCase();
  return VENDOR_LABELS[slug] || titleCase(slug) || "OpenRouter";
}

export function prettyTitle(model) {
  // Prefer the part after "Vendor:" in the OpenRouter name.
  let title = model?.name || model?.id || "";
  const colon = title.indexOf(":");
  if (colon !== -1) title = title.slice(colon + 1);
  title = title
    .replace(/\(free\)/gi, "") // drop the "(free)" suffix
    .replace(/\bA\d+B\b/gi, "") // drop MoE active-param jargon (A3B, A55B…)
    .replace(/\s+/g, " ")
    .trim();
  if (!title) title = (model?.id || "").split("/").pop().replace(/:free$/, "");
  return title;
}

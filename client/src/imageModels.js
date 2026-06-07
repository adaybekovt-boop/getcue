import { IconPhoto, IconVideo } from "@tabler/icons-react";

// UI picker data for image/video target models. Mirrors IMAGE_MODEL_CONFIG in
// src/config/imageStrategyCards.js. Kept client-local on purpose so the large
// server-side strategy-card prompts never ship in the client bundle.
export const IMAGE_MODELS = [
  { id: "midjourney", label: "Midjourney", badge: "v7", type: "image" },
  { id: "flux", label: "Flux", badge: "2 Pro", type: "image" },
  { id: "gpt-image", label: "GPT Image", badge: "2", type: "image" },
  { id: "nano-banana", label: "Nano Banana", badge: "2", type: "image" },
  { id: "grok-aurora", label: "Grok Aurora", badge: "xAI", type: "image" },
  { id: "stable-diffusion", label: "Stable Diff.", badge: "3.5", type: "image" },
  { id: "ideogram", label: "Ideogram", badge: "3", type: "image" },
  { id: "firefly", label: "Firefly", badge: "4", type: "image" },
  { id: "kling", label: "Kling", badge: "v2", type: "video" },
  { id: "runway", label: "Runway", badge: "Gen-4", type: "video" },
];

export const IMAGE_MODEL_BY_ID = Object.fromEntries(
  IMAGE_MODELS.map((m) => [m.id, m])
);

export function iconForType(type) {
  return type === "video" ? IconVideo : IconPhoto;
}

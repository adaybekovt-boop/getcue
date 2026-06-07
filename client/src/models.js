import {
  IconSparkles,
  IconBrandOpenai,
  IconDiamond,
  IconLetterK,
} from "@tabler/icons-react";

// Single source of truth for the selectable target models.
//   short — compact label shown in the action-bar selector
//   name  — full label shown in the bottom sheet
export const MODELS = [
  {
    strategy: "claude-standard",
    short: "Claude",
    name: "Claude",
    desc: "Best for detailed code tasks",
    Icon: IconSparkles,
  },
  {
    strategy: "claude-reasoning",
    short: "Claude ✦",
    name: "Claude Thinking",
    desc: "Complex reasoning & planning",
    Icon: IconSparkles,
  },
  {
    strategy: "gpt-standard",
    short: "GPT",
    name: "GPT",
    desc: "Standard instruction-following",
    Icon: IconBrandOpenai,
  },
  {
    strategy: "gpt-reasoning",
    short: "GPT o",
    name: "GPT Reasoning",
    desc: "Advanced problem solving",
    Icon: IconBrandOpenai,
  },
  {
    strategy: "gemini",
    short: "Gemini",
    name: "Gemini",
    desc: "Long context & large codebases",
    Icon: IconDiamond,
  },
  {
    strategy: "kimi",
    short: "Kimi",
    name: "Kimi",
    desc: "Agentic tool use tasks",
    Icon: IconLetterK,
  },
];

export const MODEL_BY_STRATEGY = Object.fromEntries(
  MODELS.map((m) => [m.strategy, m])
);

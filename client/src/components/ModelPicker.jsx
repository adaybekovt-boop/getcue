// Strategy chips with human-readable labels.
const MODELS = [
  { key: "claude-standard", label: "Claude" },
  { key: "claude-reasoning", label: "Claude (thinking)" },
  { key: "gpt-standard", label: "GPT" },
  { key: "gpt-reasoning", label: "GPT (reasoning)" },
  { key: "gemini", label: "Gemini" },
  { key: "kimi", label: "Kimi" },
];

export default function ModelPicker({ value, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Model">
      {MODELS.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            className={"chip" + (active ? " chip-active" : "")}
            aria-pressed={active}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

// Compact Provider · Model · Effort selector row for the admin chat header.
// Quiet pills; tapping one drops a small list beneath it. Only one open at a
// time; tapping outside closes. Friendly labels only — never raw api model ids.
const EFFORT_LABEL = { low: "Low", high: "High", fast: "Fast", medium: "Medium" };
// Tiny sub-label per Gemini effort row (the pill itself shows only the word).
const GEMINI_EFFORT_SUB = { fast: "3.1 Lite", medium: "3 Flash", high: "3.5 Frontier" };
const PROVIDER_ORDER = ["openrouter", "groq", "gemini"];

function cap(s) {
  if (!s) return s;
  return EFFORT_LABEL[s] || s[0].toUpperCase() + s.slice(1);
}

export default function ModelSelectorBar({ platforms, orModels, platform, model, effort, onChange }) {
  const [open, setOpen] = useState(null); // 'provider' | 'model' | 'effort' | null
  const cfg = platforms || {};

  const providerIds = PROVIDER_ORDER.filter((p) => cfg[p]);
  const providerLabel = cfg[platform]?.label || cap(platform) || "Provider";

  const modelOptions =
    platform === "openrouter"
      ? (orModels || []).map((m) => ({ id: m.id, label: m.label }))
      : (cfg[platform]?.models || []).map((m) => ({ id: m.id, label: m.label, effort: m.effort || [] }));

  const currentModel = modelOptions.find((m) => m.id === model);
  const modelLabel = currentModel?.label || (platform === "openrouter" ? "Model" : "Model");

  const effortOptions = platform === "openrouter" ? [] : currentModel?.effort || [];
  const hasEffort = effortOptions.length > 0;
  const effortLabel = hasEffort ? cap(effort || effortOptions[0]) : "—";

  const toggle = (which) => setOpen((o) => (o === which ? null : which));
  const close = () => setOpen(null);

  function selectProvider(p) {
    const opts = p === "openrouter" ? orModels || [] : cfg[p]?.models || [];
    const first = opts[0];
    const firstEffort = p === "openrouter" ? null : first?.effort?.[0] ?? null;
    onChange({ platform: p, model: first?.id ?? null, effort: firstEffort });
    close();
  }
  function selectModel(id) {
    if (platform === "openrouter") {
      onChange({ platform, model: id, effort: null });
    } else {
      const m = modelOptions.find((x) => x.id === id);
      onChange({ platform, model: id, effort: m?.effort?.[0] ?? null });
    }
    close();
  }
  function selectEffort(e) {
    onChange({ platform, model, effort: e });
    close();
  }

  return (
    <div className="ac-selectbar">
      {open && <div className="ac-pop-scrim" onClick={close} aria-hidden="true" />}

      {/* Provider */}
      <div className="ac-pill-cell">
        <button
          type="button"
          className={"ac-pill" + (open === "provider" ? " open" : "")}
          onClick={() => toggle("provider")}
          aria-haspopup="listbox"
          aria-expanded={open === "provider"}
          aria-label={`Provider: ${providerLabel}`}
        >
          <span className="ac-pill-label">{providerLabel}</span>
          <IconChevronDown className="ac-pill-chev" size={13} stroke={2.2} />
        </button>
        {open === "provider" && (
          <div className="ac-pop left" role="listbox" aria-label="Provider">
            {providerIds.map((p) => (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={p === platform}
                className={"ac-pop-row" + (p === platform ? " sel" : "")}
                onClick={() => selectProvider(p)}
              >
                <span className="ac-pop-text">
                  <span className="ac-pop-main">{cfg[p].label}</span>
                </span>
                {p === platform && <IconCheck className="ac-pop-check" size={15} stroke={2.4} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model */}
      <div className="ac-pill-cell">
        <button
          type="button"
          className={"ac-pill" + (open === "model" ? " open" : "")}
          onClick={() => toggle("model")}
          aria-haspopup="listbox"
          aria-expanded={open === "model"}
          aria-label={`Model: ${modelLabel}`}
          disabled={modelOptions.length === 0}
        >
          <span className="ac-pill-label">{modelLabel}</span>
          <IconChevronDown className="ac-pill-chev" size={13} stroke={2.2} />
        </button>
        {open === "model" && (
          <div className="ac-pop left" role="listbox" aria-label="Model">
            {modelOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === model}
                className={"ac-pop-row" + (m.id === model ? " sel" : "")}
                onClick={() => selectModel(m.id)}
              >
                <span className="ac-pop-text">
                  <span className="ac-pop-main">{m.label}</span>
                </span>
                {m.id === model && <IconCheck className="ac-pop-check" size={15} stroke={2.4} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Effort */}
      <div className="ac-pill-cell">
        <button
          type="button"
          className={"ac-pill" + (open === "effort" ? " open" : "") + (hasEffort ? "" : " muted")}
          onClick={() => hasEffort && toggle("effort")}
          aria-haspopup="listbox"
          aria-expanded={open === "effort"}
          aria-label={hasEffort ? `Effort: ${effortLabel}` : "Effort not available for this model"}
          disabled={!hasEffort}
        >
          <span className="ac-pill-label">{effortLabel}</span>
          {hasEffort && <IconChevronDown className="ac-pill-chev" size={13} stroke={2.2} />}
        </button>
        {open === "effort" && hasEffort && (
          <div className="ac-pop right" role="listbox" aria-label="Effort">
            {effortOptions.map((e) => (
              <button
                key={e}
                type="button"
                role="option"
                aria-selected={e === effort}
                className={"ac-pop-row" + (e === effort ? " sel" : "")}
                onClick={() => selectEffort(e)}
              >
                <span className="ac-pop-text">
                  <span className="ac-pop-main">{cap(e)}</span>
                  {platform === "gemini" && GEMINI_EFFORT_SUB[e] && (
                    <span className="ac-pop-sub">{GEMINI_EFFORT_SUB[e]}</span>
                  )}
                </span>
                {e === effort && <IconCheck className="ac-pop-check" size={15} stroke={2.4} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

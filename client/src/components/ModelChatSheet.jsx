import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";

// Picker for the curated free models. Each row shows the model name and a short
// "good at / weak at" blurb so it's clear how to use it.
export default function ModelChatSheet({ isOpen, models, currentModel, onSelect, onClose }) {
  const [q, setQ] = useState("");
  if (!isOpen) return null;

  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? models.filter((m) =>
        [m.label, m.blurb, m.id].some((s) => (s || "").toLowerCase().includes(ql))
      )
    : models;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div
        className="sheet model-chat-sheet"
        role="dialog"
        aria-label="Select model"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <p className="sheet-title">Model · {models.length} free</p>
        <input
          className="model-search"
          type="text"
          placeholder="Search models…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
        <div className="model-list">
          {filtered.map((m) => {
            const active = m.id === currentModel;
            return (
              <button
                key={m.id}
                type="button"
                className={"sheet-item" + (active ? " active" : "")}
                onClick={() => {
                  onSelect(m.id);
                  onClose();
                }}
              >
                <span className="si-text">
                  <span className="si-name">
                    {m.label || m.id}
                    {m.vision && <span className="si-tag">vision</span>}
                  </span>
                  <span className="si-desc">{m.blurb || ""}</span>
                </span>
                {active && <IconCheck className="si-check" size={16} stroke={2} />}
              </button>
            );
          })}
          {filtered.length === 0 && <div className="model-empty">No models match.</div>}
        </div>
      </div>
    </>
  );
}

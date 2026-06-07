import { IconCheck } from "@tabler/icons-react";
import { IMAGE_MODELS, iconForType } from "../imageModels.js";

// Bottom sheet for picking the target image/video model. Renders nothing closed.
export default function ImageTargetSheet({ isOpen, currentModel, onSelect, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-label="Target image model"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <p className="sheet-title">Target image model</p>

        {IMAGE_MODELS.map((m) => {
          const active = m.id === currentModel;
          const Icon = iconForType(m.type);
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
              <Icon className="si-icon" size={20} stroke={1.8} />
              <span className="si-text">
                <span className="si-name">
                  {m.label} {m.badge}
                </span>
                <span className="si-desc">
                  {m.type === "video" ? "Video generation" : "Image generation"}
                </span>
              </span>
              {m.type === "video" && <span className="si-tag">video</span>}
              {active && <IconCheck className="si-check" size={16} stroke={2} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

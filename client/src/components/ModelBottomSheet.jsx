import { IconCheck } from "@tabler/icons-react";
import { MODELS } from "../models.js";

// Bottom sheet for selecting the target model. Renders nothing when closed.
export default function ModelBottomSheet({ isOpen, currentStrategy, onSelect, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-label="Select target model"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <p className="sheet-title">Select target model</p>

        {MODELS.map(({ strategy, name, desc, Icon }) => {
          const active = strategy === currentStrategy;
          return (
            <button
              key={strategy}
              type="button"
              className={"sheet-item" + (active ? " active" : "")}
              onClick={() => {
                onSelect(strategy);
                onClose();
              }}
            >
              <Icon className="si-icon" size={20} stroke={1.8} />
              <span className="si-text">
                <span className="si-name">{name}</span>
                <span className="si-desc">{desc}</span>
              </span>
              {active && <IconCheck className="si-check" size={16} stroke={2} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

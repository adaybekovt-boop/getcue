import { IconTrash } from "@tabler/icons-react";

function fmtWhen(sec) {
  const diff = Date.now() / 1000 - (sec || 0);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

// Bottom sheet listing the admin's saved conversations. Tap to open; trash to delete.
export default function AdminHistorySheet({
  isOpen,
  sessions,
  currentId,
  onOpen,
  onDelete,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div
        className="sheet history-sheet"
        role="dialog"
        aria-label="Chat history"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <p className="sheet-title">Conversations · {sessions.length}</p>
        <div className="hist-list">
          {sessions.length === 0 && (
            <div className="model-empty">No conversations yet.</div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={"hist-row" + (s.id === currentId ? " active" : "")}
            >
              <button
                type="button"
                className="hist-open"
                onClick={() => {
                  onOpen(s.id);
                  onClose();
                }}
              >
                <span className="hist-title">{s.title || "New chat"}</span>
                <span className="hist-meta">
                  {s.count} msg · {fmtWhen(s.updated_at)}
                </span>
              </button>
              <button
                type="button"
                className="hist-del"
                onClick={() => onDelete(s.id)}
                aria-label="Delete conversation"
              >
                <IconTrash size={16} stroke={1.8} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

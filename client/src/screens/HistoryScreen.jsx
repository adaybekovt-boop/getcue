import { useEffect, useState } from "react";
import { IconClockHour3 } from "@tabler/icons-react";
import { api } from "../api.js";
import { MODEL_BY_STRATEGY } from "../models.js";

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export default function HistoryScreen({ history, setHistory }) {
  const [loading, setLoading] = useState(history == null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let alive = true;
    api("/api/history")
      .then((d) => {
        if (alive) {
          setHistory(Array.isArray(d.history) ? d.history : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = history || [];

  return (
    <div className="screen">
      <h1 className="screen-title">History</h1>

      {loading ? (
        <div className="screen-content">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="screen-content">
          <div className="empty-state">
            <IconClockHour3 className="es-icon" size={48} stroke={1.4} />
            <div className="es-title">No generations yet</div>
            <div className="es-sub">
              Your generated prompts will appear here.
            </div>
          </div>
        </div>
      ) : (
        <div className="screen-content">
          {items.map((item) => {
            const model = MODEL_BY_STRATEGY[item.strategy];
            const ModelIcon = model?.Icon;
            const isOpen = expanded === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className="history-card"
                onClick={() => setExpanded(isOpen ? null : item.id)}
              >
                <div className="hc-top">
                  <span className="hc-model">
                    {ModelIcon && <ModelIcon size={13} stroke={1.8} />}
                    {model?.name || item.strategy}
                  </span>
                  <span className="hc-date">{formatDate(item.created_at)}</span>
                </div>
                <div className="hc-task">{item.task || "(no task text)"}</div>
                {!isOpen && item.prompt_text && (
                  <div className="hc-prompt">{item.prompt_text}</div>
                )}
                {isOpen && item.prompt_text && (
                  <pre className="hc-full">{item.prompt_text}</pre>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

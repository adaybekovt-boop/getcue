import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconArrowUp,
  IconShieldLock,
  IconPlus,
  IconPhoto,
  IconFile,
  IconFileText,
  IconCamera,
  IconX,
} from "@tabler/icons-react";
import { api } from "../api.js";

const MAX_ATT = 3;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB each
const FILE_ACCEPT =
  ".pdf,.txt,.md,.docx,.js,.ts,.jsx,.tsx,.py,.json,.csv,.html,.css,.yml,.yaml,.sh,.go,.rs,.java";

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Persistent admin chat. Access is gated by the live /api/me flag (adminChatUnlocked),
// which the server re-checks against ADMIN_TELEGRAM_IDS. No token in the body.
export default function AdminChatScreen({ me }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]); // { role, content, atts? }
  const [input, setInput] = useState("");
  const [pending, setPending] = useState([]); // { id, kind, name, size, mime, dataUrl }
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const endRef = useRef(null);
  const idRef = useRef(0);
  const photoRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pending]);

  // Wait for /api/me, then gate. Hooks above always run (Rules of Hooks).
  if (me === null) {
    return (
      <div className="screen admin-chat">
        <div className="ac-loading">Loading…</div>
      </div>
    );
  }
  if (me.adminChatUnlocked !== true) return <Navigate to="/" replace />;

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setMenuOpen(false);
    if (!files.length) return;
    let next = [...pending];
    for (const file of files) {
      if (next.length >= MAX_ATT) {
        setError(`Up to ${MAX_ATT} attachments.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" is over 10MB.`);
        continue;
      }
      const dataUrl = await readAsDataURL(file);
      next.push({
        id: ++idRef.current,
        kind: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    setPending(next);
  }

  function removeAtt(id) {
    setPending((p) => p.filter((a) => a.id !== id));
  }

  async function send() {
    const text = input.trim();
    if ((!text && pending.length === 0) || loading) return;

    const userMsg = {
      role: "user",
      content: text,
      atts: pending.map((a) => ({
        kind: a.kind,
        name: a.name,
        size: a.size,
        url: a.kind === "image" ? a.dataUrl : null,
      })),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    const sendAtts = pending;
    setPending([]);
    setError(null);
    setLoading(true);

    try {
      // History as strings. Past attachment-only messages get a text summary so
      // the server's non-empty check passes; the final message may be empty when
      // it carries attachments (the server adds a default instruction).
      const apiMessages = history.map((m, idx) => {
        const isLast = idx === history.length - 1;
        let content = m.content || "";
        if (!content.trim() && m.atts?.length) {
          content = isLast ? "" : `[Attached: ${m.atts.map((a) => a.name).join(", ")}]`;
        }
        return { role: m.role, content };
      });
      const attachments = sendAtts.map((a) => ({
        type: a.kind === "image" ? "image" : "file",
        name: a.name,
        mime: a.mime,
        base64: a.dataUrl,
      }));

      const data = await api("/api/admin/chat", {
        method: "POST",
        body: JSON.stringify({ messages: apiMessages, attachments }),
      });
      setMessages([...history, { role: "assistant", content: data.reply, atts: [] }]);
    } catch (e) {
      if (e.status === 403) setError("Access revoked.");
      else if (e.status === 413) setError("Attachment too large.");
      else setError(e.message || "Chat failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="screen admin-chat">
      <header className="ac-header">
        <button
          type="button"
          className="ac-back"
          onClick={() => navigate("/settings")}
          aria-label="Back"
        >
          <IconArrowLeft size={20} stroke={2} />
        </button>
        <div className="ac-title">
          <IconShieldLock className="ac-lock" size={15} stroke={2} />
          Kimi K2.6
          <span className="ac-badge">admin</span>
        </div>
        <span className="ac-spacer" />
      </header>

      <div className="ac-messages">
        {messages.length === 0 && !loading && (
          <div className="ac-empty">
            Raw chat with Kimi K2.6.
            <br />
            No system prompt, no credits, no logging.
            <br />
            Attach images and files with +.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"ac-msg " + m.role}>
            <div className="ac-stack">
              {m.atts?.map((a, j) =>
                a.kind === "image" ? (
                  <div key={j} className="ac-bubble msg-img">
                    <img src={a.url} alt={a.name} />
                  </div>
                ) : (
                  <div key={j} className="ac-bubble msg-file">
                    <IconFileText className="mf-icon" size={20} stroke={1.6} />
                    <span className="mf-meta">
                      <span className="mf-name">{a.name}</span>
                      <span className="mf-size">{fmtSize(a.size)}</span>
                    </span>
                  </div>
                )
              )}
              {m.content && m.content.trim() && (
                <div className="ac-bubble">{m.content}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ac-msg assistant">
            <div className="ac-bubble ac-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {error && <div className="ac-error">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="ac-input-wrap">
        {pending.length > 0 && (
          <div className="ac-chips">
            {pending.map((a) => (
              <div key={a.id} className={"ac-chip " + a.kind}>
                {a.kind === "image" ? (
                  <img src={a.dataUrl} alt={a.name} />
                ) : (
                  <>
                    <IconFileText size={18} stroke={1.6} />
                    <span className="acc-name">{a.name}</span>
                  </>
                )}
                <button
                  type="button"
                  className="ac-chip-x"
                  onClick={() => removeAtt(a.id)}
                  aria-label="Remove attachment"
                >
                  <IconX size={12} stroke={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {menuOpen && (
          <>
            <div className="ac-menu-scrim" onClick={() => setMenuOpen(false)} />
            <div className="ac-attach-menu">
              <button
                type="button"
                className="ac-attach-item"
                onClick={() => photoRef.current?.click()}
              >
                <IconPhoto size={18} stroke={1.8} /> Photo
              </button>
              <button
                type="button"
                className="ac-attach-item"
                onClick={() => fileRef.current?.click()}
              >
                <IconFile size={18} stroke={1.8} /> File
              </button>
              <button
                type="button"
                className="ac-attach-item"
                onClick={() => cameraRef.current?.click()}
              >
                <IconCamera size={18} stroke={1.8} /> Camera
              </button>
            </div>
          </>
        )}

        <div className="ac-input-bar">
          <button
            type="button"
            className={"ac-attach" + (menuOpen ? " open" : "")}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Attach"
          >
            <IconPlus size={22} stroke={2} />
          </button>
          <textarea
            className="ac-input"
            rows={1}
            placeholder="Message Kimi…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="ac-send"
            onClick={send}
            disabled={loading || (!input.trim() && pending.length === 0)}
            aria-label="Send"
          >
            <IconArrowUp size={20} stroke={2.2} />
          </button>
        </div>
      </div>

      <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPick} />
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} hidden onChange={onPick} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
    </div>
  );
}

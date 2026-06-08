import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconArrowUp,
  IconPlus,
  IconPhoto,
  IconFile,
  IconFileText,
  IconCamera,
  IconX,
  IconChevronDown,
  IconListCheck,
  IconPencilPlus,
  IconMessage2,
} from "@tabler/icons-react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";
import ModelChatSheet from "../components/ModelChatSheet.jsx";
import { prettyTitle } from "../modelName.js";

const SLASH_COMMANDS = [
  { cmd: "/plan", hint: "Deep multi-step plan with ready prompts" },
];

const MAX_ATT = 3;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB each
const FILE_ACCEPT =
  ".pdf,.txt,.md,.docx,.js,.ts,.jsx,.tsx,.py,.json,.csv,.html,.css,.yml,.yaml,.sh,.go,.rs,.java";

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}

function fmtWhen(sec) {
  const diff = Date.now() / 1000 - (sec || 0);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function mapMsg(m) {
  return {
    role: m.role,
    content: m.content,
    atts: (m.atts || []).map((a) => ({
      kind: a.kind || a.type,
      name: a.name,
      size: a.size || 0,
      url: a.url || null,
    })),
  };
}

function confirmDialog(text, onYes) {
  const canNative =
    typeof WebApp?.isVersionAtLeast === "function" &&
    WebApp.isVersionAtLeast("6.2") &&
    typeof WebApp.showConfirm === "function";
  if (canNative) {
    try {
      WebApp.showConfirm(text, (ok) => ok && onYes());
      return;
    } catch {
      /* fall through */
    }
  }
  let ok = true;
  try {
    ok = window.confirm(text);
  } catch {
    ok = true;
  }
  if (ok) onYes();
}

// Full admin chat app: chat list + conversation view. Multiple persistent chats,
// each with its own free model. Access gated by the live /api/me unlock flag.
export default function AdminChatScreen({ me }) {
  const navigate = useNavigate();
  const [view, setView] = useState("list"); // 'list' | 'chat'
  const [chats, setChats] = useState([]);
  const [models, setModels] = useState([]);

  const [activeChatId, setActiveChatId] = useState(null);
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModelSheet, setShowModelSheet] = useState(false);
  const sheetModeRef = useRef("switch"); // 'new' | 'switch'

  const endRef = useRef(null);
  const idRef = useRef(0);
  const photoRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const lpTimer = useRef(null);
  const lpFired = useRef(false);

  const activeModel = models.find((m) => m.id === model) || null;
  const modelLabel = activeModel?.label || prettyTitle({ id: model }) || "Model";
  const slashTyping = input.startsWith("/") && !input.includes(" ");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pending]);

  // Load models + chat list once unlocked.
  useEffect(() => {
    if (me?.adminChatUnlocked !== true) return;
    let cancelled = false;
    api("/api/admin/models")
      .then((d) => {
        if (cancelled || !Array.isArray(d.models) || !d.models.length) return;
        setModels(d.models);
        setModel((cur) => cur || d.models[0].id);
      })
      .catch(() => {});
    api("/api/admin/chats")
      .then((d) => {
        if (!cancelled) setChats(Array.isArray(d.chats) ? d.chats : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me]);

  if (me === null) {
    return (
      <div className="screen admin-chat">
        <div className="ac-loading">Loading…</div>
      </div>
    );
  }
  if (me.adminChatUnlocked !== true) return <Navigate to="/" replace />;

  function refreshChats() {
    api("/api/admin/chats")
      .then((d) => setChats(Array.isArray(d.chats) ? d.chats : []))
      .catch(() => {});
  }

  // ── Navigation between list and chat ──
  function openNewChat() {
    sheetModeRef.current = "new";
    setShowModelSheet(true);
  }

  function startNewChat(mId) {
    setActiveChatId(null);
    setModel(mId);
    setMessages([]);
    setPending([]);
    setError(null);
    setMenuOpen(false);
    setView("chat");
  }

  async function openChat(id) {
    setError(null);
    try {
      const d = await api(`/api/admin/chats/${id}/messages`);
      setMessages(Array.isArray(d.messages) ? d.messages.map(mapMsg) : []);
      setActiveChatId(id);
      if (d.model) setModel(d.model);
      setPending([]);
      setView("chat");
    } catch {
      setError("Couldn't open chat.");
    }
  }

  function deleteChat(id) {
    confirmDialog("Delete this chat?", async () => {
      try {
        await api(`/api/admin/chats/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      if (id === activeChatId) {
        setActiveChatId(null);
        setMessages([]);
        setView("list");
      }
      refreshChats();
    });
  }

  function onModelSelect(mId) {
    if (sheetModeRef.current === "new") startNewChat(mId);
    else setModel(mId);
  }

  // ── Long-press to delete in the list ──
  function lpStart(id) {
    lpFired.current = false;
    lpTimer.current = setTimeout(() => {
      lpFired.current = true;
      deleteChat(id);
    }, 550);
  }
  function lpEnd() {
    clearTimeout(lpTimer.current);
  }
  function rowClick(id) {
    if (lpFired.current) {
      lpFired.current = false;
      return;
    }
    openChat(id);
  }

  // ── Attachments ──
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

    if (pending.some((a) => a.kind === "image") && activeModel && activeModel.vision === false) {
      setError("This model can't read images — pick a vision model.");
      return;
    }

    const sendAtts = pending;
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        atts: sendAtts.map((a) => ({
          kind: a.kind,
          name: a.name,
          size: a.size,
          url: a.kind === "image" ? a.dataUrl : null,
        })),
      },
    ]);
    setInput("");
    setPending([]);
    setError(null);
    setLoading(true);

    try {
      let chatId = activeChatId;
      if (!chatId) {
        const created = await api("/api/admin/chats", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        chatId = created.id;
        setActiveChatId(chatId);
      }
      const attachments = sendAtts.map((a) => ({
        type: a.kind === "image" ? "image" : "file",
        name: a.name,
        mime: a.mime,
        base64: a.dataUrl,
      }));
      const data = await api(`/api/admin/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, attachments, model }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, atts: [] }]);
      if (data.model) setModel(data.model);
      refreshChats();
    } catch (e) {
      if (e.status === 403) setError("Access revoked.");
      else if (e.status === 413) setError("Attachment too large.");
      else if (e.data?.message) setError(e.data.message);
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

  // ── LIST VIEW ──
  if (view === "list") {
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
          <span className="ac-title-text">
            Admin Chat<span className="ac-badge">admin</span>
          </span>
          <button
            type="button"
            className="ac-iconbtn"
            onClick={openNewChat}
            aria-label="New chat"
          >
            <IconPencilPlus size={20} stroke={1.8} />
          </button>
        </header>

        <div className="chat-list">
          {chats.length === 0 && (
            <div className="chat-empty">
              <IconMessage2 size={40} stroke={1.3} />
              <span className="ce-title">No chats yet</span>
              <span className="ce-sub">Tap “New chat” to start.</span>
              <button type="button" className="ce-new" onClick={openNewChat}>
                <IconPencilPlus size={16} stroke={2} /> New chat
              </button>
            </div>
          )}
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chat-row"
              onClick={() => rowClick(c.id)}
              onPointerDown={() => lpStart(c.id)}
              onPointerUp={lpEnd}
              onPointerLeave={lpEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteChat(c.id);
              }}
            >
              <span className="chat-row-main">
                <span className="chat-row-title">{c.title || "New chat"}</span>
                <span className="chat-row-preview">{c.preview || "…"}</span>
              </span>
              <span className="chat-row-when">{fmtWhen(c.updated_at)}</span>
            </button>
          ))}
        </div>

        <ModelChatSheet
          isOpen={showModelSheet}
          models={models}
          currentModel={model}
          onSelect={onModelSelect}
          onClose={() => setShowModelSheet(false)}
        />
      </div>
    );
  }

  // ── CHAT VIEW ──
  return (
    <div className="screen admin-chat">
      <header className="ac-header">
        <button
          type="button"
          className="ac-back"
          onClick={() => {
            setView("list");
            refreshChats();
          }}
          aria-label="Back to chats"
        >
          <IconArrowLeft size={20} stroke={2} />
        </button>
        <button
          type="button"
          className="ac-title ac-model-btn"
          onClick={() => {
            sheetModeRef.current = "switch";
            setShowModelSheet(true);
          }}
          aria-haspopup="dialog"
        >
          <span className="ac-model-label">{modelLabel}</span>
          {activeModel?.vision && <span className="si-tag">vision</span>}
          <IconChevronDown size={12} stroke={2.5} />
        </button>
        <button
          type="button"
          className="ac-iconbtn"
          onClick={openNewChat}
          aria-label="New chat"
        >
          <IconPencilPlus size={20} stroke={1.8} />
        </button>
      </header>

      <div className="ac-messages">
        {messages.length === 0 && !loading && (
          <div className="ac-empty">
            <div className="ace-model">
              {modelLabel}
              {activeModel?.vision && <span className="si-tag">vision</span>}
            </div>
            {activeModel?.blurb && <div className="ace-blurb">{activeModel.blurb}</div>}
            {activeModel?.tags?.length > 0 && (
              <div className="ace-tags">
                {activeModel.tags.map((t) => (
                  <span key={t} className="ace-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {(activeModel?.best || activeModel?.weak) && (
              <div className="ace-info">
                {activeModel.best && (
                  <div className="ace-line">
                    <span className="ace-k">Best for</span> {activeModel.best}
                  </div>
                )}
                {activeModel.weak && (
                  <div className="ace-line">
                    <span className="ace-k">Watch out</span> {activeModel.weak}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"ac-msg " + m.role}>
            <div className="ac-stack">
              {m.atts?.map((a, j) => {
                const kind = a.kind || a.type;
                if (kind === "image" && a.url) {
                  return (
                    <div key={j} className="ac-bubble msg-img">
                      <img src={a.url} alt={a.name} />
                    </div>
                  );
                }
                const ChipIcon = kind === "image" ? IconPhoto : IconFileText;
                return (
                  <div key={j} className="ac-bubble msg-file">
                    <ChipIcon className="mf-icon" size={20} stroke={1.6} />
                    <span className="mf-meta">
                      <span className="mf-name">{a.name}</span>
                      {a.size ? <span className="mf-size">{fmtSize(a.size)}</span> : null}
                    </span>
                  </div>
                );
              })}
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
        {slashTyping && (
          <div className="ac-slash-row">
            {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input)).map((c) => (
              <button
                key={c.cmd}
                type="button"
                className="ac-slash-item"
                onClick={() => setInput(c.cmd + " ")}
              >
                <IconListCheck size={15} stroke={1.8} />
                <span className="acs-cmd">{c.cmd}</span>
                <span className="acs-hint">{c.hint}</span>
              </button>
            ))}
          </div>
        )}

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
              <button type="button" className="ac-attach-item" onClick={() => photoRef.current?.click()}>
                <IconPhoto size={18} stroke={1.8} /> Photo
              </button>
              <button type="button" className="ac-attach-item" onClick={() => fileRef.current?.click()}>
                <IconFile size={18} stroke={1.8} /> File
              </button>
              <button type="button" className="ac-attach-item" onClick={() => cameraRef.current?.click()}>
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
            placeholder={`Message ${modelLabel}…  ("/" for commands)`}
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
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />

      <ModelChatSheet
        isOpen={showModelSheet}
        models={models}
        currentModel={model}
        onSelect={onModelSelect}
        onClose={() => setShowModelSheet(false)}
      />
    </div>
  );
}

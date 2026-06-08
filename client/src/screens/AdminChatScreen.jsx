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
  IconPencilPlus,
  IconMessage2,
  IconBrandGithub,
  IconBulb,
  IconSearch,
} from "@tabler/icons-react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";
import ModelSelectorBar from "../components/ModelSelectorBar.jsx";
import { prettyTitle } from "../modelName.js";

const SLASH_COMMANDS = [
  { cmd: "/github", icon: IconBrandGithub, hint: "Load a repo so the model can read its code" },
  { cmd: "/plan", icon: IconBulb, hint: "Deep planning — turns a request into an executable plan" },
  { cmd: "/critic", icon: IconSearch, hint: "Honest, substance-only code review" },
];

// Default selection for a brand-new chat (and the offline fallback).
const DEFAULT_SEL = { platform: "groq", model: "gpt", effort: "high" };

// Minimal built-in platform shape used only if GET /api/admin/platforms fails,
// so the dropdowns + chat still work. Mirrors the safe shape (labels only).
const FALLBACK_PLATFORMS = {
  groq: {
    label: "Groq",
    models: [
      { id: "gpt", label: "GPT", effort: ["low", "high"] },
      { id: "qwen", label: "Qwen", effort: [] },
      { id: "meta", label: "Meta", effort: ["low", "high"] },
    ],
  },
  gemini: {
    label: "Gemini",
    models: [{ id: "gemini", label: "Gemini 3", effort: ["fast", "medium", "high"] }],
  },
  openrouter: { label: "OpenRouter", passthrough: true },
};

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
// each with its own platform/model/effort selection. Access gated by the live
// /api/me unlock flag.
export default function AdminChatScreen({ me }) {
  const navigate = useNavigate();
  const [view, setView] = useState("list"); // 'list' | 'chat'
  const [chats, setChats] = useState([]);
  const [platforms, setPlatforms] = useState(null); // safe shape from /api/admin/platforms
  const [models, setModels] = useState([]); // OpenRouter free models (for the openrouter path)

  const [activeChatId, setActiveChatId] = useState(null);
  const [platform, setPlatform] = useState(DEFAULT_SEL.platform);
  const [model, setModel] = useState(DEFAULT_SEL.model);
  const [effort, setEffort] = useState(DEFAULT_SEL.effort);
  const [repo, setRepo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const endRef = useRef(null);
  const idRef = useRef(0);
  const photoRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const lpTimer = useRef(null);
  const lpFired = useRef(false);

  const pcfg = platforms || FALLBACK_PLATFORMS;
  // The selected OpenRouter model (only the openrouter path carries vision metadata).
  const activeOrModel = platform === "openrouter" ? models.find((m) => m.id === model) || null : null;
  const providerLabel = pcfg[platform]?.label || platform;
  const modelLabel =
    platform === "openrouter"
      ? activeOrModel?.label || prettyTitle({ id: model }) || "Model"
      : pcfg[platform]?.models?.find((m) => m.id === model)?.label || "Model";
  const slashTyping = input.startsWith("/") && !input.includes(" ");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pending]);

  // Load platforms + OpenRouter models + chat list once unlocked.
  useEffect(() => {
    if (me?.adminChatUnlocked !== true) return;
    let cancelled = false;
    api("/api/admin/platforms")
      .then((d) => {
        if (!cancelled && d && typeof d === "object" && d.groq) setPlatforms(d);
        else if (!cancelled) setPlatforms(FALLBACK_PLATFORMS);
      })
      .catch(() => {
        if (!cancelled) setPlatforms(FALLBACK_PLATFORMS);
      });
    api("/api/admin/models")
      .then((d) => {
        if (!cancelled && Array.isArray(d.models)) setModels(d.models);
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
  // A new chat opens as a normal empty chat at the default selection.
  function openNewChat() {
    setActiveChatId(null);
    setPlatform(DEFAULT_SEL.platform);
    setModel(DEFAULT_SEL.model);
    setEffort(DEFAULT_SEL.effort);
    setRepo(null);
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
      setPlatform(d.platform || "openrouter");
      if (d.model) setModel(d.model);
      setEffort(d.effort ?? null);
      setRepo(d.repo || null);
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

  // Selection changed in the header dropdowns. Persists with the next message
  // (the send endpoint stores it per chat); also restored from the chat on open.
  function onSelectionChange(next) {
    setPlatform(next.platform);
    setModel(next.model);
    setEffort(next.effort);
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

    // OpenRouter models may be text-only; Groq auto-routes images to its vision
    // model and Gemini reads them natively, so only guard the openrouter path.
    if (
      pending.some((a) => a.kind === "image") &&
      platform === "openrouter" &&
      activeOrModel &&
      activeOrModel.vision === false
    ) {
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
          body: JSON.stringify(platform === "openrouter" ? { model } : {}),
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
        body: JSON.stringify({ content: text, attachments, platform, model, effort }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, atts: [] }]);
      if (data.platform) setPlatform(data.platform);
      if (data.model) setModel(data.model);
      if (data.effort !== undefined) setEffort(data.effort);
      if (data.repo !== undefined) setRepo(data.repo || null);
      refreshChats();
    } catch (e) {
      const rateLimited = e.status === 429 || e.data?.error === "rate_limit";
      if (rateLimited) {
        // Don't lose the typed message: drop the optimistic bubble, restore
        // the text + attachments, and show an inline notice.
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        setPending(sendAtts);
        setError("Rate limited — try again or switch model / effort.");
      } else if (e.status === 403) setError("Access revoked.");
      else if (e.status === 413) setError("Attachment too large.");
      else if (e.data?.detail) setError(e.data.detail);
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
        <span className="ac-title-text">
          Chat<span className="ac-badge">admin</span>
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

      <ModelSelectorBar
        platforms={pcfg}
        orModels={models}
        platform={platform}
        model={model}
        effort={effort}
        onChange={onSelectionChange}
      />

      {repo && (
        <div className="ac-repo-bar">
          <IconBrandGithub size={14} stroke={1.8} />
          <span className="ac-repo-name">{repo}</span>
          <span className="ac-repo-note">loaded · model can read this code</span>
        </div>
      )}

      <div className="ac-messages">
        {messages.length === 0 && !loading && (
          <div className="ac-empty">
            <div className="ace-model">
              {modelLabel}
              <span className="ace-provider">{providerLabel}</span>
            </div>
            {activeOrModel?.blurb && <div className="ace-blurb">{activeOrModel.blurb}</div>}
            {activeOrModel?.tags?.length > 0 && (
              <div className="ace-tags">
                {activeOrModel.tags.map((t) => (
                  <span key={t} className="ace-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="ace-cmds">
              <span className="ace-cmd"><IconBrandGithub size={13} stroke={1.8} /> /github</span>
              <span className="ace-cmd"><IconBulb size={13} stroke={1.8} /> /plan</span>
              <span className="ace-cmd"><IconSearch size={13} stroke={1.8} /> /critic</span>
            </div>
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
            {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input)).map((c) => {
              const Icon = c.icon || IconSearch;
              return (
                <button
                  key={c.cmd}
                  type="button"
                  className="ac-slash-item"
                  onClick={() => setInput(c.cmd + " ")}
                >
                  <Icon size={15} stroke={1.8} />
                  <span className="acs-cmd">{c.cmd}</span>
                  <span className="acs-hint">{c.hint}</span>
                </button>
              );
            })}
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
    </div>
  );
}

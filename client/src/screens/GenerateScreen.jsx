import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  IconBrandGithub,
  IconChevronDown,
  IconStarFilled,
  IconCheck,
  IconCopy,
  IconArrowRight,
} from "@tabler/icons-react";
import { api } from "../api.js";
import { MODEL_BY_STRATEGY } from "../models.js";
import { tgUser } from "../tgUser.js";
import Avatar from "../components/Avatar.jsx";
import ModelBottomSheet from "../components/ModelBottomSheet.jsx";

const MAX_TASK = 2000;

export default function GenerateScreen({ me, setCredits, onGenerated }) {
  const [task, setTask] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [strategy, setStrategy] = useState("claude-standard");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  // One-time welcome banner: tells new users they already have free credits.
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem("cue_welcome_seen");
    } catch {
      return false;
    }
  });

  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;
  const firstBonus = !!(me && me.firstPurchaseBonus) && !isAdmin;
  const lowBalance = !isAdmin && typeof credits === "number" && credits < 100;
  const model = MODEL_BY_STRATEGY[strategy];
  const ModelIcon = model.Icon;

  function dismissWelcome() {
    setShowWelcome(false);
    try {
      localStorage.setItem("cue_welcome_seen", "1");
    } catch {
      /* storage unavailable */
    }
  }

  // One input state = one result. Changing any input clears the previous result.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [task]);
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [strategy]);
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [repoUrl]);

  async function handleGenerate() {
    if (!task.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = { strategy, task };
      let repo = repoUrl.trim();
      if (repo) {
        if (!/^https?:\/\//i.test(repo)) repo = "https://" + repo;
        body.repoUrl = repo;
      }
      const data = await api("/api/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(data.result);
      if (typeof data.credits === "number") setCredits(data.credits);
      if (onGenerated) {
        onGenerated({
          id: "local-" + Date.now(),
          strategy,
          task,
          prompt_text: data.result,
          credits_spent: data.spent ?? 0,
          created_at: Math.floor(Date.now() / 1000),
        });
      }
    } catch (e) {
      if (e.status === 402) setError("insufficient_credits");
      else setError(e.message || "generation_failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const disabled = loading || !task.trim();

  return (
    <div className="screen">
      <header className="cue-header">
        <span className="cue-logo">Cue</span>
        <div className="header-right">
          <Link to="/pro" className={"credits-badge" + (lowBalance ? " low" : "")}>
            <IconStarFilled className="star" size={12} />
            {isAdmin ? "Admin ∞" : lowBalance ? `${credits} · Top up` : `${credits ?? "…"} cr`}
          </Link>
          <Link to="/settings" className="profile-avatar" aria-label="Profile">
            <Avatar user={tgUser} size={36} />
          </Link>
        </div>
      </header>

      <div className="screen-content">
        {showWelcome && !isAdmin && (
          <div className="welcome-banner">
            <span>
              🎁 You start with <b>150 free credits</b> — enough for 3 prompts. Try it now.
            </span>
            <button type="button" className="welcome-close" onClick={dismissWelcome}>
              ✕
            </button>
          </div>
        )}

        <div className="task-block">
          <textarea
            className="task-textarea"
            placeholder="Describe what you need..."
            value={task}
            maxLength={MAX_TASK}
            onChange={(e) => setTask(e.target.value)}
          />
          <div className="char-counter">
            {task.length} / {MAX_TASK}
          </div>
        </div>

        <label className="gh-row">
          <IconBrandGithub className="gh-icon" size={15} stroke={1.8} />
          <input
            className="gh-input"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="github.com/owner/repo (optional)"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          {!repoUrl.trim() && <span className="gh-badge">optional</span>}
        </label>

        {error && error !== "insufficient_credits" && (
          <div className="error-banner">
            <span>Generation failed. Please try again.</span>
          </div>
        )}

        {error === "insufficient_credits" && (
          <div className="paywall-card">
            <div className="paywall-title">Out of credits</div>
            <div className="paywall-sub">
              {firstBonus
                ? "Get +50% bonus credits on your first purchase — from just 10 Stars."
                : "Top up to keep generating — from just 10 Stars."}
            </div>
            <Link to="/pro" className="paywall-cta">
              <IconStarFilled className="star" size={14} />
              {firstBonus ? "Claim +50% bonus" : "Get credits"}
            </Link>
          </div>
        )}

        {result && (
          <div className="output">
            <div className="output-head">
              <span className="output-title">Generated prompt</span>
              <button className="copy-btn" type="button" onClick={copyResult}>
                {copied ? (
                  <>
                    <IconCheck size={13} stroke={2} /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={13} stroke={2} /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="output-text">{result}</pre>
          </div>
        )}
      </div>

      <div className="action-bar">
        <button
          type="button"
          className="model-selector"
          onClick={() => setShowModelSheet(true)}
        >
          <ModelIcon className="ms-icon" size={15} stroke={1.8} />
          <span className="ms-name">{model.short}</span>
          <IconChevronDown className="ms-chevron" size={10} stroke={2.5} />
        </button>

        <button
          type="button"
          className={"generate-btn" + (loading ? " loading" : "")}
          disabled={disabled}
          onClick={handleGenerate}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              Generate prompt
              <IconArrowRight size={17} stroke={2} />
            </>
          )}
        </button>
      </div>

      <ModelBottomSheet
        isOpen={showModelSheet}
        currentStrategy={strategy}
        onSelect={setStrategy}
        onClose={() => setShowModelSheet(false)}
      />
    </div>
  );
}

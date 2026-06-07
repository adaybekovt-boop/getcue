import { useState } from "react";
import { Link } from "react-router-dom";
import { IconChevronRight, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { api } from "../api.js";

export default function SettingsScreen({ me, refreshMe }) {
  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;

  const [code, setCode] = useState("");
  const [state, setState] = useState(null); // 'loading' | 'success' | 'error'
  const [msg, setMsg] = useState("");

  async function applyPromo() {
    const entered = code.trim().toUpperCase();
    if (!entered || state === "loading") return;
    setState("loading");
    setMsg("");
    try {
      const data = await api("/api/promo/redeem", {
        method: "POST",
        body: JSON.stringify({ code: entered }),
      });
      setState("success");
      setMsg(`${entered} — +${data.credits} credits added!`);
      setCode("");
      if (refreshMe) refreshMe();
    } catch (e) {
      setState("error");
      if (e.status === 409) setMsg("Already redeemed");
      else if (e.status === 400) setMsg("Invalid promo code");
      else setMsg(e.message || "Something went wrong");
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>
      <div className="screen-content">
        <div className="settings-section-title">Promo Code</div>
        <div className="promo-row">
          <input
            className="promo-input"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Enter promo code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyPromo();
            }}
          />
          <button
            type="button"
            className="promo-apply"
            disabled={state === "loading" || !code.trim()}
            onClick={applyPromo}
          >
            {state === "loading" ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              "Apply"
            )}
          </button>
        </div>
        {msg && (
          <div className={"promo-msg " + (state === "success" ? "success" : "error")}>
            {state === "success" ? (
              <IconCheck size={15} stroke={2.2} />
            ) : (
              <IconAlertCircle size={15} stroke={2} />
            )}
            {msg}
          </div>
        )}

        <div className="settings-section-title">Account</div>
        <div className="settings-card">
          <span className="sc-label">Status</span>
          <span className="sc-value">{isAdmin ? "Admin" : "Member"}</span>
        </div>

        <Link to="/pro" className="settings-card" style={{ textDecoration: "none" }}>
          <span className="sc-label">Credits</span>
          <span
            className="sc-value"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {isAdmin ? "∞" : (credits ?? "…")}
            <IconChevronRight size={16} stroke={2} />
          </span>
        </Link>

        <div className="settings-card">
          <span className="sc-label">Version</span>
          <span className="sc-value">Cue 1.0</span>
        </div>
      </div>
    </div>
  );
}

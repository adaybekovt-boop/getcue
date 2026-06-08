import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { IconRefresh, IconCheck, IconX, IconMinus } from "@tabler/icons-react";
import { api } from "../api.js";

// A reusable status pill so the three tables read consistently.
function Status({ value }) {
  if (value === "ok") {
    return (
      <span className="ap-pill ap-ok">
        <IconCheck size={13} stroke={2.4} /> ok
      </span>
    );
  }
  if (value === "error") {
    return (
      <span className="ap-pill ap-err">
        <IconX size={13} stroke={2.4} /> error
      </span>
    );
  }
  return (
    <span className="ap-pill ap-muted">
      <IconMinus size={13} stroke={2.4} /> {value === "no_quota_api" ? "no quota api" : value || "—"}
    </span>
  );
}

// Generic section: owns its own loading/error/data and a Refresh button so each
// table updates independently without reloading the page.
function Section({ title, hint, endpoint, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api(endpoint)
      .then((d) => setData(d))
      .catch((e) => setError(e.message || "Request failed"))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="ap-section">
      <div className="ap-section-head">
        <div>
          <h2 className="ap-section-title">{title}</h2>
          {hint && <p className="ap-section-hint">{hint}</p>}
        </div>
        <button type="button" className="ap-refresh" onClick={load} disabled={loading}>
          <IconRefresh size={15} stroke={2} className={loading ? "ap-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && <div className="ap-error">{error}</div>}
      {!error && data && render(data)}
      {!error && !data && loading && <div className="ap-loading">Loading…</div>}
    </section>
  );
}

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number") return Number.isInteger(n) ? String(n) : n.toFixed(4);
  return String(n);
}

export default function Admin({ me }) {
  if (me === null) {
    return (
      <div className="screen admin-panel">
        <div className="ap-loading">Loading…</div>
      </div>
    );
  }
  // Gated by the persistent panel unlock (which /api/me already re-checks against
  // live admin status), so a non-admin or not-yet-activated user is sent home.
  if (!me.adminPanelUnlocked) return <Navigate to="/" replace />;

  return (
    <div className="screen admin-panel">
      <h1 className="screen-title">Admin Panel</h1>
      <div className="screen-content">
        {/* 1. Stored-key usage limits */}
        <Section
          title="Key limits"
          hint="Usage & remaining quota for stored API keys"
          endpoint="/api/admin/panel/key-limits"
          render={(data) => (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Remaining</th>
                    <th>Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.flatMap((p) =>
                    p.configured === 0
                      ? [
                          <tr key={p.provider} className="ap-row-muted">
                            <td>{p.provider}</td>
                            <td colSpan={4}>not configured</td>
                          </tr>,
                        ]
                      : p.keys.map((k, i) => (
                          <tr key={`${p.provider}-${i}`}>
                            <td>{i === 0 ? p.provider : ""}</td>
                            <td className="ap-mono">{k.key}</td>
                            <td>
                              <Status value={k.status} />
                              {k.detail ? <span className="ap-detail"> {k.detail}</span> : null}
                            </td>
                            <td>{fmtNum(k.remaining ?? k.balance)}</td>
                            <td>{fmtNum(k.limit ?? k.totalBalance)}</td>
                          </tr>
                        ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        />

        {/* 2. OpenRouter model availability */}
        <Section
          title="OpenRouter models"
          hint="Configured models and whether OpenRouter currently lists them"
          endpoint="/api/admin/panel/openrouter-models"
          render={(data) => (
            <div className="ap-table-wrap">
              {data.error && <div className="ap-warn">OpenRouter list unavailable: {data.error}</div>}
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>ID</th>
                    <th>State</th>
                    <th>Context</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => (
                    <tr key={m.id}>
                      <td>{m.label}</td>
                      <td className="ap-mono">{m.id}</td>
                      <td>
                        <span className={"ap-pill " + (m.enabled ? "ap-ok" : "ap-err")}>
                          {m.enabled ? "enabled" : "disabled"}
                        </span>
                      </td>
                      <td>{fmtNum(m.contextLength)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />

        {/* 3. Live model operability test */}
        <Section
          title="Model tests"
          hint="Minimal generation request sent to each configured model"
          endpoint="/api/admin/panel/model-tests"
          render={(data) => (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Result</th>
                    <th>Latency</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id}>
                      <td>{r.label}</td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>{r.ms != null ? `${r.ms} ms` : "—"}</td>
                      <td className="ap-detail">{r.status === "ok" ? r.sample : r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />
      </div>
    </div>
  );
}

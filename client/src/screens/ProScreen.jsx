import { useState } from "react";
import { IconStarFilled } from "@tabler/icons-react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";
import AppHeader from "../components/AppHeader.jsx";

const PAYMENT_CONFIRM_ATTEMPTS = 8;
const PAYMENT_CONFIRM_DELAY_MS = 1000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ProScreen({ me, refreshMe }) {
  const [status, setStatus] = useState(null);
  const [buying, setBuying] = useState(null); // packageId currently buying

  const credits = me ? me.credits : null;
  const isAdmin = !!(me && me.isAdmin);
  const packages = (me && me.packages) || [];

  async function waitForBalanceChange(previousCredits) {
    for (let i = 0; i < PAYMENT_CONFIRM_ATTEMPTS; i += 1) {
      await delay(PAYMENT_CONFIRM_DELAY_MS);
      try {
        const fresh = await refreshMe();
        if (fresh && fresh.credits !== previousCredits) {
          return true;
        }
      } catch {
        // Telegram webhook delivery can lag; keep polling briefly.
      }
    }
    return false;
  }

  async function buy(pkg) {
    setStatus(null);
    setBuying(pkg.id);
    try {
      const { invoiceLink } = await api("/api/payment/create-invoice", {
        method: "POST",
        body: JSON.stringify({ packageId: pkg.id }),
      });

      if (WebApp && typeof WebApp.openInvoice === "function") {
        WebApp.openInvoice(invoiceLink, async (state) => {
          if (state === "paid") {
            setStatus("Confirming payment...");
            const confirmed = await waitForBalanceChange(me?.credits);
            setStatus(
              confirmed
                ? "Credits added!"
                : "Payment received. Balance will update shortly."
            );
          } else if (state === "failed") {
            setStatus("Payment failed.");
          } else if (state === "cancelled") {
            setStatus("Payment cancelled.");
          }
          setBuying(null);
        });
      } else {
        setStatus("Open in Telegram to purchase");
        setBuying(null);
      }
    } catch (e) {
      setStatus(e.message);
      setBuying(null);
    }
  }

  return (
    <div className="app pro">
      <AppHeader me={me} />

      <div className="rise" style={{ "--i": 1 }}>
        <h1 className="pro-title">Get Credits</h1>
        <p className="subtitle">Credits never expire</p>
      </div>

      <div className="balance rise" style={{ "--i": 2 }}>
        <span className="balance-label">Your balance</span>
        <span className="balance-value">
          {isAdmin ? "Admin" : (credits ?? "...").toLocaleString()}
          {!isAdmin && <span style={{ fontSize: 16 }}> credits</span>}
          {isAdmin && <span style={{ fontSize: 16 }}> account</span>}
        </span>
      </div>

      <div className="pack-grid">
        {packages.map((pkg, idx) => {
          const rate = Math.round(pkg.credits / pkg.stars);
          const best = pkg.id === "pack_200";
          return (
            <div
              key={pkg.id}
              className={"pack-card rise" + (best ? " pack-best" : "")}
              style={{ "--i": 3 + idx }}
            >
              {best && <div className="best-badge">Best value</div>}
              <div className="pack-stars">
                {pkg.stars}
                <IconStarFilled className="star-icon" size={16} />
              </div>
              {pkg.label && <div className="pack-label">{pkg.label}</div>}
              <div className="pack-credits">
                {pkg.credits.toLocaleString()} credits
              </div>
              <div className="pack-rate">{rate} cr / Star</div>
              <button
                className="btn-glass buy"
                disabled={buying === pkg.id}
                onClick={() => buy(pkg)}
              >
                {buying === pkg.id ? "..." : "Buy"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="cost-ref rise" style={{ "--i": 4 }}>
        <div className="cost-ref-row">
          <span>Standard prompt</span>
          <span className="amount">50 credits</span>
        </div>
        <div className="cost-ref-row">
          <span>Reasoning prompt</span>
          <span className="amount">100 credits</span>
        </div>
      </div>

      <p className="free-note rise" style={{ "--i": 5 }}>
        New users get 150 free credits to start
      </p>

      {status && <div className="status rise">{status}</div>}
    </div>
  );
}

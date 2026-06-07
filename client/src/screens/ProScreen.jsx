import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconStarFilled,
  IconInfoCircle,
} from "@tabler/icons-react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";

export default function ProScreen({ me, refreshMe }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [buying, setBuying] = useState(null);

  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;
  const packages = (me && me.packages) || [];

  async function buy(pkg) {
    setStatus(null);
    setBuying(pkg.id);
    try {
      const { invoiceLink } = await api("/api/payment/create-invoice", {
        method: "POST",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      if (WebApp && typeof WebApp.openInvoice === "function") {
        WebApp.openInvoice(invoiceLink, (state) => {
          if (state === "paid") {
            refreshMe();
            setStatus("Credits added!");
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
    <div className="screen">
      <header className="pro-header">
        <button
          className="pro-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          <IconArrowLeft size={20} stroke={2} />
        </button>
        <h1 className="pro-title">Get Credits</h1>
        <span />
      </header>

      <div className="screen-content">
        <div className="balance-block">
          <div className="balance-label">Your balance</div>
          <div className="balance-value">
            <IconStarFilled className="star" size={26} />
            <span className="num">
              {isAdmin ? "∞" : (credits ?? 0).toLocaleString()}
            </span>
            <span className="unit">credits</span>
          </div>
        </div>

        <div className="pack-grid">
          {packages.map((pkg) => {
            const wide = pkg.id === "pack_200";
            if (wide) {
              return (
                <div key={pkg.id} className="pack-card wide">
                  <div className="pack-info">
                    <span className="pack-stars">
                      <IconStarFilled className="star" size={20} />
                      {pkg.stars}
                    </span>
                    <span className="pack-credits">
                      {pkg.credits.toLocaleString()} credits
                    </span>
                  </div>
                  <button
                    className="buy-btn"
                    disabled={buying === pkg.id}
                    onClick={() => buy(pkg)}
                  >
                    {buying === pkg.id ? "…" : "Buy"}
                  </button>
                </div>
              );
            }
            return (
              <div key={pkg.id} className="pack-card">
                <span className="pack-stars">
                  <IconStarFilled className="star" size={18} />
                  {pkg.stars}
                </span>
                <span className="pack-credits">
                  {pkg.credits.toLocaleString()} credits
                </span>
                <span className="pack-price">{pkg.stars} Stars</span>
                <button
                  className="buy-btn"
                  disabled={buying === pkg.id}
                  onClick={() => buy(pkg)}
                >
                  {buying === pkg.id ? "…" : "Buy"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="pro-footer">
          <IconInfoCircle size={13} stroke={1.8} />
          1 credit = 1 request.
        </div>

        {status && <div className="pro-status">{status}</div>}
      </div>
    </div>
  );
}

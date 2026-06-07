import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import App from "./App.jsx";
import "./styles.css";

// Keep a CSS var in sync with Telegram's reported viewport height so the layout
// fills the webview exactly and never jumps when the keyboard opens on iOS.
function applyViewportHeight() {
  const h = WebApp.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-vh", h + "px");
}

function Root() {
  useEffect(() => {
    WebApp.ready();
    try {
      WebApp.expand();
    } catch {
      /* not in Telegram (local preview) — ignore */
    }
    applyViewportHeight();
    WebApp.onEvent("viewportChanged", applyViewportHeight);
    window.addEventListener("resize", applyViewportHeight);
    return () => {
      WebApp.offEvent("viewportChanged", applyViewportHeight);
      window.removeEventListener("resize", applyViewportHeight);
    };
  }, []);

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<Root />);

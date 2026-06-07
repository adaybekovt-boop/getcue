import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import App from "./App.jsx";
import "./styles.css";

function Root() {
  useEffect(() => {
    // Tell Telegram the Mini App is ready to be shown.
    WebApp.ready();
  }, []);
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<Root />);

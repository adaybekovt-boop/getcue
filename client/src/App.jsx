import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { api } from "./api.js";
import GenerateScreen from "./screens/GenerateScreen.jsx";
import HistoryScreen from "./screens/HistoryScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";
import ProScreen from "./screens/ProScreen.jsx";
import BottomNav from "./components/BottomNav.jsx";
import AuroraBackground from "./components/AuroraBackground.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

export default function App() {
  const [me, setMe] = useState(null); // { credits, isAdmin, packages, generationCost }
  const [, setMeError] = useState(null);
  const [history, setHistory] = useState(null); // null = not loaded yet

  // Launch splash: ~3s, fading the last 400ms.
  const [booting, setBooting] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  function refreshMe() {
    return api("/api/me")
      .then((data) => {
        setMe(data);
        setMeError(null);
        return data;
      })
      .catch((e) => {
        setMeError(e.message);
        throw e;
      });
  }

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    const fade = setTimeout(() => setSplashFading(true), 2600);
    const done = setTimeout(() => setBooting(false), 3000);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  const setCredits = (credits) =>
    setMe((prev) => (prev ? { ...prev, credits } : prev));

  const addLocalHistory = (entry) =>
    setHistory((prev) => [entry, ...(prev || [])]);

  return (
    <>
      <div className="app-shell">
        <div className="screen-area">
          <Routes>
            <Route
              path="/"
              element={
                <GenerateScreen
                  me={me}
                  setCredits={setCredits}
                  onGenerated={addLocalHistory}
                />
              }
            />
            <Route
              path="/history"
              element={<HistoryScreen history={history} setHistory={setHistory} />}
            />
            <Route
              path="/settings"
              element={<SettingsScreen me={me} refreshMe={refreshMe} />}
            />
            <Route
              path="/pro"
              element={
                <ProScreen me={me} setCredits={setCredits} refreshMe={refreshMe} />
              }
            />
          </Routes>
        </div>
        <BottomNav />
      </div>

      <AuroraBackground />
      {booting && <SplashScreen fadingOut={splashFading} />}
    </>
  );
}
